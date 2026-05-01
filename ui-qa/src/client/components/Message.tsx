import React from 'react';
import type { ChatMessage } from '../../shared/types';
import { formatTime } from '../lib/format';
import { Markdown } from '../lib/markdown';

export function Message({ message }: { message: ChatMessage }) {
  const role = message.role;
  const label =
    role === 'assistant' ? 'QA Agent' : role === 'user' ? 'You' : role === 'system' ? 'System' : 'Tool';
  const glyph = role === 'assistant' ? 'Q' : role === 'user' ? 'U' : role === 'system' ? '·' : 'T';

  return (
    <div className={`msg msg--${role}`}>
      <div className="msg__gutter" aria-hidden>{glyph}</div>
      <div className="msg__col">
        <div className="msg__byline">
          <span className="msg__role">{label}</span>
          <span className="msg__sep">·</span>
          <span className="msg__time">{formatTime(new Date(message.createdAt))}</span>
        </div>
        <div className="msg__body">
          <Markdown>{message.content}</Markdown>
        </div>
      </div>
    </div>
  );
}
