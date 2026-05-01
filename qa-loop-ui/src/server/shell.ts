export type ShellResult = {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
};

export async function runShell(command: string, cwd: string, env: Record<string, string> = {}, dryRun = false): Promise<ShellResult> {
  if (dryRun) {
    return {
      command,
      stdout: `Dry run: ${command}`,
      stderr: '',
      exitCode: 0
    };
  }

  const proc = Bun.spawn(['/bin/zsh', '-lc', command], {
    cwd,
    env: { ...process.env, ...env },
    stdout: 'pipe',
    stderr: 'pipe'
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited
  ]);

  return { command, stdout, stderr, exitCode };
}
