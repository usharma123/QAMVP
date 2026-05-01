export type ClaudeInvocation = {
  prompt: string;
  cwd: string;
  dryRun?: boolean;
  onRawMessage?: (message: unknown) => void;
};

export type ClaudeResult = {
  prompt: string;
  transcript: string;
  rawMessages: unknown[];
  exitCode: number;
};

export async function invokeClaudeCommand(input: ClaudeInvocation): Promise<ClaudeResult> {
  if (input.dryRun) {
    return {
      prompt: input.prompt,
      transcript: `Dry run: Claude Agent SDK would invoke ${input.prompt}`,
      rawMessages: [],
      exitCode: 0
    };
  }

  try {
    const sdk = (await import('@anthropic-ai/claude-agent-sdk')) as any;
    const rawMessages: unknown[] = [];
    const transcript: string[] = [];
    const stream = sdk.query({
      prompt: input.prompt,
      options: {
        cwd: input.cwd,
        permissionMode: 'bypassPermissions'
      }
    });

    for await (const message of stream) {
      rawMessages.push(message);
      input.onRawMessage?.(message);
      const text = extractText(message);
      if (text) transcript.push(text);
    }

    return {
      prompt: input.prompt,
      transcript: transcript.join('\n'),
      rawMessages,
      exitCode: 0
    };
  } catch (error) {
    return {
      prompt: input.prompt,
      transcript: error instanceof Error ? error.message : String(error),
      rawMessages: [],
      exitCode: 1
    };
  }
}

function extractText(message: unknown): string {
  if (!message || typeof message !== 'object') return '';
  const data = message as any;
  if (typeof data.text === 'string') return data.text;
  if (typeof data.message?.content === 'string') return data.message.content;
  if (Array.isArray(data.message?.content)) {
    return data.message.content
      .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
      .filter(Boolean)
      .join('\n');
  }
  if (Array.isArray(data.content)) {
    return data.content
      .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
      .filter(Boolean)
      .join('\n');
  }
  return '';
}
