import React, { useMemo, useState } from 'react';
import type { EvidenceItem, EvidenceKind } from '../../shared/types';
import { truncatePathMiddle } from '../lib/format';
import { DataFramePreview } from './DataFramePreview';

const API = '/api';

const PREVIEWABLE_EXT = /\.(xlsx|xls|xlsm|csv|tsv|json|md|markdown|txt|log)$/i;

function isPreviewable(item: EvidenceItem): boolean {
  if (item.kind === 'workbook' || item.kind === 'json') return true;
  if (item.kind === 'report' || item.kind === 'file' || item.kind === 'tool') {
    return PREVIEWABLE_EXT.test(item.path);
  }
  return false;
}

const KIND_ORDER: EvidenceKind[] = [
  'source',
  'workbook',
  'report',
  'json',
  'screenshot',
  'trace',
  'tool',
  'file',
  'folder',
];

export function ArtifactsTab({ evidence }: { evidence: EvidenceItem[] }) {
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return evidence;
    return evidence.filter(
      (item) => item.label.toLowerCase().includes(q) || item.path.toLowerCase().includes(q),
    );
  }, [evidence, query]);

  const groups = useMemo(() => {
    const map = new Map<EvidenceKind, EvidenceItem[]>();
    for (const item of filtered) {
      const list = map.get(item.kind) ?? [];
      list.push(item);
      map.set(item.kind, list);
    }
    const entries: Array<[EvidenceKind, EvidenceItem[]]> = [];
    for (const kind of KIND_ORDER) {
      if (map.has(kind)) entries.push([kind, map.get(kind)!]);
    }
    for (const [kind, list] of map) {
      if (!KIND_ORDER.includes(kind)) entries.push([kind, list]);
    }
    return entries;
  }, [filtered]);

  if (evidence.length === 0) {
    return (
      <div className="artifacts artifacts--empty">
        <h2>Artifacts</h2>
        <p>No evidence yet. Once a run produces sources, reports, or screenshots they'll be listed here.</p>
      </div>
    );
  }

  return (
    <div className="artifacts">
      <header className="artifacts__head">
        <h2>Artifacts</h2>
        <span className="artifacts__count">{evidence.length} item{evidence.length === 1 ? '' : 's'}</span>
        <input
          className="artifacts__search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by label or path…"
          spellCheck={false}
        />
      </header>

      {filtered.length === 0 ? (
        <p className="artifacts__none">No artifacts match "{query}".</p>
      ) : (
        groups.map(([kind, items]) => (
          <section key={kind} className="artifacts__group">
            <header>
              <span className="artifacts__kind">{kind}</span>
              <span className="artifacts__group-count">{items.length}</span>
            </header>
            <ul className="artifacts__list">
              {items.map((item) => {
                const previewable = isPreviewable(item);
                const isOpen = openId === item.id;
                return (
                  <li key={item.id} className={isOpen ? 'is-open' : undefined}>
                    {previewable ? (
                      <button
                        type="button"
                        className="artifacts__row artifacts__row--btn"
                        onClick={() => setOpenId(isOpen ? null : item.id)}
                        aria-expanded={isOpen}
                      >
                        <span className="artifacts__chev">{isOpen ? '▾' : '▸'}</span>
                        <span className="artifacts__label" title={item.label}>{item.label}</span>
                        <span className="artifacts__path" title={item.path}>{truncatePathMiddle(item.path, 80)}</span>
                        <a
                          className="artifacts__dl"
                          href={`${API}/artifacts/${encodeURIComponent(item.path)}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="Download"
                        >
                          ↓
                        </a>
                      </button>
                    ) : (
                      <a
                        className="artifacts__row"
                        href={`${API}/artifacts/${encodeURIComponent(item.path)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span className="artifacts__chev artifacts__chev--inert">·</span>
                        <span className="artifacts__label" title={item.label}>{item.label}</span>
                        <span className="artifacts__path" title={item.path}>{truncatePathMiddle(item.path, 80)}</span>
                        <span className="artifacts__dl">↓</span>
                      </a>
                    )}
                    {isOpen && previewable && (
                      <div className="artifacts__panel">
                        <DataFramePreview path={item.path} label={item.label} defaultOpen fullHeight />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
