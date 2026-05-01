export type WorkflowPhase =
  | 'upload_sources'
  | 'ingest_sources'
  | 'rag_ready'
  | 'generate_tests'
  | 'audit_generated_tests'
  | 'reseed_structured_db'
  | 'audit_ingestion'
  | 'heal_ingestion'
  | 'checkpoint'
  | 'publish_artifacts'
  | 'execute_browser'
  | 'verify_evidence'
  | 'audit_run'
  | 'heal_final_audit'
  | 'complete';

export type EventStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'blocked' | 'waiting' | 'warning';
export type RunStatus = 'created' | 'running' | 'waiting' | 'ready' | 'approved' | 'blocked' | 'stopped' | 'failed';
export type EvidenceKind = 'file' | 'folder' | 'report' | 'json' | 'workbook' | 'screenshot' | 'trace' | 'source' | 'tool';

export interface EvidenceItem {
  id: string;
  kind: EvidenceKind;
  label: string;
  path: string;
  phase?: WorkflowPhase;
  createdAt: string;
}

export interface BusinessEvent {
  id: string;
  runId: string;
  phase: WorkflowPhase;
  title: string;
  summary?: string;
  status: EventStatus;
  createdAt: string;
  finishedAt?: string;
  evidence?: EvidenceItem[];
  technical?: {
    rawLabel?: string;
    command?: string;
    sdkPrompt?: string;
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    toolName?: string;
    payload?: unknown;
  };
}

export interface UploadedSource {
  id: string;
  runId: string;
  originalName: string;
  storedPath: string;
  documentType: string;
  sha256: string;
  size: number;
  status: 'staged' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface Checkpoint {
  id: string;
  phase: WorkflowPhase;
  title: string;
  message: string;
  createdAt: string;
  resolvedAt?: string;
  decision?: ApprovalRequest['decision'];
  note?: string;
}

export interface FindingCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface ChatMessage {
  id: string;
  runId?: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  createdAt: string;
  toolCall?: {
    name: string;
    status: EventStatus;
    input?: unknown;
    output?: unknown;
  };
}

export interface RunRecord {
  id: string;
  scope: string;
  dryRun: boolean;
  autoApprove: boolean;
  status: RunStatus;
  currentPhase?: WorkflowPhase;
  createdAt: string;
  updatedAt: string;
  uploads: UploadedSource[];
  events: BusinessEvent[];
  evidence: EvidenceItem[];
  checkpoints: Checkpoint[];
  messages: ChatMessage[];
  gateStatus?: 'checking' | 'passed' | 'blocked';
  auditVerdict?: 'approved' | 'approved_with_conditions' | 'not_approved' | 'inconclusive';
  blockerCount?: number;
  findingCounts?: FindingCounts;
  generatedSpecPath?: string;
}

export interface ApprovalRequest {
  decision: 'approve' | 'reject' | 'change_scope' | 'stop';
  note?: string;
  scope?: string;
}

export interface StartRunRequest {
  scope?: string;
  dryRun?: boolean;
  autoApprove?: boolean;
  deferStart?: boolean;
}

export interface ChatRequest {
  runId?: string;
  message: string;
}

export interface RagCitation {
  id: string;
  document: string;
  path: string;
  heading: string;
  ordinal: number;
}

export interface RagSnippet extends RagCitation {
  content: string;
}

export interface GeneratedCaseStep {
  requirement_id: string;
  step_number: number;
  step_description: string;
  expected_output: string;
  test_data: string;
  source_refs?: string[];
  confidence?: number;
}

export interface GeneratedCase {
  test_case_id: string;
  requirement_ids: string[];
  title: string;
  objective: string;
  priority: string;
  suite: string;
  tags: string[];
  steps: GeneratedCaseStep[];
  source_refs?: string[];
  confidence?: number;
}

export interface RepositorySpec {
  document_id: string;
  version: string;
  status: string;
  title: string;
  source_workbook: string;
  cases: GeneratedCase[];
}

export interface IngestedDocument {
  id: number;
  label: string;
  kind: string;
  version?: string;
  isActive?: boolean;
  versionCount?: number;
  chunks: number;
  entities: number;
  rels: number;
}

export interface CountByLabel {
  type: string;
  count: number;
}

export interface RelationshipSample {
  type: string;
  from: string;
  to: string;
}

export interface RtmSummary {
  requirements: number;
  rows: number;
  links: number;
  unmapped: number;
  averageConfidence: number;
}

export interface IngestionMap {
  documents: IngestedDocument[];
  entities: CountByLabel[];
  relationships: CountByLabel[];
  rel_samples: RelationshipSample[];
  rtm?: RtmSummary;
}

export type IngestionEventPayload =
  | { kind: 'ingestion-section'; section: 'documents'; documents: IngestedDocument[] }
  | { kind: 'ingestion-section'; section: 'entities'; entities: CountByLabel[] }
  | {
      kind: 'ingestion-section';
      section: 'relationships';
      relationships: CountByLabel[];
      samples: RelationshipSample[];
    }
  | ({ kind: 'ingestion-map' } & IngestionMap);
