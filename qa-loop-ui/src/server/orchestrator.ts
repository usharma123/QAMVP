import path from 'node:path';
import { collectEvidence } from './artifacts';
import { businessEvent, checkpointEvent } from './businessEventMapper';
import { invokeClaudeCommand } from './claudeAgent';
import type { RunStore } from './runStore';
import { runShell } from './shell';
import type { CreateRunRequest, WorkflowPhase } from '../shared/types';

const DATABASE_URL = 'postgresql://ingestion:ingestion@localhost:5433/ingestion';

export class QaLoopOrchestrator {
  constructor(
    private readonly repoRoot: string,
    private readonly store: RunStore
  ) {}

  start(request: CreateRunRequest) {
    const run = this.store.create((request.scope || 'all').trim() || 'all');
    this.execute(run.id, Boolean(request.dryRun || process.env.QA_LOOP_DRY_RUN === '1')).catch((error) => {
      this.store.addEvent(
        run.id,
        businessEvent({
          runId: run.id,
          phase: 'blocked',
          rawLabel: 'workflow_failure',
          status: 'failed',
          stderr: error instanceof Error ? error.stack || error.message : String(error)
        })
      );
      this.store.patch(run.id, { status: 'failed', currentPhase: 'blocked', finishedAt: new Date().toISOString() });
    });
    return run;
  }

  private async execute(runId: string, dryRun: boolean): Promise<void> {
    this.store.patch(runId, { status: 'running' });
    await this.prepareKnowledgeBase(runId, dryRun);
    await this.ingestionGate(runId, dryRun);
    await this.preExecutionCheckpoint(runId);
    await this.publishArtifacts(runId, dryRun);
    await this.executePlaywright(runId, dryRun);
    await this.verifyEvidence(runId, dryRun);
    await this.finalAudit(runId, dryRun);
    this.store.patch(runId, {
      status: 'approved',
      currentPhase: 'complete',
      auditVerdict: 'approved',
      decisionRequired: false,
      finishedAt: new Date().toISOString()
    });
  }

  private async prepareKnowledgeBase(runId: string, dryRun: boolean): Promise<void> {
    await this.shellEvent(runId, 'prepare_kb', 'pg_isready', '/opt/homebrew/bin/pg_isready -h localhost -p 5433 -U ingestion -d ingestion', dryRun, false);
    const ready = this.latestExit(runId) === 0;
    if (!ready) {
      await this.shellEvent(
        runId,
        'prepare_kb',
        'docker compose up',
        `/opt/homebrew/bin/docker compose -f ${q(path.join(this.repoRoot, 'ingestion/docker-compose.yml'))} up -d`,
        dryRun
      );
    }
    await this.shellEvent(runId, 'prepare_kb', 'apply_migrations', 'PGPASSWORD=ingestion ./ingestion/scripts/apply_migrations.sh', dryRun, true, {
      DATABASE_URL
    });
    await this.shellEvent(
      runId,
      'prepare_kb',
      'test_cases and test_case_steps inventory',
      `PGPASSWORD=ingestion /opt/homebrew/bin/psql -h localhost -p 5433 -U ingestion -d ingestion -tAc "select 'cases=' || count(*) from test_cases; select 'steps=' || count(*) from test_case_steps;"`,
      dryRun
    );
  }

  private async ingestionGate(runId: string, dryRun: boolean): Promise<void> {
    const result = await this.claudeEvent(runId, 'audit_ingestion', '/audit-test-case-ingestion', dryRun);
    if (result !== 0) {
      this.store.patch(runId, { status: 'blocked', gateStatus: 'blocked', currentPhase: 'audit_ingestion' });
      throw new Error('Ingestion gate failed. Human remediation is required before execution.');
    }
    this.store.patch(runId, { gateStatus: 'passed' });
  }

  private async preExecutionCheckpoint(runId: string): Promise<void> {
    const checkpoint = this.store.addCheckpoint(runId, {
      title: 'Confirm execution readiness',
      message: 'The test case ingestion gate passed. Approve browser execution, change the scope, or stop before execution.',
      options: ['approve', 'change_scope', 'stop']
    });
    this.store.addEvent(
      runId,
      checkpointEvent(runId, 'checkpoint', 'Human checkpoint before execution', 'Execution is paused until a business decision is recorded.')
    );
    const approval = await this.store.waitForApproval(runId);
    if (approval.decision === 'stop') {
      this.store.patch(runId, { status: 'stopped', currentPhase: 'stopped', finishedAt: new Date().toISOString() });
      throw new Error('Run stopped by user.');
    }
    if (approval.decision === 'change_scope' && approval.scope) {
      this.store.patch(runId, { scope: approval.scope });
    }
    const run = this.store.get(runId);
    if (run?.checkpoints.find((item) => item.id === checkpoint.id)?.resolvedAt) {
      this.store.addEvent(
        runId,
        businessEvent({
          runId,
          phase: 'checkpoint',
          rawLabel: 'human_checkpoint',
          status: 'succeeded',
          stdout: approval.note
        })
      );
    }
  }

