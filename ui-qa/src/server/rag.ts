import type { RunRecord } from '../shared/types';
import { cursorAgentWithTools } from './cursorAgent';
import { createKbToolRegistry, type KbToolHandlers } from './kbTools';

export function isTestcaseGenerationRequest(message: string): boolean {
  return /\b(create|generate|build|make|produce)\b[\s\S]{0,80}\b(test\s*cases?\.xlsx|testcases\.xlsx|test\s*case\s*workbook|test\s*cases?)\b/i.test(message);
}

export async function answerDocumentQuestion(
  run: RunRecord,
  question: string,
  handlers: KbToolHandlers = {},
): Promise<string> {
  const registry = createKbToolRegistry(run, handlers);
  return cursorAgentWithTools(run, question, registry, 'rag_ready');
}
