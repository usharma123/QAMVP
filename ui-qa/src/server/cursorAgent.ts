import type { RunRecord, WorkflowPhase } from '../shared/types';
import type { KbToolRegistry, ToolCallRequest, ToolExecutionResult } from './kbTools';
import { emit, QAMVP_ROOT, updateEvent } from './store';
import { stringifyError } from './transportWarnings';

type CursorAgentModule = {
  Agent: {
    create(input: unknown): Promise<{
      send(prompt: string): Promise<{
        stream(): AsyncIterable<unknown>;
      }>;
    }>;
  };
};

export async function cursorAgentMessage(
  run: RunRecord,
  prompt: string,
  phase: WorkflowPhase,
): Promise<string> {
  const event = await emit(run, phase, 'Cursor SDK agent', 'running', {
    technical: {
      rawLabel: `cursor:${phase}`,
      sdkPrompt: compactPromptForEvent(prompt),
      payload: { promptBytes: new TextEncoder().encode(prompt).length },
    },
  });

  if (!process.env.CURSOR_API_KEY || run.dryRun) {
    const fallback = run.dryRun
      ? 'Dry run: Cursor SDK call skipped.'
      : 'CURSOR_API_KEY is not set; used deterministic local workflow.';
    await updateEvent(run, event, 'warning', {
      summary: fallback,
      technical: { ...event.technical, stdout: fallback },
    });
    return fallback;
  }

  try {
    const { output, rawEvents, streamError } = await runCursorPrompt(prompt);
    if (output) {
      await updateEvent(run, event, streamError ? 'warning' : 'succeeded', {
        summary: streamError
          ? 'Cursor SDK returned output, but the stream closed with a transport warning.'
          : 'Cursor SDK call completed.',
        technical: {
          ...event.technical,
          stdout: output.slice(-12000),
          stderr: streamError,
          payload: { eventCount: rawEvents.length },
        },
      });
      return output;
    }

    if (streamError) throw new Error(streamError);
    await updateEvent(run, event, 'succeeded', {
      summary: 'Cursor SDK call completed without text output.',
      technical: { ...event.technical, stdout: rawEvents.join('\n').slice(-12000) },
    });
    return rawEvents.join('\n');
  } catch (error) {
    const message = formatSdkError(error);
    await updateEvent(run, event, 'warning', {
      summary: `Cursor SDK unavailable: ${message}`,
      technical: { ...event.technical, stderr: message },
    });
    return `Cursor SDK unavailable: ${message}`;
  }
}

function compactPromptForEvent(prompt: string): string {
  if (prompt.length <= 12000) return prompt;
  return `${prompt.slice(0, 6000)}\n\n...[prompt truncated for UI event storage]...\n\n${prompt.slice(-4000)}`;
}

export async function cursorAgentWithTools(
  run: RunRecord,
  userMessage: string,
  registry: KbToolRegistry,
  phase: WorkflowPhase = 'rag_ready',
): Promise<string> {
  const event = await emit(run, phase, 'Cursor SDK tool harness', 'running', {
    summary: 'Agent is deciding which KB tools to use.',
    technical: {
      rawLabel: `cursor-tools:${phase}`,
      sdkPrompt: userMessage,
      payload: { tools: registry.manifest.map((tool) => tool.name) },
    },
  });

  if (!process.env.CURSOR_API_KEY || run.dryRun) {
    const fallback = run.dryRun
      ? 'Dry run: Cursor SDK tool harness skipped.'
      : 'CURSOR_API_KEY is not set; the Cursor SDK harness cannot dynamically inspect the KB.';
    await updateEvent(run, event, 'warning', {
      summary: fallback,
      technical: { ...event.technical, stdout: fallback },
    });
    return fallback;
  }

  const transcript: Array<{ role: 'user' | 'assistant' | 'tool'; content: string }> = [
    { role: 'user', content: userMessage },
  ];
  const toolResults: ToolExecutionResult[] = [];
  let finalAnswer = '';

  try {
    for (let round = 0; round < 6; round += 1) {
      const prompt = buildToolHarnessPrompt(run, registry, transcript, round);
      const { output, streamError } = await runCursorPrompt(prompt);
      const assistant = output.trim();
      transcript.push({ role: 'assistant', content: assistant });
      const calls = extractToolCalls(assistant);

      if (calls.length === 0) {
        if (toolResults.length === 0) {
          transcript.push({
            role: 'tool',
            content:
              'No app tool call was made. You must use the JSON tool_calls protocol with at least one listed app tool before answering. Do not use or mention MCP, filesystem, terminal, browser, or workspace tools.',
          });
          continue;
        }
        finalAnswer = stripToolJson(assistant);
        await updateEvent(run, event, streamError ? 'warning' : 'succeeded', {
          summary: streamError
            ? 'Cursor SDK returned a final answer with a transport warning.'
            : 'Cursor SDK tool harness completed.',
          technical: {
            ...event.technical,
            stdout: finalAnswer.slice(-12000),
            stderr: streamError,
            payload: { toolResults },
          },
        });
        return finalAnswer;
      }

      const roundResults: ToolExecutionResult[] = [];
      for (const call of calls.slice(0, 4)) {
        const toolEvent = await emit(run, phase, `Tool ${call.name}`, 'running', {
          summary: call.purpose ?? 'Agent-requested KB tool call.',
          technical: {
            rawLabel: `tool:${call.name}`,
            toolName: call.name,
            payload: { arguments: maskToolArguments(call), purpose: call.purpose },
          },
        });
        const result = await registry.execute(call);
        roundResults.push(result);
        toolResults.push(result);
        await updateEvent(run, toolEvent, result.ok ? 'succeeded' : 'warning', {
          summary: result.ok ? summarizeToolResult(result) : result.error,
          technical: {
            ...toolEvent.technical,
            stdout: JSON.stringify(result.result ?? { error: result.error }, null, 2).slice(-12000),
            stderr: result.ok ? undefined : result.error,
            payload: result,
          },
        });
      }
      transcript.push({ role: 'tool', content: JSON.stringify(roundResults, null, 2) });
    }

    finalAnswer = await synthesizeFromToolBudget(userMessage, toolResults);
    await updateEvent(run, event, 'warning', {
      summary: finalAnswer,
      technical: { ...event.technical, stdout: finalAnswer, payload: { toolResults } },
    });
    return finalAnswer;
  } catch (error) {
    const message = formatSdkError(error);
    await updateEvent(run, event, 'warning', {
      summary: `Cursor SDK tool harness unavailable: ${message}`,
      technical: { ...event.technical, stderr: message, payload: { toolResults } },
    });
    return `Cursor SDK tool harness unavailable: ${message}`;
  }
}

