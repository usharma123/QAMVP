import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertTriangle, CheckCircle2, Circle, FileText,
  Folder, Image, Play, RefreshCw, Shield,
  Square, Terminal, X,
} from 'lucide-react';
import type {
  ApprovalRequest, BusinessEvent, EvidenceItem,
  EvidenceKind, RunRecord, WorkflowPhase,
} from '../shared/types';
import './styles.css';

const API = '/api';

// Main pipeline steps (heal steps are conditional — not in this list)
const PIPELINE_STEPS: { phase: WorkflowPhase; label: string }[] = [
  { phase: 'prepare_kb',        label: 'Ensure DB / KB' },
  { phase: 'audit_ingestion',   label: 'Audit Ingestion Gate' },
  { phase: 'checkpoint',        label: 'Human Checkpoint' },
  { phase: 'publish_artifacts', label: 'Export JSON / MD / XLSX' },
  { phase: 'execute_browser',   label: 'Run Playwright' },
  { phase: 'verify_evidence',   label: 'Verify Run Artifacts' },
  { phase: 'audit_run',         label: 'Audit Run' },
  { phase: 'complete',          label: 'Complete' },
];

// Full phase → label map (including conditionals, for dividers)
const PHASE_LABELS: Partial<Record<WorkflowPhase, string>> = {
  prepare_kb:        'Ensure DB / KB',
  audit_ingestion:   'Audit Ingestion Gate',
  heal_ingestion:    'Heal & Rerun Gate',
  checkpoint:        'Human Checkpoint',
  publish_artifacts: 'Export JSON / MD / XLSX',
  execute_browser:   'Run Playwright',
  verify_evidence:   'Verify Run Artifacts',
  audit_run:         'Audit Run',
  heal_final_audit:  'Heal Audit Findings',
  complete:          'Complete',
};

// ─── App ─────────────────────────────────────────────────────────────────────

