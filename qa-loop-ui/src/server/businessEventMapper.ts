import type { BusinessEvent, EventStatus, EvidenceItem, RiskLevel, WorkflowPhase } from '../shared/types';

type TechnicalInput = {
  runId: string;
  phase: WorkflowPhase;
  rawLabel: string;
  command?: string;
  sdkPrompt?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  rawPayload?: unknown;
  evidence?: EvidenceItem[];
  status?: EventStatus;
};

type BusinessCopy = {
  title: string;
  running: string;
  succeeded: string;
  failed: string;
  risk: RiskLevel;
};

const COPY: Record<string, BusinessCopy> = {
  pg_isready: {
    title: 'Checking knowledge base availability',
    running: 'Confirming the local QA knowledge base is reachable.',
    succeeded: 'The QA knowledge base is available.',
    failed: 'The QA knowledge base is not reachable yet.',
    risk: 'medium'
  },
  docker_compose: {
    title: 'Starting local QA knowledge base',
    running: 'Starting the local database service used by the QA knowledge base.',
    succeeded: 'The local QA knowledge base service is running.',
    failed: 'The local QA knowledge base service could not be started.',
    risk: 'high'
  },
  migrations: {
    title: 'Preparing knowledge base schema',
    running: 'Applying the governed database structure for QA evidence.',
    succeeded: 'The knowledge base schema is ready.',
    failed: 'The knowledge base schema could not be prepared.',
    risk: 'high'
  },
  inventory: {
    title: 'Confirming test inventory',
    running: 'Checking that structured test cases and steps exist in the knowledge base.',
    succeeded: 'Structured test cases are available for validation.',
    failed: 'No executable structured test inventory is available.',
    risk: 'critical'
  },
  audit_ingestion: {
    title: 'Validating test cases against approved documentation',
    running: 'Running the independent pre-execution quality gate.',
    succeeded: 'The test case ingestion gate passed.',
    failed: 'The test case ingestion gate found blockers.',
    risk: 'critical'
  },
  heal_ingestion: {
    title: 'Preparing source alignment remediation',
    running: 'Preparing remediation for source, database, or knowledge-base alignment findings.',
    succeeded: 'Source alignment remediation completed.',
    failed: 'Source alignment remediation could not be completed.',
    risk: 'high'
  },
  export_json: {
    title: 'Publishing approved test repository',
    running: 'Exporting governed test cases from the knowledge base.',
    succeeded: 'The governed JSON test repository was published.',
    failed: 'The JSON test repository could not be published.',
    risk: 'high'
  },
  render_artifacts: {
    title: 'Publishing business test artifacts',
    running: 'Generating Markdown and workbook artifacts for review and execution.',
    succeeded: 'Markdown and workbook artifacts are ready.',
    failed: 'Business test artifacts could not be generated.',
    risk: 'high'
  },
  source_chain: {
    title: 'Verifying source-chain alignment',
    running: 'Confirming DB, JSON, Markdown, and workbook records agree.',
    succeeded: 'The test source chain is aligned.',
    failed: 'The test source chain has drift and must be corrected.',
    risk: 'critical'
  },
  playwright: {
    title: 'Executing browser validation',
    running: 'Running black-box browser validation with bounded parallelism.',
    succeeded: 'Browser execution completed and produced run evidence.',
    failed: 'Browser execution failed or produced blocked steps.',
    risk: 'high'
  },
  evidence_guard: {
    title: 'Verifying run evidence',
    running: 'Checking result timing, trace files, screenshots, and black-box policy evidence.',
    succeeded: 'Fresh browser run evidence is complete.',
    failed: 'Run evidence is incomplete or stale.',
    risk: 'critical'
  },
  audit_run: {
    title: 'Performing independent QA approval review',
    running: 'Auditing source alignment, execution evidence, and approval readiness.',
    succeeded: 'The independent QA approval review completed.',
    failed: 'The independent QA approval review found blockers or was inconclusive.',
    risk: 'critical'
  },
  heal_final: {
    title: 'Preparing remediation for audit findings',
    running: 'Preparing governed remediation for final audit findings.',
    succeeded: 'Final audit remediation completed.',
    failed: 'Final audit remediation could not be completed.',
    risk: 'high'
  },
  checkpoint: {
    title: 'Human checkpoint required',
    running: 'A decision is required before the workflow continues.',
    succeeded: 'The human checkpoint was resolved.',
    failed: 'The workflow is waiting for direction.',
    risk: 'medium'
  }
};

