import React from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { DataFramePreview } from '../components/DataFramePreview';

const components: Components = {
  a: ({ node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
  table: ({ node, ...props }) => (
    <div className="md-table-wrap">
      <table {...props} />
    </div>
  ),
  pre: ({ node, ...props }) => <pre className="md-pre" {...props} />,
  code: ({ node, className, children, ...props }) => {
    const inline = !className || !/language-/.test(className);
    if (inline) {
      return <code className="md-code-inline" {...props}>{children}</code>;
    }
    return <code className={className} {...props}>{children}</code>;
  },
};

const SHORTCODE = /\[(xlsx|csv|json|md):([^\]\s][^\]]*)\]/g;

type Segment =
  | { kind: 'text'; value: string }
  | { kind: 'embed'; tag: 'xlsx' | 'csv' | 'json' | 'md'; path: string };

function splitShortcodes(input: string): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  SHORTCODE.lastIndex = 0;
  while ((match = SHORTCODE.exec(input)) !== null) {
    if (match.index > cursor) {
      segments.push({ kind: 'text', value: input.slice(cursor, match.index) });
    }
    segments.push({
      kind: 'embed',
      tag: match[1] as Segment extends { kind: 'embed'; tag: infer T } ? T : never,
      path: match[2].trim(),
    });
    cursor = match.index + match[0].length;
  }
  if (cursor < input.length) {
    segments.push({ kind: 'text', value: input.slice(cursor) });
  }
  return segments;
}

export function Markdown({ children }: { children: string }) {
  const segments = splitShortcodes(children);

  if (segments.length === 1 && segments[0].kind === 'text') {
    return (
      <div className="md">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
          components={components}
        >
          {children}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="md">
      {segments.map((seg, idx) => {
        if (seg.kind === 'text') {
          if (!seg.value.trim()) return null;
          return (
            <ReactMarkdown
              key={idx}
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
              components={components}
            >
              {seg.value}
            </ReactMarkdown>
          );
        }
        return <DataFramePreview key={idx} path={seg.path} defaultOpen />;
      })}
    </div>
  );
}
