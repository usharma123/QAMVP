import fs from 'node:fs';
import path from 'node:path';

export type TestStep = {
  requirement_id: string;
  step_number: number;
  step_description: string;
  expected_output?: string;
  test_data?: string;
};

export type TestCase = {
  test_case_id: string;
  title: string;
  objective: string;
  priority?: string;
  suite?: string;
  tags?: string[];
  steps: TestStep[];
};

export type RepositorySpec = {
  document_id?: string;
  version?: string;
  status?: string;
  title?: string;
  cases: TestCase[];
};

export const rootDir = process.env.QAMVP_ROOT
  ? path.resolve(process.env.QAMVP_ROOT)
  : path.resolve(__dirname, '../..');

export const runId = process.env.PLAYWRIGHT_RUN_ID || timestamp();

export function loadRepository(): RepositorySpec {
  const specPath = process.env.TEST_CASE_REPOSITORY
    ? path.resolve(process.env.TEST_CASE_REPOSITORY)
    : path.join(rootDir, 'test-doc/test-case-repository.json');
  const payload = JSON.parse(fs.readFileSync(specPath, 'utf-8')) as RepositorySpec;
  if (!Array.isArray(payload.cases) || payload.cases.length === 0) {
    throw new Error(`${specPath} does not contain any test cases.`);
  }
  return payload;
}

export function selectedCases(spec: RepositorySpec): TestCase[] {
  const selected = (process.env.TC_ID || process.env.TEST_CASE_ID || 'all').trim().toUpperCase();
  if (!selected || selected === 'ALL') {
    return spec.cases;
  }
  return spec.cases.filter((testCase) => testCase.test_case_id.toUpperCase() === selected);
}

export function artifactDirFor(testCaseId: string): string {
  return path.join(rootDir, 'test_data/test-results', testCaseId, `playwright_${runId}`);
}

function timestamp(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(
    now.getMinutes()
  )}${pad(now.getSeconds())}`;
}
