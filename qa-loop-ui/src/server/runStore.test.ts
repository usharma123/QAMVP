import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { businessEvent } from './businessEventMapper';
import { RunStore } from './runStore';

describe('RunStore', () => {
  test('persists run records and evidence', () => {
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-loop-ui-'));
    const store = new RunStore(repoRoot);
    const run = store.create('all');

    store.addEvent(
      run.id,
      businessEvent({
        runId: run.id,
        phase: 'publish_artifacts',
        rawLabel: 'export_test_case_repository.py',
        exitCode: 0,
        evidence: [
          {
            id: 'json-repo',
            label: 'Governed JSON repository',
            kind: 'json',
            path: '/tmp/test-case-repository.json',
            createdAt: new Date().toISOString()
          }
        ]
      })
    );

    const saved = JSON.parse(fs.readFileSync(store.runPath(run.id), 'utf-8'));
    expect(saved.evidence).toHaveLength(1);
    expect(saved.currentPhase).toBe('publish_artifacts');
  });

  test('resolves checkpoint approval', async () => {
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-loop-ui-'));
    const store = new RunStore(repoRoot);
    const run = store.create('TC-001');
    store.addCheckpoint(run.id, {
      title: 'Confirm execution readiness',
      message: 'Approve browser execution',
      options: ['approve', 'stop']
    });

    const waiting = store.waitForApproval(run.id);
    const resolved = store.resolveApproval(run.id, { decision: 'approve', note: 'ok' });
    const approval = await waiting;

    expect(resolved).toBe(true);
    expect(approval.decision).toBe('approve');
    expect(store.get(run.id)?.decisionRequired).toBe(false);
  });
});
