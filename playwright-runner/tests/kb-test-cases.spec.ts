import { expect, test } from '@playwright/test';
import path from 'node:path';
import { RunArtifacts } from '../src/artifacts';
import { artifactDirFor, loadRepository, runId, selectedCases } from '../src/repository';
import { resetBrowserState } from '../src/blackBoxActions';
import { BlockedUnmappedStep, executeStep } from '../src/stepInterpreter';

const spec = loadRepository();
const cases = selectedCases(spec);

if (cases.length === 0) {
  throw new Error(`No test cases matched ${process.env.TC_ID || process.env.TEST_CASE_ID || 'all'}.`);
}

test.describe.configure({ mode: 'parallel' });

for (const testCase of cases) {
  test(`${testCase.test_case_id}: ${testCase.title}`, async ({ page, context, baseURL }, testInfo) => {
    const artifactDir = artifactDirFor(testCase.test_case_id);
    const artifacts = new RunArtifacts(testCase, artifactDir, runId, baseURL || 'http://localhost:4200', testInfo);
    let verdict: 'PASS' | 'FAIL' | 'BLOCKED' = 'PASS';

    await context.tracing.start({ screenshots: true, snapshots: true, sources: false });

    try {
      await resetBrowserState(page);

      for (const step of testCase.steps) {
        try {
          const actual = await executeStep(page, step);
          const screenshot = await artifacts.screenshot(page, step, 'pass');
          artifacts.record(step, 'PASS', actual, screenshot);
        } catch (error) {
          const screenshot = await artifacts.screenshot(page, step, error instanceof BlockedUnmappedStep ? 'blocked' : 'fail');
          if (error instanceof BlockedUnmappedStep) {
            verdict = 'BLOCKED';
            artifacts.record(step, 'BLOCKED_UNMAPPED_STEP', error.message, screenshot, error);
            break;
          }
          verdict = 'FAIL';
          artifacts.record(step, 'FAIL', 'Step execution failed.', screenshot, error);
          break;
        }
      }
    } finally {
      await page.locator('body').innerText().catch(() => '');
      await artifacts.writeFinal(page, verdict);
      await context.tracing.stop({ path: path.join(artifactDir, 'trace.zip') }).catch(() => undefined);
    }

    expect(verdict, `See artifacts in ${artifactDir}`).toBe('PASS');
  });
}