async function runCursorPrompt(prompt: string): Promise<{
  output: string;
  rawEvents: string[];
  streamError?: string;
}> {
  const sdk = (await import('@cursor/sdk')) as unknown as CursorAgentModule;
  const agent = await sdk.Agent.create({
    apiKey: process.env.CURSOR_API_KEY,
    model: { id: process.env.CURSOR_AGENT_MODEL ?? 'composer-2' },
    local: { cwd: QAMVP_ROOT },
  });
  const sdkRun = await agent.send(prompt);
  const rawEvents: string[] = [];
  const assistantText: string[] = [];
  let streamError: string | undefined;

  try {
    for await (const chunk of sdkRun.stream()) {
      rawEvents.push(JSON.stringify(chunk));
      assistantText.push(...extractAssistantText(chunk));
    }
  } catch (error) {
    streamError = formatSdkError(error);
  }

  return {
    output: assistantText.join('').trim() || rawEvents.join('\n'),
    rawEvents,
    streamError,
  };
}

function buildToolHarnessPrompt(
  run: RunRecord,
  registry: KbToolRegistry,
  transcript: Array<{ role: 'user' | 'assistant' | 'tool'; content: string }>,
  round: number,
): string {
  const history = transcript
    .map((item) => `${item.role.toUpperCase()}:\n${item.content}`)
    .join('\n\n');
  return `You are the Cursor SDK harness for a bank QA document knowledge base.

You have read/query access through these application tools:
${JSON.stringify(registry.manifest, null, 2)}

Run state:
${JSON.stringify(
  {
    runId: run.id,
    status: run.status,
    currentPhase: run.currentPhase,
    uploads: run.uploads.map((upload) => ({ name: upload.originalName, type: upload.documentType })),
    generatedSpecPath: run.generatedSpecPath,
  },
  null,
  2,
)}

Rules:
- You are the reasoning harness. Decide which tools are needed.
- Before answering any KB/content/traceability question, call at least one tool.
- The only tools you have are the listed JSON app tools. Do not mention MCP tools, terminal tools, workspace search, browser tools, or filesystem tools.
- BRD, FRS, HLD, and LLD are versioned documents. Use inspect_document_versions when baseline/version state matters.
- For requirement coverage, unmapped items, or RTM questions, prefer inspect_requirements and inspect_rtm before raw SQL.
- For “most linked business requirement” or BRD linkage questions, use inspect_business_requirement_links first.
- For ranking/count/linkage questions, prefer purpose-built inspect_* tools before query_kb_sql. Do not invent tables; allowed SQL tables are documents, chunks, entities, relationships, source_document_versions, requirements, requirement_links, rtm_rows, test_cases, test_case_steps.
- For normal document questions, use search_kb_chunks and cite returned chunks.
- For TestCases.xlsx generation, inspect_rtm first, then call generate_testcases_from_kb, then audit_testcase_traceability if needed. Generated steps must be executable Playwright/browser actions; never ask the generator to create "review RTM", "confirm mapped requirements", or "capture evidence" testcase steps.
- If the user asks you to test or run unsafe SQL, call query_kb_sql with the requested SQL so the application guardrail can reject it, then explain the rejection.
- Do not rely on mock webapp source code.
- If you need data, respond ONLY with a JSON object in this exact shape:
  {"tool_calls":[{"name":"tool_name","purpose":"why","arguments":{}}]}
- If you have enough data, respond in normal Markdown with concise reasoning, citations, and method.
- Do not include a tool_calls object in a final answer.

Round: ${round + 1}

Conversation and tool results:
${history}`;
}

