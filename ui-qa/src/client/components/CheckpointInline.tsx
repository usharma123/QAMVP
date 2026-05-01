import React from 'react';
import type { ApprovalRequest, Checkpoint } from '../../shared/types';
import { formatTime } from '../lib/format';
import { Markdown } from '../lib/markdown';

export function CheckpointInline({
  checkpoint,
  onDecision,
}: {
  checkpoint: Checkpoint;
  onDecision: (decision: ApprovalRequest['decision']) => void;
}) {
  const resolved = Boolean(checkpoint.resolvedAt);

  return (
    <div className={`checkpoint${resolved ? ' is-resolved' : ''}`}>
      <div className="checkpoint__head">
        <span className="checkpoint__kicker">Approval required</span>
        <span className="checkpoint__time">{formatTime(new Date(checkpoint.createdAt))}</span>
      </div>
      <h3 className="checkpoint__title">{checkpoint.title}</h3>
      <div className="checkpoint__body">
        <Markdown>{checkpoint.message}</Markdown>
      </div>

      {resolved ? (
        <div className="checkpoint__resolved">
          <span>✓</span>
          <b>{checkpoint.decision ?? 'resolved'}</b>
          {checkpoint.note && <span className="checkpoint__note">— {checkpoint.note}</span>}
        </div>
      ) : (
        <div className="checkpoint__actions">
          <button className="btn btn--accent" onClick={() => onDecision('approve')}>
            Approve & continue
          </button>
          <button className="btn" onClick={() => onDecision('change_scope')}>
            Change scope
          </button>
          <button className="btn btn--danger" onClick={() => onDecision('stop')}>
            Stop run
          </button>
        </div>
      )}
    </div>
  );
}
