import type { Page, TestInfo } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import type { TestCase, TestStep } from './repository';

export type StepArtifact = {
  stepNumber: number;
  requirementId: string;
  description: string;
  expectedOutput: string;
  testData: string;
  status: 'PASS' | 'FAIL' | 'BLOCKED_UNMAPPED_STEP';
  actual: string;
  screenshot?: string;
  error?: string;
};

export class RunArtifacts {
  readonly steps: StepArtifact[] = [];
  private readonly startedAt = new Date();

  constructor(
    readonly testCase: TestCase,
    readonly artifactDir: string,
    readonly runId: string,
    readonly baseURL: string,
    readonly testInfo: TestInfo
  ) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  async screenshot(page: Page, step: TestStep, label: string): Promise<string | undefined> {
    const safeLabel = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const filePath = path.join(this.artifactDir, `step_${String(step.step_number).padStart(2, '0')}_${safeLabel}.png`);
    try {
      await page.screenshot({ path: filePath, fullPage: true, timeout: 10_000 });
      return filePath;
    } catch {
      return undefined;
    }
  }

  record(step: TestStep, status: StepArtifact['status'], actual: string, screenshot?: string, error?: unknown): void {
    this.steps.push({
      stepNumber: step.step_number,
      requirementId: step.requirement_id,
      description: step.step_description,
      expectedOutput: step.expected_output || '',
      testData: step.test_data || '',
      status,
      actual,
      screenshot,
      error: error instanceof Error ? error.message : error ? String(error) : undefined
    });
  }

  async writeFinal(page: Page, verdict: 'PASS' | 'FAIL' | 'BLOCKED'): Promise<void> {
    const finalTextPath = path.join(this.artifactDir, 'final-page-text.txt');
    const finalText = await page.locator('body').innerText().catch((error) => `Unable to read body text: ${error}`);
    fs.writeFileSync(finalTextPath, finalText, 'utf-8');
    const finishedAt = new Date();

    const manifest = {
      runId: this.runId,
      testCaseId: this.testCase.test_case_id,
      title: this.testCase.title,
      verdict,
      baseURL: this.baseURL,
      workerIndex: this.testInfo.workerIndex,
      project: this.testInfo.project.name,
      startedAt: this.startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - this.startedAt.getTime(),
      artifactDir: this.artifactDir,
      sourceRepository: 'test-doc/test-case-repository.json',
      sourceWorkbook: 'test_data/TestCases.xlsx',
      blackBoxPolicy: {
        webappSourceInspected: false,
        angularInternalsUsed: false,
        oracle: 'hard docs + KB/DB artifacts + workbook + observable browser behavior'
      },
      artifacts: {
        resultJson: path.join(this.artifactDir, 'result.json'),
        stepLog: path.join(this.artifactDir, 'step-log.md'),
        finalPageText: finalTextPath,
        trace: path.join(this.artifactDir, 'trace.zip')
      }
    };

    const result = {
      ...manifest,
      steps: this.steps
    };

    fs.writeFileSync(path.join(this.artifactDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
    fs.writeFileSync(path.join(this.artifactDir, 'result.json'), JSON.stringify(result, null, 2) + '\n', 'utf-8');
    fs.writeFileSync(path.join(this.artifactDir, 'step-log.md'), this.markdown(verdict), 'utf-8');
  }

  private markdown(verdict: string): string {
    const lines = [
      `# Playwright Test Run: ${this.testCase.test_case_id}`,
      '',
      `| Field | Value |`,
      `|---|---|`,
      `| Run ID | ${this.runId} |`,
      `| Test Case | ${this.testCase.test_case_id} |`,
      `| Title | ${escapeCell(this.testCase.title)} |`,
      `| Execution Method | Playwright black-box runner |`,
      `| Overall Verdict | ${verdict} |`,
      `| Artifact Directory | ${this.artifactDir} |`,
      '',
      '## Step Results',
      '',
      '| Step | Requirement | Description | Expected | Actual | Verdict | Screenshot |',
      '|---:|---|---|---|---|---|---|'
    ];

    for (const step of this.steps) {
      lines.push(
        `| ${step.stepNumber} | ${escapeCell(step.requirementId)} | ${escapeCell(step.description)} | ${escapeCell(
          step.expectedOutput
        )} | ${escapeCell(step.actual)} | ${step.status} | ${step.screenshot ? `\`${step.screenshot}\`` : ''} |`
      );
    }

    const blocked = this.steps.filter((step) => step.status === 'BLOCKED_UNMAPPED_STEP');
    if (blocked.length) {
      lines.push('', '## Blocked Steps', '');
      for (const step of blocked) {
        lines.push(`- Step ${step.stepNumber}: ${step.description}`);
      }
    }

    return `${lines.join('\n')}\n`;
  }
}

function escapeCell(value: string): string {
  return String(value || '').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}
