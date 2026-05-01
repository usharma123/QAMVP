import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Markdown } from '../lib/markdown';

const API = '/api';
const DEFAULT_LIMIT = 100;

type Sheet = { name: string; columns: string[]; rows: unknown[][]; totalRows: number };

type Preview =
  | { kind: 'xlsx' | 'csv'; sheets: Sheet[]; meta: PreviewMeta }
  | { kind: 'json'; json: unknown; meta: PreviewMeta }
  | { kind: 'md' | 'text'; text: string; meta: PreviewMeta };

type PreviewMeta = { label: string; path: string; bytes: number; mtime: string };

export function DataFramePreview({
  path,
  label,
  defaultOpen = true,
  onExpand,
  fullHeight,
}: {
  path: string;
  label?: string;
  defaultOpen?: boolean;
  onExpand?: () => void;
  fullHeight?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [data, setData] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [seen, setSeen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // lazy load when scrolled into view (only after open)
  useEffect(() => {
    if (!open || seen) return;
    const node = wrapRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          obs.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [open, seen]);

  useEffect(() => {
    if (!seen) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ path, limit: String(limit) });
    if (activeSheet) params.set('sheet', activeSheet);
    fetch(`${API}/preview?${params.toString()}`)
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${response.status}`);
        }
        return response.json() as Promise<Preview>;
      })
      .then((preview) => {
        if (cancelled) return;
        setData(preview);
        if ((preview.kind === 'xlsx' || preview.kind === 'csv') && !activeSheet && preview.sheets[0]) {
          setActiveSheet(preview.sheets[0].name);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [seen, path, activeSheet, limit]);

  const labelText = label ?? data?.meta.label ?? path.split('/').pop() ?? path;
  const sizeText = data ? formatBytes(data.meta.bytes) : '';

  return (
    <div ref={wrapRef} className={`df${open ? ' is-open' : ''}${fullHeight ? ' df--full' : ''}`}>
      <button type="button" className="df__head" onClick={() => setOpen((v) => !v)}>
        <span className="df__chev">{open ? '▾' : '▸'}</span>
        <span className="df__glyph">▣</span>
        <span className="df__label">{labelText}</span>
        <span className="df__meta">
          {data && summarizeMeta(data, sizeText)}
          {!data && !error && (loading ? 'loading…' : seen ? 'fetching…' : 'click to load')}
          {error && <span className="df__err">{error}</span>}
        </span>
        <span className="df__actions" onClick={(e) => e.stopPropagation()}>
          {onExpand && (
            <button type="button" className="df__action" onClick={onExpand} title="Open in artifacts">
              ⇱
            </button>
          )}
          <a
            className="df__action"
            href={`${API}/artifacts/${encodeURIComponent(path)}`}
            target="_blank"
            rel="noreferrer"
            title="Download"
          >
            ↓
          </a>
        </span>
      </button>

      {open && (
        <div className="df__body">
          {loading && !data && <div className="df__placeholder">Reading {labelText}…</div>}
          {error && <div className="df__placeholder df__placeholder--err">{error}</div>}
          {data?.kind === 'xlsx' || data?.kind === 'csv' ? (
            <SheetView
              data={data}
              activeSheet={activeSheet}
              onActiveSheetChange={setActiveSheet}
              limit={limit}
              onLimitChange={setLimit}
              fullHeight={fullHeight}
            />
          ) : null}
          {data?.kind === 'json' && <JsonView value={data.json} />}
          {data?.kind === 'md' && (
            <div className="df__md">
              <Markdown>{data.text}</Markdown>
            </div>
          )}
          {data?.kind === 'text' && <pre className="df__text">{data.text}</pre>}
        </div>
      )}
    </div>
  );
}

function SheetView({
  data,
  activeSheet,
  onActiveSheetChange,
  limit,
  onLimitChange,
  fullHeight,
}: {
  data: Extract<Preview, { kind: 'xlsx' | 'csv' }>;
  activeSheet: string | null;
  onActiveSheetChange: (name: string) => void;
  limit: number;
  onLimitChange: (next: number) => void;
  fullHeight?: boolean;
}) {
  const sheet = useMemo(
    () => data.sheets.find((s) => s.name === activeSheet) ?? data.sheets[0],
    [data, activeSheet],
  );
  if (!sheet) {
    return <div className="df__placeholder">Empty workbook.</div>;
  }
  const showing = sheet.rows.length;
  const canLoadMore = showing < sheet.totalRows;

  return (
    <>
      {data.sheets.length > 1 && (
        <div className="df__tabs">
          {data.sheets.map((s) => (
            <button
              key={s.name}
              type="button"
              className={`df__tab${s.name === sheet.name ? ' is-active' : ''}`}
              onClick={() => onActiveSheetChange(s.name)}
            >
              {s.name}
              <span className="df__tab-count">{s.totalRows}</span>
            </button>
          ))}
        </div>
      )}
      <div className={`df__scroll${fullHeight ? ' df__scroll--full' : ''}`}>
        <table className="df__table">
          <thead>
            <tr>
              <th className="df__rowidx" />
              {sheet.columns.map((col, idx) => (
                <th key={`${col}-${idx}`} title={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.length === 0 && (
              <tr>
                <td className="df__empty" colSpan={sheet.columns.length + 1}>
                  No rows.
                </td>
              </tr>
            )}
            {sheet.rows.map((row, rIdx) => (
              <tr key={rIdx}>
                <td className="df__rowidx">{rIdx + 1}</td>
                {sheet.columns.map((_, cIdx) => {
                  const value = row[cIdx];
                  const display = value == null || value === '' ? '' : String(value);
                  const numeric = typeof value === 'number';
                  return (
                    <td
                      key={cIdx}
                      className={numeric ? 'df__num' : undefined}
                      title={display.length > 60 ? display : undefined}
                    >
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="df__footer">
        <span>
          Showing <b>{showing.toLocaleString()}</b> of <b>{sheet.totalRows.toLocaleString()}</b> rows
          <span className="df__sep">·</span>
          <b>{sheet.columns.length}</b> cols
        </span>
        {canLoadMore && (
          <button type="button" className="df__more" onClick={() => onLimitChange(limit + 200)}>
            Load 200 more
          </button>
        )}
      </div>
    </>
  );
}

function JsonView({ value }: { value: unknown }) {
  const text = useMemo(() => JSON.stringify(value, null, 2), [value]);
  return <pre className="df__json">{text}</pre>;
}

function summarizeMeta(data: Preview, sizeText: string): React.ReactNode {
  if (data.kind === 'xlsx' || data.kind === 'csv') {
    const totalRows = data.sheets.reduce((sum, s) => sum + s.totalRows, 0);
    const sheetText = data.sheets.length > 1 ? `${data.sheets.length} sheets` : `${data.sheets[0]?.columns.length ?? 0} cols`;
    return (
      <>
        {totalRows.toLocaleString()} rows<span className="df__sep">·</span>
        {sheetText}<span className="df__sep">·</span>
        {sizeText}
      </>
    );
  }
  if (data.kind === 'json') return <>JSON<span className="df__sep">·</span>{sizeText}</>;
  if (data.kind === 'md') return <>Markdown<span className="df__sep">·</span>{sizeText}</>;
  return <>{sizeText}</>;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
