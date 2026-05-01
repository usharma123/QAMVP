export type WorkflowPhase =
  | 'prepare_kb'
  | 'audit_ingestion'
  | 'heal_ingestion'
  | 'checkpoint'
  | 'publish_artifacts'
  | 'execute_browser'
  | 'verify_evidence'
  | 'audit_run'
  | 'heal_final_audit'
  | 'complete'
  | 'blocked'
  | 'stopped';

export type EventStatus = 'queued' | 'running' | 'succeeded' | 'warning' | 'failed' | 'blocked' | 'waiting';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type EvidenceKind = 'report' | 'json' | 'markdown' | 'workbook' | 'folder' | 'screenshot' | 'trace' | 'log';
export type RunStatus = 'created' | 'running' | 'waiting' | 'approved' | 'blocked' | 'stopped' | 'failed';

export type EvidenceItem = {
  id: string;
  label: string;
  kind: EvidenceKind;
  path: string;
  createdAt: string;
};

export type TechnicalDetails = {
  rawLabel?: string;
  command?: string;
  sdkPrompt?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  rawPayload?: unknown;
};

export type BusinessEvent = {
  id: string;
  runId: string;
  phase: WorkflowPhase;
  title: string;
  summary: string;
  status: EventStatus;
  risk: RiskLevel;
  blockerCount?: number;
  decisionRequired?: boolean;
  evidence?: EvidenceItem[];
  technical?: TechnicalDetails;
  createdAt: string;
};

export type TimelineStep = {
  phase: WorkflowPhase;
  label: string;
  status: EventStatus;
};

export type HumanCheckpoint = {
  id: string;
  title: string;
  message: string;
  options: string[];
  createdAt: string;
  resolvedAt?: string;
  decision?: string;
};

export type RunRecord = {
  id: string;
  scope: string;
  status: RunStatus;
  currentPhase: WorkflowPhase;
  gateStatus: 'not_started' | 'checking' | 'passed' | 'blocked';
  auditVerdict: 'not_started' | 'approved' | 'approved_with_conditions' | 'not_approved' | 'inconclusive';
  blockerCount: number;
  decisionRequired: boolean;
  startedAt: string;
  finishedAt?: string;
  events: BusinessEvent[];
  evidence: EvidenceItem[];
  checkpoints: HumanCheckpoint[];
  timeline: TimelineStep[];
};

export type CreateRunRequest = {
  scope?: string;
  dryRun?: boolean;
};

export type ApprovalRequest = {
  checkpointId?: string;
  decision: 'approve' | 'change_scope' | 'stop';
  note?: string;
  scope?: string;
};