function App() {
  const [scope, setScope]     = useState('all');
  const [dryRun, setDryRun]   = useState(false);
  const [run, setRun]         = useState<RunRecord | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const chatRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on new events
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [run?.events.length]);

  // SSE subscription
  useEffect(() => {
    if (!run?.id) return;
    const src = new EventSource(`${API}/runs/${run.id}/events`);
    src.addEventListener('run', (e) => setRun(JSON.parse((e as MessageEvent).data)));
    src.addEventListener('business-event', (e) => {
      const item = JSON.parse((e as MessageEvent).data) as BusinessEvent;
      setRun((cur) => {
        if (!cur || cur.id !== item.runId || cur.events.some((ev) => ev.id === item.id)) return cur;
        return { ...cur, events: [...cur.events, item], currentPhase: item.phase };
      });
    });
    return () => src.close();
  }, [run?.id]);

  async function startRun() {
    const res = await fetch(`${API}/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope, dryRun }),
    });
    setRun(await res.json());
  }

  async function approve(decision: ApprovalRequest['decision']) {
    if (!run) return;
    await fetch(`${API}/runs/${run.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, scope, note: decision === 'approve' ? 'Approved from UI' : undefined }),
    });
  }

  async function stopRun() {
    if (!run) return;
    await fetch(`${API}/runs/${run.id}/stop`, { method: 'POST' });
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const isLive = run?.status === 'running' || run?.status === 'waiting';
  const activeCheckpoint = run?.checkpoints.find((cp) => !cp.resolvedAt);

  return (
    <div className="app-shell">
      <Header run={run} isLive={isLive} />

      <div className="chat-wrap" ref={chatRef}>
        <div className="chat-feed">
          {!run && (
            <Welcome scope={scope} />
          )}
          {run && (
            <>
              <PlanMessage run={run} isLive={isLive} />
              <ChatEvents
                run={run}
                expanded={expanded}
                onToggle={toggleExpand}
              />
              {activeCheckpoint && (
                <CheckpointCard checkpoint={activeCheckpoint} onApprove={approve} />
              )}
              {!isLive && run.status !== 'created' && (
                <CompletionLine status={run.status} />
              )}
              {run.evidence.length > 0 && (
                <EvidenceSection evidence={run.evidence} />
              )}
            </>
          )}
        </div>
      </div>

      <InputBar
        scope={scope} setScope={setScope}
        dryRun={dryRun} setDryRun={setDryRun}
        isLive={isLive}
        onStart={startRun}
        onStop={stopRun}
      />
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function Header({ run, isLive }: { run: RunRecord | null; isLive: boolean }) {
  const pills = run ? [
    { k: 'gate',    v: run.gateStatus?.replace(/_/g, ' ')    ?? '—', t: gateColor(run.gateStatus) },
    { k: 'audit',   v: run.auditVerdict?.replace(/_/g, ' ')  ?? '—', t: verdictColor(run.auditVerdict) },
    { k: 'blockers',v: String(run.blockerCount ?? 0),                  t: run.blockerCount ? 'high' : '' },
  ] : [];

  return (
    <header className="header">
      <div className="header-brand">
        <Terminal size={16} className="brand-icon" />
        <span className="brand-name">QAMVP</span>
        <span className="brand-sep">/</span>
        <span className="brand-sub">QA Loop</span>
      </div>
      <div className="header-pills">
        {pills.map((p) => (
          <span key={p.k} className={`hpill${p.t ? ` ${p.t}` : ''}`}>
            <span className="hpill-k">{p.k}</span>
            <span className="hpill-v">{p.v}</span>
          </span>
        ))}
      </div>
      {isLive && (
        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
          <span className="cursor-blink" style={{ marginRight: 6 }}>●</span>running
        </span>
      )}
    </header>
  );
}

function gateColor(g?: string) {
  if (g === 'passed')   return 'green';
  if (g === 'blocked')  return 'red';
  if (g === 'checking') return 'blue';
  return '';
}

function verdictColor(v?: string) {
  if (v === 'approved')                  return 'green';
  if (v === 'not_approved')              return 'red';
  if (v === 'approved_with_conditions')  return 'amber';
  if (v === 'inconclusive')              return 'amber';
  return '';
}

// ─── Welcome ─────────────────────────────────────────────────────────────────

function Welcome({ scope }: { scope: string }) {
  return (
    <div className="welcome">
      <div className="welcome-prompt">
        <div className="agent-badge"><Terminal size={13} /></div>
        <span className="welcome-cmd">/playwright-test-flow {scope}</span>
        <span className="cursor-blink">▋</span>
      </div>
      <p className="welcome-hint">Configure scope and press Run to start the governed QA loop.</p>
      <div className="welcome-flow">
        {PIPELINE_STEPS.map((step, i) => (
          <React.Fragment key={step.phase}>
            <span className="flow-step">{step.label}</span>
            {i < PIPELINE_STEPS.length - 1 && <span className="flow-arrow"> → </span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ─── PlanMessage (live checklist) ────────────────────────────────────────────

function PlanMessage({ run, isLive }: { run: RunRecord; isLive: boolean }) {
  return (
    <div className="plan-message">
      <div className="plan-header">
        <div className="agent-badge"><Terminal size={13} /></div>
        <span className="plan-cmd">
          /playwright-test-flow <code>{run.scope}</code>
        </span>
        {isLive
          ? <span className="cursor-blink">▋</span>
          : <span className={`run-badge ${run.status}`}>{run.status}</span>
        }
      </div>
      <div className="checklist">
        {PIPELINE_STEPS.map((step) => {
          const status = ciStatus(step.phase, run);
          return (
            <div key={step.phase} className={`checklist-item ci-${status}`}>
              <span className="ci-icon"><CiIcon status={status} /></span>
              <span>{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ciStatus(phase: WorkflowPhase, run: RunRecord): 'done' | 'active' | 'failed' | 'waiting' | 'pending' {
  // Deduplicate by rawLabel first (same as ChatEvents) — last event per rawLabel wins
  const latest = new Map<string, BusinessEvent>();
  for (const ev of run.events) {
    if (ev.phase !== phase) continue;
    const key = ev.technical?.rawLabel ?? ev.id;
    latest.set(key, ev);
  }
  if (latest.size > 0) {
    const statuses = new Set(Array.from(latest.values()).map((ev) => ev.status));
    if (statuses.has('failed') || statuses.has('blocked')) return 'failed';
    if (statuses.has('waiting')) return 'waiting';
    if (statuses.has('running')) return 'active';
    if (statuses.has('succeeded')) return 'done';
  }
  if (phase === run.currentPhase) return 'active';
  return 'pending';
}

function CiIcon({ status }: { status: string }) {
  if (status === 'done')    return <CheckCircle2 size={13} />;
  if (status === 'failed')  return <X size={13} />;
  if (status === 'active')  return <span className="ci-spinner" />;
  if (status === 'waiting') return <AlertTriangle size={13} />;
  return <Circle size={13} />;
}

// ─── ChatEvents (phase groups + tool calls) ───────────────────────────────────

function ChatEvents({
  run, expanded, onToggle,
}: {
  run: RunRecord;
  expanded: Set<string>;
  onToggle: (id: string) => void;
}) {
  // Group by phase, then deduplicate by rawLabel — last event per rawLabel wins.
  // This collapses running→succeeded transitions into a single row per step.
  const groups = useMemo(() => {
    const phaseOrder: WorkflowPhase[] = [];
    const phaseMap = new Map<WorkflowPhase, Map<string, BusinessEvent>>();

    for (const ev of run.events) {
      if (!phaseMap.has(ev.phase)) {
        phaseOrder.push(ev.phase);
        phaseMap.set(ev.phase, new Map());
      }
      const key = ev.technical?.rawLabel ?? ev.id;
      phaseMap.get(ev.phase)!.set(key, ev);
    }

    return phaseOrder.map((phase) => ({
      phase,
      entries: Array.from(phaseMap.get(phase)!.entries()),
    }));
  }, [run.events]);

  return (
    <>
      {groups.map((g) => {
        const lastEvent = g.entries.at(-1)?.[1];
        const overallStatus = lastEvent?.status ?? 'queued';
        const label = PHASE_LABELS[g.phase] ?? g.phase;
        return (
          <React.Fragment key={g.phase}>
            <PhaseDivider label={label} status={overallStatus} />
            {g.entries.map(([rawLabel, ev]) => {
              const expandKey = `${g.phase}:${rawLabel}`;
              return (
                <ToolCallBlock
                  key={expandKey}
                  event={ev}
                  expanded={expanded.has(expandKey)}
                  onToggle={() => onToggle(expandKey)}
                />
              );
            })}
          </React.Fragment>
        );
      })}
    </>
  );
}

// ─── PhaseDivider ─────────────────────────────────────────────────────────────

function PhaseDivider({ label, status }: { label: string; status: string }) {
  const icon =
    status === 'succeeded' ? '✓' :
    status === 'failed' || status === 'blocked' ? '✗' :
    status === 'running' ? '◆' :
    status === 'waiting' ? '◈' : '○';
  return (
    <div className={`phase-divider status-${status}`}>
      <span className="pdivider-line" />
      <span className="pdivider-label">
        {icon} {label}
      </span>
      <span className="pdivider-line" />
    </div>
  );
}

// ─── ToolCallBlock ────────────────────────────────────────────────────────────

function ToolCallBlock({
  event, expanded, onToggle,
}: {
  event: BusinessEvent;
  expanded: boolean;
  onToggle: () => void;
}) {
  const tech = event.technical;
  const hasBody = !!(tech?.command || tech?.sdkPrompt || tech?.stdout || tech?.stderr);

  return (
    <div className={`tool-call status-${event.status}`}>
      <button
        className="tool-call-header"
        onClick={() => hasBody && onToggle()}
        style={{ cursor: hasBody ? 'pointer' : 'default' }}
      >
        <span className="tc-icon">
          {event.status === 'succeeded' && <CheckCircle2 size={13} />}
          {(event.status === 'failed' || event.status === 'blocked') && <X size={13} />}
          {event.status === 'running' && <span className="tc-spinner" />}
          {event.status === 'waiting' && <AlertTriangle size={13} />}
          {event.status === 'queued'  && <Circle size={13} />}
          {event.status === 'warning' && <AlertTriangle size={13} />}
        </span>
        <span className="tc-title">{event.title}</span>
        <span style={{ flex: 1 }} />
        {event.status === 'succeeded' && <span className="tc-ok">✓</span>}
        {(event.status === 'failed' || event.status === 'blocked') && <span className="tc-err">✗</span>}
        {hasBody && (
          <span className={`tc-expand${expanded ? ' open' : ''}`}>›</span>
        )}
      </button>

      {expanded && hasBody && (
        <div className="tool-call-body">
          {event.summary && <p className="tc-summary">{event.summary}</p>}

          {(tech?.command || tech?.sdkPrompt) && (
            <pre className="tc-pre cmd">{tech.command ?? tech.sdkPrompt}</pre>
          )}

          {tech?.stdout && (
            <div className="tc-block">
              <span className="tc-block-label">stdout</span>
              <pre className="tc-pre">{tech.stdout}</pre>
            </div>
          )}

          {tech?.stderr && (
            <div className="tc-block">
              <span className="tc-block-label">stderr</span>
              <pre className="tc-pre stderr">{tech.stderr}</pre>
            </div>
          )}

          {event.evidence && event.evidence.length > 0 && (
            <div className="tc-evidence">
              {event.evidence.slice(0, 5).map((ev) => (
                <span key={ev.id} className="ev-chip">
                  <EvKindIcon kind={ev.kind} />
                  {ev.label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EvKindIcon({ kind }: { kind: EvidenceKind }) {
  if (kind === 'screenshot') return <Image size={9} />;
  if (kind === 'folder')     return <Folder size={9} />;
  return <FileText size={9} />;
}

// ─── CheckpointCard ───────────────────────────────────────────────────────────

function CheckpointCard({
  checkpoint, onApprove,
}: {
  checkpoint: RunRecord['checkpoints'][number];
  onApprove: (d: ApprovalRequest['decision']) => void;
}) {
  return (
    <div className="checkpoint-card">
      <div className="checkpoint-header">
        <AlertTriangle size={13} />
        Human Checkpoint
      </div>
      <p className="checkpoint-title">{checkpoint.title}</p>
      <p className="checkpoint-msg">{checkpoint.message}</p>
      <div className="checkpoint-actions">
        <button className="cp-approve" onClick={() => onApprove('approve')}>
          <CheckCircle2 size={13} /> Approve
        </button>
        <button className="cp-scope" onClick={() => onApprove('change_scope')}>
          <RefreshCw size={13} /> Change scope
        </button>
        <button className="cp-stop" onClick={() => onApprove('stop')}>
          <Square size={13} /> Stop
        </button>
      </div>
    </div>
  );
}

// ─── EvidenceSection ──────────────────────────────────────────────────────────

function EvidenceSection({ evidence }: { evidence: EvidenceItem[] }) {
  const items = useMemo(() => evidence.slice(0, 20), [evidence]);
  return (
    <div className="evidence-section">
      <div className="ev-section-header">
        <Shield size={11} /> Evidence Artifacts
      </div>
      <div className="ev-grid">
        {items.map((item) => (
          <div key={item.id} className="ev-row">
            <span className="ev-kind">{item.kind}</span>
            <span className="ev-label">{item.label}</span>
            <span className="ev-path">{item.path}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CompletionLine ───────────────────────────────────────────────────────────

function CompletionLine({ status }: { status: string }) {
  const msg =
    status === 'approved' ? '✓ Run complete — audit approved' :
    status === 'blocked'  ? '✗ Run blocked — review findings' :
    status === 'stopped'  ? '◼ Run stopped' :
    status === 'failed'   ? '✗ Run failed'  : status;
  return <div className={`completion-line ${status}`}>{msg}</div>;
}

// ─── InputBar ─────────────────────────────────────────────────────────────────

function InputBar({
  scope, setScope, dryRun, setDryRun, isLive, onStart, onStop,
}: {
  scope: string; setScope: (v: string) => void;
  dryRun: boolean; setDryRun: (v: boolean) => void;
  isLive: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  return (
    <div className="input-bar">
      <div className="input-inner">
        <div className="scope-wrap">
          <span className="scope-label">/playwright-test-flow</span>
          <input
            className="scope-input"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            aria-label="Scope"
            placeholder="all"
          />
        </div>
        <label className="dry-run-toggle">
          <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
          dry-run
        </label>
        <div className="spacer" />
        {isLive ? (
          <button className="btn-stop" onClick={onStop}>
            <Square size={12} /> Stop
          </button>
        ) : (
          <button className="btn-run" onClick={onStart}>
            <Play size={13} /> Run
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Mount ────────────────────────────────────────────────────────────────────

createRoot(document.getElementById('root')!).render(<App />);
