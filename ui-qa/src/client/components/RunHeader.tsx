import React from 'react';
import type { RunRecord } from '../../shared/types';
import { formatTime } from '../lib/format';

export function RunHeader({ run }: { run: RunRecord }) {
  const id = `RUN-${run.id.slice(0, 8).toUpperCase()}`;
  return (
    <div className="runhead">
      <span className="runhead__id">{id}</span>
      <span className="runhead__sep">·</span>
      <span>scope <b>{run.scope}</b></span>
      <span className="runhead__sep">·</span>
      <span>{run.dryRun ? 'Dry-run' : 'Live'}</span>
      {run.autoApprove && (
        <>
          <span className="runhead__sep">·</span>
          <span>auto-approve</span>
        </>
      )}
      <span className="runhead__sep">·</span>
      <span>started {formatTime(new Date(run.createdAt))}</span>
    </div>
  );
}
