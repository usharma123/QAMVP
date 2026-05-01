import React, { useEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ApprovalRequest, BusinessEvent, RunRecord } from '../shared/types';
import './styles.css';
import { ChatStream } from './components/ChatStream';
import { Composer } from './components/Composer';
import { Tabs, type TabKey } from './components/Tabs';
import { Welcome } from './components/Welcome';
import { ArtifactsTab } from './components/ArtifactsTab';

const API = '/api';

function App() {
  const [run, setRun] = useState<RunRecord | null>(null);
  const [scope, setScope] = useState('all');
  const [dryRun, setDryRun] = useState(false);
  const [autoApprove, setAutoApprove] = useState(true);
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [tab, setTab] = useState<TabKey>('activity');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const feedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!run?.id) return;
    let cancelled = false;
    const refreshRun = async () => {
      try {
        const response = await fetch(`${API}/runs/${run.id}`);
        if (!response.ok || cancelled) return;
        setRun((await response.json()) as RunRecord);
      } catch {
        // SSE remains the primary live channel; polling is only a reconciliation fallback.
      }
    };

    const source = new EventSource(`${API}/runs/${run.id}/events`);
    source.addEventListener('run', (event) => setRun(JSON.parse((event as MessageEvent).data)));
    source.addEventListener('business-event', (event) => {
      const item = JSON.parse((event as MessageEvent).data) as BusinessEvent;
      setRun((current) => {
        if (!current || current.id !== item.runId) return current;
        const idx = current.events.findIndex((existing) => existing.id === item.id);
        if (idx === -1) {
          return { ...current, events: [...current.events, item], currentPhase: item.phase };
        }
        const events = current.events.slice();
        events[idx] = item;
        return { ...current, events, currentPhase: item.phase };
      });
    });
    void refreshRun();
    const interval = window.setInterval(refreshRun, run.status === 'running' || run.status === 'waiting' ? 1500 : 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      source.close();
    };
  }, [run?.id, run?.status]);

  useEffect(() => {
    if (tab !== 'activity') return;
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [run?.events.length, run?.messages.length, run?.checkpoints.length, tab]);

  const isLive = run?.status === 'running' || run?.status === 'waiting';
  const canGenerateTestCases = Boolean(run) && !isLive && (run?.status === 'ready' || run?.currentPhase === 'rag_ready');
  const canRetry = Boolean(run?.uploads.length) && (run?.status === 'blocked' || run?.status === 'stopped' || run?.status === 'created') && !files?.length;

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function startRun() {
    if (canRetry && run) {
      const response = await fetch(`${API}/runs/${run.id}/start`, { method: 'POST' });
      setRun((await response.json()) as RunRecord);
      return;
    }
    const deferStart = Boolean(files?.length);
    const response = await fetch(`${API}/runs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scope, dryRun, autoApprove, deferStart }),
    });
    const nextRun = (await response.json()) as RunRecord;
    setRun(nextRun);
    if (files?.length) {
      await uploadFiles(nextRun.id);
      await fetch(`${API}/runs/${nextRun.id}/start`, { method: 'POST' });
    }
  }

  async function uploadFiles(runId = run?.id) {
    if (!runId || !files?.length) return;
    setIsUploading(true);
    try {
      const form = new FormData();
      Array.from(files).forEach((file) => form.append('files', file));
      const response = await fetch(`${API}/runs/${runId}/uploads`, { method: 'POST', body: form });
      const payload = await response.json();
      setRun(payload.run);
      setFiles(null);
    } finally {
      setIsUploading(false);
    }
  }

  async function approve(decision: ApprovalRequest['decision']) {
    if (!run) return;
    await fetch(`${API}/runs/${run.id}/approve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decision, scope, note: `${decision} from ui-qa` }),
    });
  }

  async function stopRun() {
    if (!run) return;
    await fetch(`${API}/runs/${run.id}/stop`, { method: 'POST' });
  }

  async function generateTestCases() {
    if (!run || isLive) return;
    const response = await fetch(`${API}/runs/${run.id}/generate-testcases`, { method: 'POST' });
    setRun((await response.json()) as RunRecord);
  }

  async function sendMessage() {
    if (!message.trim()) return;
    const response = await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ runId: run?.id, message }),
    });
    const payload = await response.json();
    setRun(payload.run);
    setMessage('');
  }

  return (
    <div className="app">
      <Tabs active={tab} artifactCount={run?.evidence.length ?? 0} onChange={setTab} />

      <main className="canvas">
        <div className="scroll" ref={feedRef}>
          <div className="column">
            {tab === 'activity' ? (
              <>
                {!run && <Welcome />}
                {run && (
                  <ChatStream
                    run={run}
                    expanded={expanded}
                    onToggle={toggle}
                    onDecision={approve}
                  />
                )}
              </>
            ) : (
              <ArtifactsTab evidence={run?.evidence ?? []} />
            )}
          </div>
        </div>

        <div className="dock">
          <div className="column">
            <Composer
              scope={scope}
              dryRun={dryRun}
              autoApprove={autoApprove}
              message={message}
              files={files}
              isLive={Boolean(isLive)}
              isUploading={isUploading}
              canRetry={Boolean(canRetry)}
              canGenerateTestCases={Boolean(canGenerateTestCases)}
              hasRun={Boolean(run)}
              onScopeChange={setScope}
              onDryRunChange={setDryRun}
              onAutoApproveChange={setAutoApprove}
              onMessageChange={setMessage}
              onFilesChange={setFiles}
              onSend={sendMessage}
              onStart={startRun}
              onStop={stopRun}
              onGenerateTestCases={generateTestCases}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root container.');

const globalState = globalThis as typeof globalThis & { __uiQaRoot?: Root };
globalState.__uiQaRoot ??= createRoot(container);
globalState.__uiQaRoot.render(<App />);
