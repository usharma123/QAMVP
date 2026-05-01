import fs from 'node:fs';
import path from 'node:path';
import type { EvidenceItem, EvidenceKind } from '../shared/types';

export function collectEvidence(repoRoot: string): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  addIfExists(items, repoRoot, 'test-doc/test-case-repository.json', 'Governed JSON repository', 'json');
  addIfExists(items, repoRoot, 'test-doc/09-test-case-repository.md', 'Business test repository Markdown', 'markdown');
  addIfExists(items, repoRoot, 'test_data/TestCases.xlsx', 'Executable test workbook', 'workbook');

  const resultsRoot = path.join(repoRoot, 'test_data/test-results');
  for (const pattern of [
    /^ingestion_audit_.*\.md$/,
    /^ingestion_audit_.*\.json$/,
    /^ingestion_heal_.*\.md$/,
    /^audit_.*\.md$/,
    /^audit_.*\.json$/
  ]) {
    for (const file of latestFiles(resultsRoot, pattern, 3)) {
      const kind: EvidenceKind = file.endsWith('.json') ? 'json' : 'report';
      addPath(items, file, labelFor(file), kind);
    }
  }

  for (const tcDir of listDirs(resultsRoot).filter((dir) => /^TC-\d+$/.test(path.basename(dir)))) {
    for (const runDir of listDirs(tcDir).filter((dir) => /^playwright_\d{8}_\d{6}$/.test(path.basename(dir))).slice(-2)) {
      addPath(items, runDir, `${path.basename(tcDir)} Playwright evidence`, 'folder');
      addIfExists(items, runDir, 'result.json', `${path.basename(tcDir)} result JSON`, 'json', false);
      addIfExists(items, runDir, 'trace.zip', `${path.basename(tcDir)} trace`, 'trace', false);
    }
  }

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function addIfExists(
  items: EvidenceItem[],
  root: string,
  relativePath: string,
  label: string,
  kind: EvidenceKind,
  repoRelative = true
): void {
  const filePath = path.join(root, relativePath);
  if (fs.existsSync(filePath)) addPath(items, filePath, label, kind, repoRelative ? relativePath : undefined);
}

function addPath(items: EvidenceItem[], filePath: string, label: string, kind: EvidenceKind, idSeed = filePath): void {
  const stat = fs.statSync(filePath);
  items.push({
    id: stableId(idSeed),
    label,
    kind,
    path: filePath,
    createdAt: stat.mtime.toISOString()
  });
}

function latestFiles(root: string, pattern: RegExp, limit: number): string[] {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(root, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
    .slice(0, limit);
}

function listDirs(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root)
    .map((name) => path.join(root, name))
    .filter((item) => fs.existsSync(item) && fs.statSync(item).isDirectory());
}

function labelFor(filePath: string): string {
  const name = path.basename(filePath);
  if (name.startsWith('ingestion_audit_')) return 'Ingestion audit gate report';
  if (name.startsWith('ingestion_heal_')) return 'Ingestion remediation report';
  if (name.startsWith('audit_')) return 'Independent QA audit report';
  return name;
}

function stableId(value: string): string {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `ev_${hash.toString(16)}`;
}