function extractToolCalls(output: string): ToolCallRequest[] {
  const candidates = [output, ...[...output.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((match) => match[1])];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate.trim()) as { tool_calls?: ToolCallRequest[] };
      if (Array.isArray(parsed.tool_calls)) {
        return parsed.tool_calls
          .filter((call) => typeof call?.name === 'string')
          .map((call) => ({ name: call.name, purpose: call.purpose, arguments: call.arguments ?? {} }));
      }
    } catch {
      // Try the next JSON candidate.
    }
  }
  return [];
}

async function synthesizeFromToolBudget(userMessage: string, toolResults: ToolExecutionResult[]): Promise<string> {
  const usefulResults = toolResults.filter((result) => result.ok);
  if (usefulResults.length === 0) {
    return 'I tried to inspect the KB, but the available tool calls did not return usable data. The last tool errors are visible above.';
  }

  try {
    const { output } = await runCursorPrompt(`You are writing the final answer for a bank QA KB question after tool execution has stopped.

Question:
${userMessage}

Tool results:
${JSON.stringify(usefulResults.slice(-10), null, 2)}

Instructions:
- Do not call more tools.
- Answer directly from these tool results.
- If ranked rows are present, provide a ranked table and explain the method.
- Mention any rejected/failed tool calls only if relevant.
- Be concise.`);
    const answer = stripToolJson(output.trim());
    if (answer) return answer;
  } catch {
    // Fall through to deterministic summary below.
  }

  let latestRows: { rows?: unknown[]; rowCount?: number; purpose?: string } | undefined;
  for (let index = usefulResults.length - 1; index >= 0; index -= 1) {
    const candidate = usefulResults[index].result as { rows?: unknown[]; rowCount?: number; purpose?: string } | undefined;
    if (Array.isArray(candidate?.rows) && candidate.rows.length > 0) {
      latestRows = candidate;
      break;
    }
  }
  if (latestRows?.rows?.length) {
    return `I inspected the KB and found ${latestRows.rows.length} relevant row(s). Here are the top results:\n\n\`\`\`json\n${JSON.stringify(latestRows.rows.slice(0, 10), null, 2)}\n\`\`\``;
  }
  return `I inspected the KB with ${usefulResults.length} successful tool call(s), but no ranked rows were returned. Check the expanded tool output for details.`;
}

function stripToolJson(output: string): string {
  return output.replace(/```(?:json)?\s*\{[\s\S]*?"tool_calls"[\s\S]*?\}\s*```/gi, '').trim() || output.trim();
}

function maskToolArguments(call: ToolCallRequest): Record<string, unknown> {
  if (call.name !== 'query_kb_sql') return call.arguments ?? {};
  const args = { ...(call.arguments ?? {}) };
  if (typeof args.sql === 'string') {
    args.sql = args.sql.replace(/\s+/g, ' ').trim().slice(0, 600);
  }
  return args;
}

function summarizeToolResult(result: ToolExecutionResult): string {
  const payload = result.result as { count?: number; rowCount?: number; rows?: unknown[] } | undefined;
  if (typeof payload?.count === 'number') return `${result.tool} returned ${payload.count} item(s).`;
  if (typeof payload?.rowCount === 'number') return `${result.tool} returned ${payload.rowCount} row(s).`;
  if (Array.isArray(payload?.rows)) return `${result.tool} returned ${payload.rows.length} row(s).`;
  return `${result.tool} completed.`;
}

function extractAssistantText(chunk: unknown): string[] {
  const candidate = chunk as {
    type?: string;
    message?: { content?: Array<{ type?: string; text?: string }> };
  };
  if (candidate.type !== 'assistant' || !Array.isArray(candidate.message?.content)) return [];
  return candidate.message.content
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text as string);
}

function formatSdkError(error: unknown): string {
  if (!(error instanceof Error)) return stringifyError(error);
  const parts = [error.name, error.message].filter(Boolean);
  const cause = (error as Error & { cause?: unknown }).cause;
  if (cause instanceof Error) {
    parts.push(`cause=${cause.name}: ${cause.message}`);
  } else if (cause) {
    parts.push(`cause=${String(cause)}`);
  }
  if (error.stack) {
    parts.push(error.stack.split('\n').slice(0, 4).join('\n'));
  }
  return parts.join('\n');
}
