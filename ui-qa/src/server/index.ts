import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { ApprovalRequest, ChatMessage, ChatRequest, StartRunRequest, UploadedSource } from '../shared/types';
import { installTransportWarningHandlers } from './transportWarnings';
import { saveUpload } from './uploads';
import { approvals, generateTestCasesFromKb, runWorkflow } from './workflow';
import { answerDocumentQuestion } from './rag';
import { readPreview } from './preview';
import {
  assertRun,
  createRun,
  ensureStorage,
  id,
  listeners,
  now,
  persist,
  QAMVP_ROOT,
  runs,
  stopFlags,
  UI_QA_ROOT,
  type Listener,
} from './store';

const PORT = Number(process.env.UI_QA_API_PORT ?? 4175);

installTransportWarningHandlers();

function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
}

async function handleUpload(req: Request, runId: string): Promise<Response> {
  const run = assertRun(runId);
  const form = await req.formData();
  const saved: UploadedSource[] = [];
  for (const value of Array.from(form.values())) {
    if (typeof value === 'object' && value !== null && 'arrayBuffer' in value && 'name' in value) {
      saved.push(await saveUpload(run, value as File));
    }
  }
  await persist(run);
  return json({ uploads: saved, run });
}

async function handleChat(req: Request): Promise<Response> {
  const body = (await req.json()) as ChatRequest;
  const run = body.runId ? assertRun(body.runId) : createRun({ scope: 'chat', dryRun: false, autoApprove: false });
  if (!runs.has(run.id)) await persist(run);

  const userMessage: ChatMessage = {
    id: id('msg'),
    runId: run.id,
    role: 'user',
    content: body.message,
    createdAt: now(),
  };
  run.messages.push(userMessage);
  await persist(run);

  const response = await answerDocumentQuestion(run, body.message, {
    generateTestCases: async () => {
      const spec = await generateTestCasesFromKb(run);
      return spec
        ? {
            generated: true,
            cases: spec.cases.length,
            workbook: run.dryRun ? `test_data/ui-qa/generated/${run.id}/TestCases.generated.xlsx` : 'test_data/TestCases.xlsx',
            blockerCount: run.blockerCount ?? 0,
            auditVerdict: run.blockerCount ? 'blocked' : 'approved',
          }
        : { generated: false, blockerCount: run.blockerCount ?? 0 };
    },
    auditTraceability: async () => ({
      blockerCount: run.blockerCount ?? 0,
      findingCounts: run.findingCounts,
      auditEvidence: run.evidence.filter((item) => item.phase === 'audit_generated_tests').slice(-5),
    }),
  });
  const assistant: ChatMessage = {
    id: id('msg'),
    runId: run.id,
    role: 'assistant',
    content: response.slice(-4000),
    createdAt: now(),
  };
  run.messages.push(assistant);
  await persist(run);
  return json({ run, message: assistant });
}

async function servePreview(url: URL): Promise<Response> {
  const rawPath = url.searchParams.get('path');
  if (!rawPath) return json({ error: 'path required' }, { status: 400 });
  const sheet = url.searchParams.get('sheet') ?? undefined;
  const limit = Number(url.searchParams.get('limit') ?? '') || undefined;
  const offset = Number(url.searchParams.get('offset') ?? '') || undefined;
  try {
    const preview = await readPreview(rawPath, { sheet, limit, offset });
    return json(preview);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'not_found') return json({ error: 'not_found' }, { status: 404 });
    if (message === 'unsupported') return json({ error: 'unsupported' }, { status: 415 });
    return json({ error: message }, { status: 500 });
  }
}

async function serveArtifact(pathname: string): Promise<Response> {
  const artifact = decodeURIComponent(pathname.replace('/api/artifacts/', ''));
  const target = path.resolve(QAMVP_ROOT, artifact);
  if (!target.startsWith(QAMVP_ROOT)) return new Response('Forbidden', { status: 403 });
  if (!existsSync(target)) return new Response('Not found', { status: 404 });
  const stats = Bun.file(target);
  if ((await stats.exists()) && target.endsWith('/')) return json({ entries: await readdir(target) });
  return new Response(stats);
}