  private async publishArtifacts(runId: string, dryRun: boolean): Promise<void> {
    await this.shellEvent(
      runId,
      'publish_artifacts',
      'export_test_case_repository.py',
      `source ingestion/.venv/bin/activate && DATABASE_URL=${DATABASE_URL} ingestion/.venv/bin/python ingestion/scripts/export_test_case_repository.py --output test-doc/test-case-repository.json`,
      dryRun
    );
    await this.shellEvent(
      runId,
      'publish_artifacts',
      'build_test_case_repository.py',
      `source ingestion/.venv/bin/activate && ingestion/.venv/bin/python test-doc/scripts/build_test_case_repository.py --spec test-doc/test-case-repository.json --workbook-out test_data/TestCases.xlsx --markdown-out test-doc/09-test-case-repository.md`,
      dryRun
    );
    await this.shellEvent(runId, 'publish_artifacts', 'source_chain_aligned', sourceChainGuard(this.repoRoot), dryRun, true, { DATABASE_URL });
  }

  private async executePlaywright(runId: string, dryRun: boolean): Promise<void> {
    const run = this.store.get(runId);
    const scope = run?.scope || 'all';
    const workers = scope.toUpperCase() === 'ALL' ? '2' : '1';
    const grep = scope.toUpperCase() === 'ALL' ? '' : ` --grep ${q(scope)}`;
    await this.shellEvent(
      runId,
      'execute_browser',
      'npx playwright test',
      `TC_ID=${q(scope)} PLAYWRIGHT_WORKERS=${workers} /usr/local/bin/npx --prefix ${q(
        path.join(this.repoRoot, 'playwright-runner')
      )} playwright test --config ${q(path.join(this.repoRoot, 'playwright-runner/playwright.config.ts'))} --workers=${workers}${grep}`,
      dryRun
    );
  }

  private async verifyEvidence(runId: string, dryRun: boolean): Promise<void> {
    const run = this.store.get(runId);
    await this.shellEvent(runId, 'verify_evidence', 'fresh_playwright_artifacts', freshArtifactGuard(this.repoRoot), dryRun, true, {
      TC_ID: run?.scope || 'all'
    });
  }

  private async finalAudit(runId: string, dryRun: boolean): Promise<void> {
    const result = await this.claudeEvent(runId, 'audit_run', '/audit-test-run test_data/test-results', dryRun);
    if (result !== 0) {
      const checkpoint = this.store.addCheckpoint(runId, {
        title: 'Final audit needs direction',
        message: 'The independent QA audit did not approve the run. Approve remediation, provide direction, or stop.',
        options: ['approve', 'change_scope', 'stop']
      });
      this.store.addEvent(runId, checkpointEvent(runId, 'heal_final_audit', checkpoint.title, checkpoint.message));
      const approval = await this.store.waitForApproval(runId);
      if (approval.decision !== 'approve') {
        this.store.patch(runId, { status: 'stopped', currentPhase: 'stopped', finishedAt: new Date().toISOString() });
        throw new Error('Final audit remediation stopped by user.');
      }
      const heal = await this.claudeEvent(runId, 'heal_final_audit', '/heal-audit-findings all', dryRun);
      if (heal !== 0) throw new Error('Final audit remediation failed.');
    }
  }

  private async shellEvent(
    runId: string,
    phase: WorkflowPhase,
    rawLabel: string,
    command: string,
    dryRun: boolean,
    throwOnFail = true,
    env: Record<string, string> = {}
  ): Promise<void> {
    this.store.addEvent(runId, businessEvent({ runId, phase, rawLabel, command, status: 'running' }));
    const result = await runShell(command, this.repoRoot, env, dryRun);
    const evidence = collectEvidence(this.repoRoot);
    this.store.addEvent(
      runId,
      businessEvent({
        runId,
        phase,
        rawLabel,
        command: result.command,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        evidence
      })
    );
    if (throwOnFail && result.exitCode !== 0) throw new Error(`${rawLabel} failed`);
  }

  private async claudeEvent(runId: string, phase: WorkflowPhase, prompt: string, dryRun: boolean): Promise<number> {
    this.store.addEvent(runId, businessEvent({ runId, phase, rawLabel: prompt, sdkPrompt: prompt, status: 'running' }));
    const result = await invokeClaudeCommand({
      prompt,
      cwd: this.repoRoot,
      dryRun,
      onRawMessage: (message) => {
        this.store.addEvent(
          runId,
          businessEvent({
            runId,
            phase,
            rawLabel: prompt,
            sdkPrompt: prompt,
            status: 'running',
            rawPayload: message
          })
        );
      }
    });
    const evidence = collectEvidence(this.repoRoot);
    this.store.addEvent(
      runId,
      businessEvent({
        runId,
        phase,
        rawLabel: prompt,
        sdkPrompt: prompt,
        stdout: result.transcript,
        exitCode: result.exitCode,
        rawPayload: result.rawMessages.at(-1),
        evidence
      })
    );
    return result.exitCode;
  }

  private latestExit(runId: string): number | undefined {
    const latest = this.store.get(runId)?.events.at(-1);
    return latest?.technical?.exitCode ?? undefined;
  }
}

