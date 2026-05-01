import React from 'react';
import type { RunRecord, WorkflowPhase } from '../../shared/types';

const PHASES: { phase: WorkflowPhase; label: string }[] = [
  { phase: 'upload_sources', label: 'Upload sources' },
  { phase: 'ingest_sources', label: 'Ingest knowledge base' },
  { phase: 'rag_ready', label: 'RAG ready' },
  { phase: 'generate_tests', label: 'Generate test cases' },
  { phase: 'audit_generated_tests', label: 'Audit traceability' },
  { phase: 'complete', label: 'Complete' },
];

type RowStatus = 'pending' | 'run' | 'wait' | 'done' | 'bad';

function rowStatus(run: RunRecord, phase: WorkflowPhase): RowStatus {
  const events = run.events.filter((event) => event.phase === phase);
  if (events.some((e) => e.status === 'blocked' || e.status === 'failed')) return 'bad';
  if (events.some((e) => e.status === 'waiting')) return 'wait';
  if (events.some((e) => e.status === 'running')) return 'run';
  if (events.some((e) => e.status === 'succeeded' || e.status === 'warning')) return 'done';
  return run.currentPhase === phase ? 'run' : 'pending';
}

function glyphFor(status: RowStatus): string {
  switch (status) {
    case 'done': return '●';
    case 'run': return '◐';
    case 'wait': return '◌';
    case 'bad': return '✕';
    default: return '○';
  }
}

export function PipelineChecklist({ run }: { run: RunRecord }) {
  const rows = PHASES.map((entry) => ({
    ...entry,
    status: rowStatus(run, entry.phase),
    count: run.events.filter((e) => e.phase === entry.phase).length,
  }));
  const doneCount = rows.filter((r) => r.status === 'done').length;
  const isComplete = run.currentPhase === 'complete';

  return (
    <div className={`checklist${isComplete ? ' is-complete' : ''}`}>
      <div className="checklist__head">
        <span className="checklist__label">Pipeline</span>
        <span className="checklist__progress">{doneCount}/{rows.length}</span>
      </div>
      <ul className="checklist__list">
        {rows.map((row) => (
          <li key={row.phase} data-status={row.status}>
            <span className="checklist__glyph">{glyphFor(row.status)}</span>
            <span className="checklist__name">{row.label}</span>
            {row.count > 0 && <span className="checklist__count">{row.count}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
