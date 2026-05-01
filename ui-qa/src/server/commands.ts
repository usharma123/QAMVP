import { spawn } from 'node:child_process';
import type { RunRecord, WorkflowPhase } from '../shared/types';
import { DATABASE_URL, emit, QAMVP_ROOT, updateEvent } from './store';

export interface CommandResult {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function runCommand(
  run: RunRecord,
  phase: WorkflowPhase,
  title: string,
  command: string,
  options: {
    cwd?: string;
    env?: Record<string, string>;
    allowFailure?: boolean;
    dryRunOk?: boolean;
  } = {},
): Promise<CommandResult> {
  const event = await emit(run, phase, title, 'running', {
    technical: { rawLabel: title, command },
  });

  if (run.dryRun && options.dryRunOk !== false) {
    const result = { command, stdout: '[dry-run] command skipped\n', stderr: '', exitCode: 0 };
    await updateEvent(run, event, 'succeeded', {
      summary: 'Dry run skipped command execution.',
      technical: { ...event.technical, ...result },
    });
    return result;
  }

  const result = await new Promise<CommandResult>((resolve) => {
    const child = spawn('/bin/zsh', ['-lc', command], {
      cwd: options.cwd ?? QAMVP_ROOT,
      env: { ...process.env, DATABASE_URL, ...options.env },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('close', (code) => resolve({ command, stdout, stderr, exitCode: code ?? 0 }));
  });

  const ok = result.exitCode === 0 || options.allowFailure;
  await updateEvent(run, event, ok ? 'succeeded' : 'failed', {
    summary: ok ? undefined : `Command failed with exit code ${result.exitCode}.`,
    technical: { ...event.technical, ...result },
  });

  if (!ok) {
    throw new Error(`${title} failed with exit code ${result.exitCode}: ${result.stderr || result.stdout}`);
  }

  return result;
}
