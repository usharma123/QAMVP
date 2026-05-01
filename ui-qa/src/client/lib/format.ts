import type { BusinessEvent, IngestionEventPayload, WorkflowPhase, CountByLabel } from '../../shared/types';

export function phaseShort(phase: WorkflowPhase | undefined): string {
  if (!phase) return 'Idle';
  switch (phase) {
    case 'upload_sources': return 'Intake';
    case 'ingest_sources': return 'Ingest';
    case 'rag_ready': return 'RAG ready';
    case 'generate_tests': return 'Generate';
    case 'audit_generated_tests': return 'Confidence';
    case 'reseed_structured_db': return 'Reseed';
    case 'audit_ingestion': return 'Gate';
    case 'heal_ingestion': return 'Heal · Ingest';
    case 'checkpoint': return 'Review';
    case 'publish_artifacts': return 'Export';
    case 'execute_browser': return 'Playwright';
    case 'verify_evidence': return 'Verify';
    case 'audit_run': return 'Final audit';
    case 'heal_final_audit': return 'Heal · Final';
    case 'complete': return 'Closed';
    default: return phase;
  }
}

export type Tone = 'ok' | 'err' | 'warn' | 'accent' | undefined;

export function statusTone(status: BusinessEvent['status']): Tone {
  switch (status) {
    case 'succeeded': return 'ok';
    case 'failed':
    case 'blocked': return 'err';
    case 'warning':
    case 'waiting': return 'warn';
    case 'running': return 'accent';
    default: return undefined;
  }
}

export function statusGlyph(status: BusinessEvent['status']): string {
  switch (status) {
    case 'succeeded': return '●';
    case 'failed':
    case 'blocked': return '✕';
    case 'warning': return '!';
    case 'waiting': return '◌';
    case 'running': return '◐';
    default: return '○';
  }
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function formatTimeSec(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatUtc(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(
    date.getUTCHours(),
  )}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} UTC`;
}

export function formatDuration(start?: string, end?: string): string {
  if (!start) return '';
  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : Date.now();
  const ms = Math.max(0, endMs - startMs);
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 100) / 10;
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s - m * 60);
  return `${m}m ${rem}s`;
}

export function ingestionPayloadOf(event: BusinessEvent): IngestionEventPayload | undefined {
  const payload = event.technical?.payload as IngestionEventPayload | undefined;
  if (!payload || typeof payload !== 'object' || !('kind' in payload)) return undefined;
  if (payload.kind !== 'ingestion-map' && payload.kind !== 'ingestion-section') return undefined;
  return payload;
}

export function sumCount(rows: CountByLabel[]): number {
  return rows.reduce((sum, row) => sum + (row.count || 0), 0);
}

export function maxCount(rows: CountByLabel[]): number {
  return rows.reduce((max, row) => (row.count > max ? row.count : max), 0);
}

export function shortName(name: string): string {
  if (!name) return '';
  const base = name.split('/').pop() ?? name;
  if (base.length <= 36) return base;
  return base.slice(0, 16) + '…' + base.slice(-16);
}

export function truncatePathMiddle(value: string, max = 64): string {
  if (value.length <= max) return value;
  const head = Math.ceil((max - 1) / 2);
  const tail = Math.floor((max - 1) / 2);
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}
