import React from 'react';
import type { BusinessEvent } from '../../shared/types';
import { formatDuration, formatTime, phaseShort, statusGlyph, statusTone } from '../lib/format';

export function ToolRow({
  event,
  expanded,
  onToggle,
}: {
  event: BusinessEvent;
  expanded: boolean;
  onToggle: () => void;
}) {
  const tech = event.technical;
  const hasDetails = Boolean(tech?.command || tech?.sdkPrompt || tech?.stdout || tech?.stderr || event.summary);
  const tone = statusTone(event.status);
  const duration = formatDuration(event.createdAt, event.finishedAt);
  const isRunning = event.status === 'running';

  return (
    <div className={`toolrow${expanded ? ' is-open' : ''}`} data-tone={tone}>
      <button
        type="button"
        className="toolrow__head"
        onClick={() => hasDetails && onToggle()}
        disabled={!hasDetails}
      >
        <span className="toolrow__chev">{hasDetails ? (expanded ? '▾' : '▸') : '·'}</span>
        <span className={`toolrow__glyph${isRunning ? ' is-spinning' : ''}`}>{statusGlyph(event.status)}</span>
        <span className="toolrow__phase">{phaseShort(event.phase)}</span>
        <span className="toolrow__title">{event.title}</span>
        <span className="toolrow__meta">
          {duration && <span className="toolrow__dur">{duration}</span>}
          <span className="toolrow__time">{formatTime(new Date(event.createdAt))}</span>
        </span>
      </button>

      {expanded && hasDetails && (
        <div className="toolrow__detail">
          {event.summary && <p className="toolrow__summary">{event.summary}</p>}
          {(tech?.command || tech?.sdkPrompt) && (
            <DetailBlock
              label={tech?.command ? 'shell · invocation' : 'cursor sdk · prompt'}
              hint={tech?.toolName ?? ''}
              body={tech?.command ?? tech?.sdkPrompt ?? ''}
            />
          )}
          {tech?.stdout && <DetailBlock label="stdout" hint="tail" body={tech.stdout} />}
          {tech?.stderr && <DetailBlock label="stderr" hint="warning" body={tech.stderr} variant="err" />}
        </div>
      )}
    </div>
  );
}

function DetailBlock({
  label,
  hint,
  body,
  variant,
}: {
  label: string;
  hint?: string;
  body: string;
  variant?: 'err';
}) {
  return (
    <div className={`detail-block${variant ? ` detail-block--${variant}` : ''}`}>
      <div className="detail-block__label">
        <span>{label}</span>
        {hint && <span>{hint}</span>}
      </div>
      <pre>{body}</pre>
    </div>
  );
}
