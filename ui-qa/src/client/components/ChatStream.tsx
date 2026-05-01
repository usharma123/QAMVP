import React from 'react';
import type {
  ApprovalRequest,
  BusinessEvent,
  ChatMessage,
  Checkpoint,
  EvidenceItem,
  RunRecord,
} from '../../shared/types';
import { ingestionPayloadOf } from '../lib/format';
import { Message } from './Message';
import { ToolRow } from './ToolRow';
import { IngestionMapInline } from './IngestionMapInline';
import { PipelineChecklist } from './PipelineChecklist';
import { CheckpointInline } from './CheckpointInline';
import { RunHeader } from './RunHeader';
import { DataFramePreview } from './DataFramePreview';

type StreamItem =
  | { kind: 'message'; at: number; node: ChatMessage }
  | { kind: 'event'; at: number; node: BusinessEvent }
  | { kind: 'checkpoint'; at: number; node: Checkpoint };

export function ChatStream({
  run,
  expanded,
  onToggle,
  onDecision,
}: {
  run: RunRecord;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onDecision: (decision: ApprovalRequest['decision']) => void;
}) {
  const items: StreamItem[] = [];
  for (const msg of run.messages) {
    items.push({ kind: 'message', at: new Date(msg.createdAt).getTime(), node: msg });
  }
  for (const evt of run.events) {
    items.push({ kind: 'event', at: new Date(evt.createdAt).getTime(), node: evt });
  }
  for (const cp of run.checkpoints) {
    items.push({ kind: 'checkpoint', at: new Date(cp.createdAt).getTime(), node: cp });
  }
  items.sort((a, b) => a.at - b.at);

  const hasPipeline = run.events.length > 0 || Boolean(run.currentPhase);
  const groups = groupConsecutiveTools(items);

  return (
    <div className="stream">
      <RunHeader run={run} />
      {hasPipeline && <PipelineChecklist run={run} />}
      {groups.map((group, idx) => {
        if (group.kind === 'message') {
          return <Message key={group.node.id} message={group.node} />;
        }
        if (group.kind === 'checkpoint') {
          return <CheckpointInline key={group.node.id} checkpoint={group.node} onDecision={onDecision} />;
        }
        if (group.kind === 'tools') {
          return (
            <div className="toolgroup" key={`tools-${idx}`}>
              {group.events.map((evt) => {
                const payload = ingestionPayloadOf(evt);
                if (payload?.kind === 'ingestion-map') {
                  return <IngestionMapInline key={evt.id} event={evt} map={payload} />;
                }
                const previews = previewableEvidence(evt.evidence ?? []);
                return (
                  <React.Fragment key={evt.id}>
                    <ToolRow
                      event={evt}
                      expanded={expanded.has(evt.id)}
                      onToggle={() => onToggle(evt.id)}
                    />
                    {previews.map((item, pIdx) => (
                      <DataFramePreview
                        key={`${evt.id}-${item.id}`}
                        path={item.path}
                        label={item.label}
                        defaultOpen={pIdx === 0}
                      />
                    ))}
                  </React.Fragment>
                );
              })}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

type Group =
  | { kind: 'message'; node: ChatMessage }
  | { kind: 'tools'; events: BusinessEvent[] }
  | { kind: 'checkpoint'; node: Checkpoint };

const PREVIEWABLE_EXT = /\.(xlsx|xls|xlsm|csv|tsv|json|md|markdown|txt|log)$/i;

function previewableEvidence(items: EvidenceItem[]): EvidenceItem[] {
  return items.filter((item) => {
    if (item.kind === 'workbook' || item.kind === 'json') return true;
    if (item.kind === 'report' || item.kind === 'file' || item.kind === 'tool') {
      return PREVIEWABLE_EXT.test(item.path);
    }
    return false;
  });
}

function groupConsecutiveTools(items: StreamItem[]): Group[] {
  const result: Group[] = [];
  for (const item of items) {
    if (item.kind === 'event') {
      const last = result[result.length - 1];
      if (last && last.kind === 'tools') {
        last.events.push(item.node);
      } else {
        result.push({ kind: 'tools', events: [item.node] });
      }
    } else if (item.kind === 'message') {
      result.push({ kind: 'message', node: item.node });
    } else {
      result.push({ kind: 'checkpoint', node: item.node });
    }
  }
  return result;
}
