import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type {
  BusinessEvent,
  EvidenceItem,
  EventStatus,
  RunRecord,
  StartRunRequest,
  WorkflowPhase,
} from '../shared/types';

export const QAMVP_ROOT = process.env.QAMVP_ROOT ?? path.resolve(import.meta.dir, '../../..');
export const UI_QA_ROOT = path.resolve(import.meta.dir, '../..');
export const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://ingestion:ingestion@localhost:5433/ingestion';
export const RESULTS_ROOT = path.join(QAMVP_ROOT, 'test_data/test-results');
export const RUNS_ROOT = path.join(RESULTS_ROOT, 'ui-runs');
export const UPLOADS_ROOT = path.join(QAMVP_ROOT, 'test_data/ui-qa/uploads');
export const GENERATED_ROOT = path.join(QAMVP_ROOT, 'test_data/ui-qa/generated');

export type Listener = (run: RunRecord, event?: BusinessEvent) => void;

export const runs = new Map<string, RunRecord>();
export const listeners = new Map<string, Set<Listener>>();
export const stopFlags = new Set<string>();

export function now(): string {
  return new Date().toISOString();
}

export function stamp(): string {
  return new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
}

export function id(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function rel(p: string): string {
  return path.relative(QAMVP_ROOT, p).replaceAll(path.sep, '/');
}

export function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

export function createRun(input: StartRunRequest): RunRecord {
  const runId = id('uiqa');
  const createdAt = now();
  return {
    id: runId,
    scope: input.scope?.trim() || 'all',
    dryRun: Boolean(input.dryRun),
    autoApprove: Boolean(input.autoApprove ?? input.dryRun),
    status: 'created',
    currentPhase: 'upload_sources',
    createdAt,
    updatedAt: createdAt,
    uploads: [],
    events: [],
    evidence: [],
    checkpoints: [],
    messages: [],
    blockerCount: 0,
    findingCounts: { critical: 0, high: 0, medium: 0, low: 0 },
  };
}

export function assertRun(runId: string): RunRecord {
  let run = runs.get(runId);
  if (!run) {
    const persisted = path.join(RUNS_ROOT, runId, 'run.json');
    if (existsSync(persisted)) {
      run = JSON.parse(readFileSync(persisted, 'utf8')) as RunRecord;
      runs.set(run.id, run);
    }
  }
  if (!run) throw new Response('Run not found', { status: 404 });
  normalizeTerminalRun(run);
  return run;
}

function normalizeTerminalRun(run: RunRecord): void {
  if (['created', 'running', 'waiting'].includes(run.status)) return;
  const finishedAt = now();
  for (const event of run.events) {
    if (event.status === 'running' || event.status === 'queued' || event.status === 'waiting') {
      event.status = 'warning';
      event.finishedAt = finishedAt;
      event.summary ??= 'This event was left open after the run finalized. The authoritative run status is complete.';
    }
  }
}

export function checkStopped(run: RunRecord): void {
  if (stopFlags.has(run.id) || run.status === 'stopped') {
    throw new Error('Run stopped by user.');
  }
}

export async function persist(run: RunRecord): Promise<void> {
  run.updatedAt = now();
  runs.set(run.id, run);
  const dir = path.join(RUNS_ROOT, run.id);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'run.json'), JSON.stringify(run, null, 2) + '\n', 'utf8');
  notify(run);
}

export function notify(run: RunRecord, event?: BusinessEvent): void {
  const subs = listeners.get(run.id);
  if (!subs) return;
  for (const listener of subs) listener(run, event);
}

export async function addEvidence(
  run: RunRecord,
  item: Omit<EvidenceItem, 'id' | 'createdAt'>,
): Promise<EvidenceItem> {
  const evidence: EvidenceItem = { id: id('ev'), createdAt: now(), ...item };
  run.evidence.push(evidence);
  await persist(run);
  return evidence;
}

export async function emit(
  run: RunRecord,
  phase: WorkflowPhase,
  title: string,
  status: EventStatus,
  details: Partial<BusinessEvent> = {},
): Promise<BusinessEvent> {
  const event: BusinessEvent = {
    id: details.id ?? id('event'),
    runId: run.id,
    phase,
    title,
    status,
    createdAt: details.createdAt ?? now(),
    finishedAt: ['succeeded', 'failed', 'blocked', 'warning'].includes(status)
      ? now()
      : details.finishedAt,
    summary: details.summary,
    evidence: details.evidence,
    technical: details.technical,
  };
  run.currentPhase = phase;
  run.events.push(event);
  notify(run, event);
  await persist(run);
  return event;
}

export async function updateEvent(
  run: RunRecord,
  event: BusinessEvent,
  status: EventStatus,
  patch: Partial<BusinessEvent> = {},
): Promise<void> {
  const idx = run.events.findIndex((candidate) => candidate.id === event.id);
  if (idx >= 0) {
    run.events[idx] = {
      ...run.events[idx],
      ...patch,
      status,
      finishedAt: ['succeeded', 'failed', 'blocked', 'warning'].includes(status)
        ? now()
        : patch.finishedAt,
    };
    notify(run, run.events[idx]);
  }
  await persist(run);
}

export async function ensureStorage(): Promise<void> {
  await mkdir(RUNS_ROOT, { recursive: true });
  await mkdir(UPLOADS_ROOT, { recursive: true });
  await mkdir(GENERATED_ROOT, { recursive: true });
}
