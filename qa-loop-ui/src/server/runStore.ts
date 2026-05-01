import fs from 'node:fs';
import path from 'node:path';
import type {
  ApprovalRequest,
  BusinessEvent,
  EvidenceItem,
  HumanCheckpoint,
  RunRecord,
  RunStatus,
  TimelineStep,
  WorkflowPhase
} from '../shared/types';

const PHASES: Array<[WorkflowPhase, string]> = [
  ['prepare_kb', 'Prepare QA Knowledge Base'],
  ['audit_ingestion', 'Validate Test Case Ingestion'],
  ['heal_ingestion', 'Remediate Source Alignment Findings'],
  ['checkpoint', 'Human Checkpoint Before Execution'],
  ['publish_artifacts', 'Publish Test Artifacts'],
  ['execute_browser', 'Execute Browser Tests'],
  ['verify_evidence', 'Verify Run Evidence'],
  ['audit_run', 'Independent QA Audit'],
  ['heal_final_audit', 'Remediate Final Audit Findings'],
  ['complete', 'Approved / Blocked / Stopped']
];

type Subscriber = (event: BusinessEvent | { type: 'run'; run: RunRecord }) => void;
type Waiter = (approval: ApprovalRequest) => void;

export class RunStore {
  private readonly runs = new Map<string, RunRecord>();
  private readonly subscribers = new Map<string, Set<Subscriber>>();
  private readonly approvalWaiters = new Map<string, Waiter>();

  constructor(private readonly repoRoot: string) {}

  create(scope: string): RunRecord {
    const id = `ui_${timestamp()}`;
    const run: RunRecord = {
      id,
      scope,
      status: 'created',
      currentPhase: 'prepare_kb',
      gateStatus: 'not_started',
      auditVerdict: 'not_started',
      blockerCount: 0,
      decisionRequired: false,
      startedAt: new Date().toISOString(),
      events: [],
      evidence: [],
      checkpoints: [],
      timeline: PHASES.map(([phase, label]) => ({ phase, label, status: phase === 'prepare_kb' ? 'running' : 'queued' }))
    };
    this.runs.set(id, run);
    this.persist(run);
    return run;
  }

  get(id: string): RunRecord | undefined {
    return this.runs.get(id) ?? this.load(id);
  }

  subscribe(id: string, subscriber: Subscriber): () => void {
    const set = this.subscribers.get(id) ?? new Set<Subscriber>();
    set.add(subscriber);
    this.subscribers.set(id, set);
    return () => set.delete(subscriber);
  }

  addEvent(runId: string, event: BusinessEvent): void {
    const run = this.mustGet(runId);
    run.events.push(event);
    if (event.evidence) this.mergeEvidence(run, event.evidence);
    run.currentPhase = event.phase;
    run.decisionRequired = Boolean(event.decisionRequired);
    run.blockerCount = event.status === 'failed' || event.status === 'blocked' ? Math.max(run.blockerCount, 1) : run.blockerCount;
    if (event.phase === 'audit_ingestion') run.gateStatus = event.status === 'succeeded' ? 'passed' : event.status === 'failed' ? 'blocked' : 'checking';
    this.updateTimeline(run, event.phase, event.status);
    this.persistAndPublish(run, event);
  }

  patch(runId: string, patch: Partial<RunRecord>): RunRecord {
    const run = this.mustGet(runId);
    Object.assign(run, patch);
    this.persistAndPublish(run, { type: 'run', run });
    return run;
  }

  addCheckpoint(runId: string, checkpoint: Omit<HumanCheckpoint, 'id' | 'createdAt'>): HumanCheckpoint {
    const run = this.mustGet(runId);
    const saved: HumanCheckpoint = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...checkpoint
    };
    run.checkpoints.push(saved);
    run.status = 'waiting';
    run.decisionRequired = true;
    this.persistAndPublish(run, { type: 'run', run });
    return saved;
  }

  resolveApproval(runId: string, approval: ApprovalRequest): boolean {
    const run = this.mustGet(runId);
    const checkpoint = [...run.checkpoints].reverse().find((item) => !item.resolvedAt);
    if (checkpoint) {
      checkpoint.resolvedAt = new Date().toISOString();
      checkpoint.decision = approval.note ? `${approval.decision}: ${approval.note}` : approval.decision;
    }
    run.decisionRequired = false;
    run.status = approval.decision === 'stop' ? 'stopped' : 'running';
    this.persistAndPublish(run, { type: 'run', run });
    const waiter = this.approvalWaiters.get(runId);
    if (!waiter) return false;
    this.approvalWaiters.delete(runId);
    waiter(approval);
    return true;
  }

  waitForApproval(runId: string): Promise<ApprovalRequest> {
    return new Promise((resolve) => {
      this.approvalWaiters.set(runId, resolve);
    });
  }

  runPath(runId: string): string {
    return path.join(this.repoRoot, 'test_data/test-results/ui-runs', runId, 'run.json');
  }

  private mustGet(id: string): RunRecord {
    const run = this.get(id);
    if (!run) throw new Error(`Unknown run: ${id}`);
    return run;
  }

  private updateTimeline(run: RunRecord, phase: WorkflowPhase, status: TimelineStep['status']): void {
    for (const item of run.timeline) {
      if (item.phase === phase) {
        item.status = status;
      } else if (item.status === 'running' && status === 'succeeded') {
        item.status = 'succeeded';
      }
    }
  }

  private mergeEvidence(run: RunRecord, evidence: EvidenceItem[]): void {
    const known = new Set(run.evidence.map((item) => item.path));
    for (const item of evidence) {
      if (!known.has(item.path)) run.evidence.push(item);
    }
  }

  private persistAndPublish(run: RunRecord, payload: BusinessEvent | { type: 'run'; run: RunRecord }): void {
    this.persist(run);
    for (const subscriber of this.subscribers.get(run.id) ?? []) subscriber(payload);
  }

  private persist(run: RunRecord): void {
    const filePath = this.runPath(run.id);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(run, null, 2) + '\n', 'utf-8');
  }

  private load(id: string): RunRecord | undefined {
    const filePath = this.runPath(id);
    if (!fs.existsSync(filePath)) return undefined;
    const run = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as RunRecord;
    this.runs.set(id, run);
    return run;
  }
}

function timestamp(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(
    now.getMinutes()
  )}${pad(now.getSeconds())}`;
}
