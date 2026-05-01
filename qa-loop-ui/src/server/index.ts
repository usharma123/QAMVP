import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { QaLoopOrchestrator } from './orchestrator';
import { RunStore } from './runStore';
import type { ApprovalRequest, CreateRunRequest } from '../shared/types';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.QAMVP_ROOT ? path.resolve(process.env.QAMVP_ROOT) : path.resolve(here, '../../..');
const port = Number(process.env.QA_LOOP_API_PORT || 4174);
const store = new RunStore(repoRoot);
const orchestrator = new QaLoopOrchestrator(repoRoot, store);
const clientDist = path.join(repoRoot, 'qa-loop-ui/dist/client');

const server = Bun.serve({
  hostname: '127.0.0.1',
  port,
  async fetch(request) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/health') return json({ ok: true, repoRoot });
      if (url.pathname === '/api/runs' && request.method === 'POST') {
        const body = (await readJson<CreateRunRequest>(request)) ?? {};
        const run = orchestrator.start(body);
        return json(run, 201);
      }
      const runMatch = url.pathname.match(/^\/api\/runs\/([^/]+)$/);
      if (runMatch && request.method === 'GET') {
        const run = store.get(runMatch[1]);
        return run ? json(run) : json({ error: 'Run not found' }, 404);
      }
      const eventMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/events$/);
      if (eventMatch && request.method === 'GET') {
        return eventStream(eventMatch[1]);
      }
      const approveMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/approve$/);
      if (approveMatch && request.method === 'POST') {
        const approval = await readJson<ApprovalRequest>(request);
        if (!approval) return json({ error: 'Missing approval payload' }, 400);
        const resumed = store.resolveApproval(approveMatch[1], approval);
        return json({ resumed });
      }
      const stopMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/stop$/);
      if (stopMatch && request.method === 'POST') {
        const resumed = store.resolveApproval(stopMatch[1], { decision: 'stop' });
        store.patch(stopMatch[1], { status: 'stopped', currentPhase: 'stopped', finishedAt: new Date().toISOString() });
        return json({ stopped: true, resumed });
      }
      if (url.pathname.startsWith('/api/')) return json({ error: 'Not found' }, 404);
      return staticFile(url.pathname);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : String(error) }, 500);
    }
  }
});

console.log(`QAMVP QA Loop UI API listening on http://127.0.0.1:${server.port}`);

function eventStream(runId: string): Response {
  const run = store.get(runId);
  if (!run) return json({ error: 'Run not found' }, 404);

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      send('run', run);
      const unsubscribe = store.subscribe(runId, (payload) => {
        if ('type' in payload && payload.type === 'run') send('run', payload.run);
        else send('business-event', payload);
      });
      const heartbeat = setInterval(() => send('heartbeat', { at: new Date().toISOString() }), 15_000);
      return () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  });
}

function staticFile(pathname: string): Response {
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(clientDist, safePath);
  const resolved = path.resolve(filePath);
  if (resolved.startsWith(clientDist) && fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
    return new Response(Bun.file(resolved));
  }
  const indexPath = path.join(clientDist, 'index.html');
  if (fs.existsSync(indexPath)) return new Response(Bun.file(indexPath), { headers: { 'Content-Type': 'text/html' } });
  return new Response('Run `bun run dev` for the Vite UI, or `bun run build` before production start.', { status: 404 });
}

async function readJson<T>(request: Request): Promise<T | undefined> {
  if (!request.headers.get('content-type')?.includes('application/json')) return undefined;
  return (await request.json()) as T;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
