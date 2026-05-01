import { describe, expect, test } from 'bun:test';
import { businessEvent } from './businessEventMapper';

describe('businessEvent', () => {
  test('maps raw database command to business language', () => {
    const event = businessEvent({
      runId: 'run-1',
      phase: 'prepare_kb',
      rawLabel: 'pg_isready',
      command: '/opt/homebrew/bin/pg_isready -h localhost -p 5433 -U ingestion -d ingestion',
      exitCode: 0
    });

    expect(event.title).toBe('Checking knowledge base availability');
    expect(event.summary).toBe('The QA knowledge base is available.');
    expect(event.status).toBe('succeeded');
    expect(event.technical?.command).toContain('pg_isready');
  });

  test('maps Claude audit slash command to approval review language', () => {
    const event = businessEvent({
      runId: 'run-1',
      phase: 'audit_run',
      rawLabel: '/audit-test-run test_data/test-results',
      sdkPrompt: '/audit-test-run test_data/test-results',
      status: 'running'
    });

    expect(event.title).toBe('Performing independent QA approval review');
    expect(event.summary).toBe('Auditing source alignment, execution evidence, and approval readiness.');
    expect(event.technical?.sdkPrompt).toBe('/audit-test-run test_data/test-results');
  });

  test('keeps raw output out of business summary', () => {
    const event = businessEvent({
      runId: 'run-1',
      phase: 'execute_browser',
      rawLabel: 'npx playwright test',
      command: 'npx playwright test --config playwright.config.ts',
      stderr: 'raw technical failure',
      exitCode: 1
    });

    expect(event.title).toBe('Executing browser validation');
    expect(event.summary).not.toContain('npx');
    expect(event.summary).not.toContain('raw technical failure');
    expect(event.technical?.stderr).toBe('raw technical failure');
  });
});
