import React, { useRef, useState } from 'react';

export type ComposerProps = {
  scope: string;
  dryRun: boolean;
  autoApprove: boolean;
  message: string;
  files: FileList | null;
  isLive: boolean;
  isUploading: boolean;
  canRetry: boolean;
  canGenerateTestCases: boolean;
  hasRun: boolean;
  onScopeChange: (value: string) => void;
  onDryRunChange: (value: boolean) => void;
  onAutoApproveChange: (value: boolean) => void;
  onMessageChange: (value: string) => void;
  onFilesChange: (files: FileList | null) => void;
  onSend: () => void;
  onStart: () => void;
  onStop: () => void;
  onGenerateTestCases: () => void;
};

export function Composer(props: ComposerProps) {
  const {
    scope,
    dryRun,
    autoApprove,
    message,
    files,
    isLive,
    isUploading,
    canRetry,
    canGenerateTestCases,
    hasRun,
    onScopeChange,
    onDryRunChange,
    onAutoApproveChange,
    onMessageChange,
    onFilesChange,
    onSend,
    onStart,
    onStop,
    onGenerateTestCases,
  } = props;

  const [chipsOpen, setChipsOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileCount = files?.length ?? 0;
  const hasMessage = message.trim().length > 0;

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragActive(false);
    if (event.dataTransfer?.files?.length) {
      onFilesChange(event.dataTransfer.files);
    }
  }

  function pickFiles() {
    fileInputRef.current?.click();
  }

  const primaryAction = (() => {
    if (isLive) return { label: 'Stop run', tone: 'danger' as const, run: onStop };
    if (hasMessage) return { label: 'Send', tone: 'accent' as const, run: onSend };
    if (fileCount > 0 || canRetry || !hasRun) {
      return {
        label: isUploading ? 'Uploading…' : canRetry ? 'Retry ingestion' : 'Start ingestion',
        tone: 'accent' as const,
        run: onStart,
      };
    }
    return { label: 'Send', tone: 'accent' as const, run: onSend };
  })();

  return (
    <div className="composer-wrap">
      {canGenerateTestCases && (
        <div className="suggestions">
          <button type="button" className="suggestion" onClick={onGenerateTestCases}>
            <span className="suggestion__glyph">＋</span>
            Generate <code>TestCases.xlsx</code>
          </button>
        </div>
      )}

      {fileCount > 0 && (
        <div className="filechip">
          <span className="filechip__glyph">▣</span>
          <b>{fileCount}</b> file{fileCount === 1 ? '' : 's'} queued
          {!hasRun && <span className="filechip__hint">— start a run to ingest</span>}
          <button type="button" className="filechip__clear" onClick={() => onFilesChange(null)}>
            clear
          </button>
        </div>
      )}

      {chipsOpen && (
        <div className="chipstrip">
          <label className="chipstrip__field">
            <span>scope</span>
            <input
              value={scope}
              onChange={(event) => onScopeChange(event.target.value)}
              spellCheck={false}
              aria-label="scope"
            />
          </label>
          <label className="chipstrip__toggle">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(event) => onDryRunChange(event.target.checked)}
            />
            <span className="box" />
            Dry-run
          </label>
          <label className="chipstrip__toggle">
            <input
              type="checkbox"
              checked={autoApprove}
              onChange={(event) => onAutoApproveChange(event.target.checked)}
            />
            <span className="box" />
            Auto-approve
          </label>
        </div>
      )}

      <div
        className={`composer${dragActive ? ' is-drag' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <button
          type="button"
          className="composer__icon"
          onClick={pickFiles}
          aria-label="Attach files"
          title="Attach .docx, .md, .xlsx"
        >
          ＋
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".docx,.md,.xlsx"
          style={{ display: 'none' }}
          onChange={(event) => onFilesChange(event.currentTarget.files)}
        />
        <textarea
          className="composer__input"
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              if (hasMessage) onSend();
            }
          }}
          rows={1}
          placeholder={
            hasRun
              ? 'Ask anything about the KB. Drop .docx/.md/.xlsx to add sources.'
              : 'Drop your source pack or describe what you want tested.'
          }
        />
        <button
          type="button"
          className="composer__icon composer__icon--more"
          onClick={() => setChipsOpen((v) => !v)}
          aria-label="Toggle run options"
          aria-expanded={chipsOpen}
          title="Run options"
        >
          ⋯
        </button>
        <button
          type="button"
          className={`composer__send composer__send--${primaryAction.tone}`}
          onClick={primaryAction.run}
          disabled={isUploading}
        >
          {primaryAction.label}
        </button>
      </div>
    </div>
  );
}
