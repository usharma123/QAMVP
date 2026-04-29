import { expect, test } from '@playwright/test';
import { classifyStep } from '../src/stepClassifier';
import { loadRepository } from '../src/repository';

test('all current KB test-case steps have deterministic Playwright mappings', () => {
  const spec = loadRepository();
  const unmapped = spec.cases.flatMap((testCase) =>
    testCase.steps
      .filter((step) => classifyStep(step) === 'unmapped')
      .map((step) => `${testCase.test_case_id} step ${step.step_number}: ${step.step_description}`)
  );

  expect(unmapped, `Unmapped steps:\n${unmapped.join('\n')}`).toEqual([]);
});