function q(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function sourceChainGuard(repoRoot: string): string {
  return `source ingestion/.venv/bin/activate && DATABASE_URL=${DATABASE_URL} ingestion/.venv/bin/python - <<'PY'
import json, os, re
from pathlib import Path
from openpyxl import load_workbook
import psycopg
root = Path('${repoRoot}')
spec = json.loads((root / 'test-doc/test-case-repository.json').read_text())
json_rows = {(c['test_case_id'], int(s['step_number'])): (s['requirement_id'], s['step_description'], s.get('expected_output') or '', s.get('test_data') or '') for c in spec['cases'] for s in c['steps']}
wb = load_workbook(root / 'test_data/TestCases.xlsx', data_only=True)
ws = wb['TestCases']
headers = [c.value for c in ws[1]]
idx = {h: i for i, h in enumerate(headers)}
xlsx_rows = {(r[idx['TestCaseID']], int(r[idx['StepNumber']])): (r[idx['RequirementID']], r[idx['StepDescription']] or '', r[idx['ExpectedOutput']] or '', r[idx['TestData']] or '') for r in ws.iter_rows(min_row=2, values_only=True) if any(r)}
md = (root / 'test-doc/09-test-case-repository.md').read_text()
md_rows = {}
current_tc = None
def split_md_row(line):
    cells, buf, escaped = [], [], False
    for ch in line.strip()[1:-1]:
        if escaped:
            buf.append(ch); escaped = False
        elif ch == '\\\\':
            escaped = True
        elif ch == '|':
            cells.append(''.join(buf).strip()); buf = []
        else:
            buf.append(ch)
    cells.append(''.join(buf).strip())
    return cells
for line in md.splitlines():
    m = re.match(r'^## (TC-\\d+) - ', line)
    if m:
        current_tc = m.group(1)
        continue
    if current_tc and line.startswith('| ') and re.match(r'^\\| \\d+ \\| REQ-', line):
        parts = split_md_row(line)
        md_rows[(current_tc, int(parts[0]))] = tuple(parts[1:5])
with psycopg.connect(os.environ['DATABASE_URL'], connect_timeout=3) as conn, conn.cursor() as cur:
    cur.execute("select test_case_id, step_number, requirement_id, step_description, coalesce(expected_output, ''), coalesce(test_data, '') from test_case_steps order by test_case_id, step_number")
    db_rows = {(tc, int(step)): (req, desc, exp, data) for tc, step, req, desc, exp, data in cur.fetchall()}
if db_rows != json_rows or json_rows != xlsx_rows or json_rows != md_rows:
    print('DB/JSON/Markdown/workbook drift detected')
    print('db_json_equal=', db_rows == json_rows)
    print('json_xlsx_equal=', json_rows == xlsx_rows)
    print('json_md_equal=', json_rows == md_rows)
    raise SystemExit(1)
print('source_chain_aligned=', len(json_rows), 'steps')
PY`;
}

function freshArtifactGuard(repoRoot: string): string {
  return `/usr/local/bin/node - <<'NODE'
const fs = require('fs');
const path = require('path');
const root = '${repoRoot}/test_data/test-results';
const selected = (process.env.TC_ID || 'all').toUpperCase();
const tcDirs = fs.readdirSync(root).filter((name) => /^TC-\\d+$/.test(name) && (selected === 'ALL' || name === selected));
const failures = [];
for (const tc of tcDirs) {
  const tcRoot = path.join(root, tc);
  const runs = fs.readdirSync(tcRoot).filter((name) => /^playwright_\\d{8}_\\d{6}$/.test(name)).sort().reverse();
  if (!runs.length) {
    failures.push(\`\${tc}: no playwright run directory\`);
    continue;
  }
  const runDir = path.join(tcRoot, runs[0]);
  for (const file of ['manifest.json', 'result.json']) {
    const p = path.join(runDir, file);
    if (!fs.existsSync(p)) {
      failures.push(\`\${tc}: missing \${file}\`);
      continue;
    }
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (file === 'result.json' && !['PASS', 'FAIL', 'BLOCKED'].includes(data.status)) failures.push(\`\${tc}/\${file}: invalid status\`);
    if (file === 'result.json' && data.status !== data.verdict) failures.push(\`\${tc}/\${file}: status does not match verdict\`);
    if (!data.startedAt || !data.finishedAt) failures.push(\`\${tc}/\${file}: missing timing\`);
    if (data.startedAt === data.finishedAt) failures.push(\`\${tc}/\${file}: stale timing\`);
    if (typeof data.durationMs !== 'number' || data.durationMs <= 0) failures.push(\`\${tc}/\${file}: missing duration\`);
    if (data.blackBoxPolicy?.webappSourceInspected !== false) failures.push(\`\${tc}/\${file}: source inspection policy missing\`);
    if (data.blackBoxPolicy?.angularInternalsUsed !== false) failures.push(\`\${tc}/\${file}: Angular internals policy missing\`);
  }
}
if (failures.length) {
  console.error(failures.join('\\n'));
  process.exit(1);
}
console.log('fresh_playwright_artifacts_valid=', tcDirs.length);
NODE`;
}