function streamRun(runId: string): Response {
  const run = assertRun(runId);
  const encoder = new TextEncoder();
  let listener: Listener | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (type: string, payload: unknown) => {
        controller.enqueue(encoder.encode(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`));
      };
      send('run', run);
      listener = (next, event) => {
        send('run', next);
        if (event) send('business-event', event);
      };
      if (!listeners.has(runId)) listeners.set(runId, new Set());
      listeners.get(runId)!.add(listener);
    },
    cancel() {
      if (listener) listeners.get(runId)?.delete(listener);
    },
  });
  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    },
  });
}

async function serveStatic(pathname: string): Promise<Response> {
  const clientRoot = path.join(UI_QA_ROOT, 'dist/client');
  const candidate = pathname === '/' ? path.join(clientRoot, 'index.html') : path.join(clientRoot, pathname);
  const target = path.resolve(candidate);
  if (target.startsWith(clientRoot) && existsSync(target)) return new Response(await readFile(target));
  const index = path.join(clientRoot, 'index.html');
  if (existsSync(index)) {
    return new Response(await readFile(index), { headers: { 'content-type': 'text/html' } });
  }
  return new Response('ui-qa API is running. Start the Vite dev server for the UI.', {
    headers: { 'content-type': 'text/plain' },
  });
}

async function router(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const { pathname } = url;

    if (pathname === '/api/health') return json({ ok: true, root: QAMVP_ROOT });
    if (pathname === '/api/runs' && req.method === 'POST') {
      const input = (await req.json().catch(() => ({}))) as StartRunRequest;
      const run = createRun(input);
      await persist(run);
      if (!input.deferStart) void runWorkflow(run);
      return json(run);
    }
    const runMatch = pathname.match(/^\/api\/runs\/([^/]+)$/);
    if (runMatch && req.method === 'GET') return json(assertRun(runMatch[1]));

    const startMatch = pathname.match(/^\/api\/runs\/([^/]+)\/start$/);
    if (startMatch && req.method === 'POST') {
      const run = assertRun(startMatch[1]);
      if (run.status === 'created' || run.status === 'stopped' || run.status === 'blocked') {
        stopFlags.delete(run.id);
        void runWorkflow(run);
      }
      return json(run);
    }

    const generateMatch = pathname.match(/^\/api\/runs\/([^/]+)\/generate-testcases$/);
    if (generateMatch && req.method === 'POST') {
      const run = assertRun(generateMatch[1]);
      void generateTestCasesFromKb(run);
      return json(run);
    }

    const uploadMatch = pathname.match(/^\/api\/runs\/([^/]+)\/uploads$/);
    if (uploadMatch && req.method === 'POST') return handleUpload(req, uploadMatch[1]);

    const approveMatch = pathname.match(/^\/api\/runs\/([^/]+)\/approve$/);
    if (approveMatch && req.method === 'POST') {
      const run = assertRun(approveMatch[1]);
      const approval = (await req.json()) as ApprovalRequest;
      const checkpoint = run.checkpoints.find((item) => !item.resolvedAt);
      if (checkpoint) {
        checkpoint.resolvedAt = now();
        checkpoint.decision = approval.decision;
        checkpoint.note = approval.note;
      }
      if (approval.scope) run.scope = approval.scope;
      approvals.get(run.id)?.(approval);
      await persist(run);
      return json(run);
    }

    const stopMatch = pathname.match(/^\/api\/runs\/([^/]+)\/stop$/);
    if (stopMatch && req.method === 'POST') {
      const run = assertRun(stopMatch[1]);
      stopFlags.add(run.id);
      run.status = 'stopped';
      await persist(run);
      return json(run);
    }

    const eventMatch = pathname.match(/^\/api\/runs\/([^/]+)\/events$/);
    if (eventMatch && req.method === 'GET') return streamRun(eventMatch[1]);
    if (pathname === '/api/chat' && req.method === 'POST') return handleChat(req);
    if (pathname === '/api/preview' && req.method === 'GET') return servePreview(url);
    if (pathname.startsWith('/api/artifacts/')) return serveArtifact(pathname);

    return serveStatic(pathname);
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, { status: 500 });
  }
}

await ensureStorage();
Bun.serve({ port: PORT, hostname: '127.0.0.1', fetch: router });
console.log(`ui-qa API listening on http://127.0.0.1:${PORT}`);