const RAW_TO_KEY: Array<[RegExp, keyof typeof COPY]> = [
  [/pg_isready/i, 'pg_isready'],
  [/docker compose/i, 'docker_compose'],
  [/apply_migrations/i, 'migrations'],
  [/count\(\*\)|test_cases|test_case_steps/i, 'inventory'],
  [/audit-test-case-ingestion|audit_test_case_ingestion/i, 'audit_ingestion'],
  [/heal.*ingestion|ingestion_heal/i, 'heal_ingestion'],
  [/export_test_case_repository/i, 'export_json'],
  [/build_test_case_repository/i, 'render_artifacts'],
  [/source_chain|DB\/JSON\/Markdown\/workbook/i, 'source_chain'],
  [/playwright/i, 'playwright'],
  [/fresh_playwright_artifacts|manifest\.json|result\.json/i, 'evidence_guard'],
  [/audit-test-run/i, 'audit_run'],
  [/heal-audit-findings/i, 'heal_final']
];

export function businessEvent(input: TechnicalInput): BusinessEvent {
  const key = classify(input.rawLabel, input.command, input.sdkPrompt);
  const copy = COPY[key];
  const status = input.status ?? statusFromExit(input.exitCode);

  return {
    id: crypto.randomUUID(),
    runId: input.runId,
    phase: input.phase,
    title: copy.title,
    summary: summaryFor(copy, status),
    status,
    risk: riskFor(copy.risk, status),
    decisionRequired: key === 'checkpoint' || status === 'waiting',
    evidence: input.evidence,
    technical: {
      rawLabel: input.rawLabel,
      command: input.command,
      sdkPrompt: input.sdkPrompt,
      stdout: trim(input.stdout),
      stderr: trim(input.stderr),
      exitCode: input.exitCode,
      rawPayload: input.rawPayload
    },
    createdAt: new Date().toISOString()
  };
}

export function checkpointEvent(runId: string, phase: WorkflowPhase, title: string, message: string): BusinessEvent {
  return {
    id: crypto.randomUUID(),
    runId,
    phase,
    title,
    summary: message,
    status: 'waiting',
    risk: 'medium',
    decisionRequired: true,
    createdAt: new Date().toISOString(),
    technical: {
      rawLabel: 'human_checkpoint'
    }
  };
}

function classify(...values: Array<string | undefined>): keyof typeof COPY {
  const text = values.filter(Boolean).join('\n');
  for (const [pattern, key] of RAW_TO_KEY) {
    if (pattern.test(text)) return key;
  }
  return 'checkpoint';
}

function statusFromExit(exitCode: number | null | undefined): EventStatus {
  if (exitCode === undefined || exitCode === null) return 'running';
  return exitCode === 0 ? 'succeeded' : 'failed';
}

function summaryFor(copy: BusinessCopy, status: EventStatus): string {
  if (status === 'running' || status === 'queued') return copy.running;
  if (status === 'succeeded') return copy.succeeded;
  if (status === 'waiting') return 'A business decision is required before continuing.';
  if (status === 'blocked') return copy.failed;
  return copy.failed;
}

function riskFor(base: RiskLevel, status: EventStatus): RiskLevel {
  if (status === 'succeeded') return 'low';
  if (status === 'failed' || status === 'blocked') return base === 'low' ? 'medium' : base;
  return base;
}

function trim(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.length > 6000 ? `${value.slice(0, 6000)}\n...trimmed...` : value;
}
