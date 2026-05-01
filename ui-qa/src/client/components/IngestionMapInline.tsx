import React, { useState } from 'react';
import type { BusinessEvent, CountByLabel, IngestedDocument, IngestionMap } from '../../shared/types';
import { maxCount, phaseShort, shortName, statusGlyph, sumCount } from '../lib/format';

export function IngestionMapInline({
  event,
  map,
}: {
  event: BusinessEvent;
  map: IngestionMap & { kind: 'ingestion-map' };
}) {
  const [open, setOpen] = useState(false);
  const totalEntities = sumCount(map.entities);
  const totalRelationships = sumCount(map.relationships);

  return (
    <div className={`mapblock${open ? ' is-open' : ''}`}>
      <button type="button" className="mapblock__head" onClick={() => setOpen((v) => !v)}>
        <span className="mapblock__chev">{open ? '▾' : '▸'}</span>
        <span className="mapblock__glyph">{statusGlyph(event.status)}</span>
        <span className="mapblock__phase">{phaseShort(event.phase)}</span>
        <span className="mapblock__title">Ingestion knowledge map</span>
        <span className="mapblock__stats">
          <b>{map.documents.length}</b> docs<span className="dot">·</span>
          <b>{totalEntities}</b> entities<span className="dot">·</span>
          <b>{totalRelationships}</b> rels
          {map.rtm && (
            <>
              <span className="dot">·</span>
              <b>{map.rtm.rows}</b> RTM
            </>
          )}
        </span>
      </button>

      {open && (
        <div className="mapblock__body">
          {event.summary && <p className="mapblock__lede">{event.summary}</p>}

          {map.documents.length > 0 && (
            <Section label="Documents" hint={`${map.documents.length} indexed`}>
              <div className="mapblock__docs">
                {map.documents.slice(0, 12).map((doc) => (
                  <DocumentTile key={doc.id} doc={doc} />
                ))}
                {map.documents.length > 12 && (
                  <span className="mapblock__more">+{map.documents.length - 12} more</span>
                )}
              </div>
            </Section>
          )}

          {map.entities.length > 0 && (
            <Section label="Entity types" hint={`${totalEntities} mapped`}>
              <BarList rows={map.entities} max={maxCount(map.entities)} />
            </Section>
          )}

          {map.rtm && (
            <Section label="Derived RTM" hint={`${map.rtm.requirements} requirements`}>
              <div className="mapblock__rtm">
                <span><b>{map.rtm.rows}</b> rows</span>
                <span><b>{map.rtm.links}</b> links</span>
                <span><b>{map.rtm.unmapped}</b> unmapped</span>
                <span><b>{Math.round(map.rtm.averageConfidence * 100)}%</b> avg confidence</span>
              </div>
            </Section>
          )}

          {(map.relationships.length > 0 || map.rel_samples.length > 0) && (
            <Section label="Relationships" hint={`${totalRelationships} traced`}>
              {map.relationships.length > 0 && (
                <BarList rows={map.relationships} max={maxCount(map.relationships)} muted />
              )}
              {map.rel_samples.length > 0 && (
                <table className="mapblock__samples">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>From</th>
                      <th></th>
                      <th>To</th>
                    </tr>
                  </thead>
                  <tbody>
                    {map.rel_samples.slice(0, 8).map((sample, idx) => (
                      <tr key={idx}>
                        <td><span className="mapblock__rel-type">{sample.type}</span></td>
                        <td title={sample.from}>{shortName(sample.from)}</td>
                        <td className="mapblock__arrow">→</td>
                        <td title={sample.to}>{shortName(sample.to)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mapblock__section">
      <header>
        <span className="label">{label}</span>
        {hint && <span className="hint">{hint}</span>}
      </header>
      {children}
    </section>
  );
}

function DocumentTile({ doc }: { doc: IngestedDocument }) {
  return (
    <div className="mapblock__doc">
      <div className="mapblock__doc-head">
        <span className="mapblock__kind">{doc.kind}</span>
        <span className="mapblock__doc-name" title={doc.label}>{shortName(doc.label)}</span>
      </div>
      {(doc.version || doc.versionCount) && (
        <div className="mapblock__doc-version">
          {doc.version ? `v${doc.version}` : 'versioned'}
          {doc.versionCount && doc.versionCount > 1 ? ` · ${doc.versionCount} versions` : ''}
          {doc.isActive === false ? ' · inactive' : ''}
        </div>
      )}
      <div className="mapblock__doc-stats">
        <span><b>{doc.chunks}</b> chunks</span>
        <span className="dot">·</span>
        <span><b>{doc.entities}</b> entities</span>
        <span className="dot">·</span>
        <span><b>{doc.rels}</b> rels</span>
      </div>
    </div>
  );
}

function BarList({ rows, max, muted }: { rows: CountByLabel[]; max: number; muted?: boolean }) {
  return (
    <div className={`mapblock__bars${muted ? ' is-muted' : ''}`}>
      {rows.map((row) => {
        const width = max > 0 ? Math.max(6, Math.round((row.count / max) * 100)) : 0;
        return (
          <div className="mapblock__bar" key={row.type}>
            <span className="mapblock__bar-label" title={row.type}>{row.type}</span>
            <span className="mapblock__bar-track">
              <span className="mapblock__bar-fill" style={{ width: `${width}%` }} />
            </span>
            <span className="mapblock__bar-count">{row.count}</span>
          </div>
        );
      })}
    </div>
  );
}
