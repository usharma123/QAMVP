import { existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { QAMVP_ROOT } from './store';

const MAX_LIMIT = 1000;
const DEFAULT_LIMIT = 100;
const CELL_TRUNCATE = 240;
const CACHE_MAX = 16;

type SheetSnapshot = {
  name: string;
  columns: string[];
  rows: unknown[][];
  totalRows: number;
};

type WorkbookSnapshot = {
  kind: 'xlsx';
  sheets: SheetSnapshot[];
};

type CsvSnapshot = {
  kind: 'csv';
  sheets: [SheetSnapshot];
};

type JsonSnapshot = {
  kind: 'json';
  json: unknown;
};

type MarkdownSnapshot = {
  kind: 'md' | 'text';
  text: string;
};

type Snapshot = WorkbookSnapshot | CsvSnapshot | JsonSnapshot | MarkdownSnapshot;

type PreviewResponse = Snapshot & {
  meta: { label: string; path: string; bytes: number; mtime: string };
};

type CacheEntry = { mtime: number; snapshot: Snapshot };
const cache = new Map<string, CacheEntry>();

function rememberCache(key: string, entry: CacheEntry) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, entry);
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (!oldest) break;
    cache.delete(oldest);
  }
}

function resolveSafe(rel: string): string | null {
  const resolved = path.resolve(QAMVP_ROOT, rel);
  if (!resolved.startsWith(QAMVP_ROOT)) return null;
  if (!existsSync(resolved)) return null;
  return resolved;
}

function detectKind(filename: string): 'xlsx' | 'csv' | 'json' | 'md' | 'text' | 'unsupported' {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.xlsm')) return 'xlsx';
  if (lower.endsWith('.csv') || lower.endsWith('.tsv')) return 'csv';
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'md';
  if (lower.endsWith('.txt') || lower.endsWith('.log')) return 'text';
  return 'unsupported';
}

function truncateCell(value: unknown): unknown {
  if (typeof value === 'string' && value.length > CELL_TRUNCATE) {
    return value.slice(0, CELL_TRUNCATE) + '…';
  }
  return value ?? '';
}

function workbookToSnapshot(absPath: string): WorkbookSnapshot {
  const wb = XLSX.readFile(absPath, { cellDates: true });
  const sheets: SheetSnapshot[] = [];
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: '' });
    if (aoa.length === 0) {
      sheets.push({ name, columns: [], rows: [], totalRows: 0 });
      continue;
    }
    const [headerRow, ...body] = aoa;
    const columns = (headerRow as unknown[]).map((c, i) => (c == null || c === '' ? `col_${i + 1}` : String(c)));
    const rows = body.map((row) => {
      const out: unknown[] = [];
      for (let i = 0; i < columns.length; i += 1) {
        out.push(truncateCell((row as unknown[])[i]));
      }
      return out;
    });
    sheets.push({ name, columns, rows, totalRows: rows.length });
  }
  return { kind: 'xlsx', sheets };
}

function csvToSnapshot(text: string, separator: ',' | '\t'): CsvSnapshot {
  const rawRows = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (rawRows.length === 0) {
    return { kind: 'csv', sheets: [{ name: 'csv', columns: [], rows: [], totalRows: 0 }] };
  }
  const parseRow = (line: string): string[] => {
    if (separator === '\t') return line.split('\t');
    const out: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (inQuote) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else if (ch === '"') {
          inQuote = false;
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuote = true;
      } else if (ch === ',') {
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  };
  const [headerLine, ...body] = rawRows;
  const columns = parseRow(headerLine).map((c, i) => c.trim() || `col_${i + 1}`);
  const rows = body.map((line) => parseRow(line).map(truncateCell));
  return { kind: 'csv', sheets: [{ name: 'csv', columns, rows, totalRows: rows.length }] };
}

async function loadSnapshot(absPath: string): Promise<Snapshot> {
  const kind = detectKind(absPath);
  switch (kind) {
    case 'xlsx':
      return workbookToSnapshot(absPath);
    case 'csv': {
      const sep = absPath.toLowerCase().endsWith('.tsv') ? '\t' : ',';
      const text = await readFile(absPath, 'utf-8');
      return csvToSnapshot(text, sep);
    }
    case 'json': {
      const text = await readFile(absPath, 'utf-8');
      try {
        return { kind: 'json', json: JSON.parse(text) };
      } catch {
        return { kind: 'text', text };
      }
    }
    case 'md':
      return { kind: 'md', text: await readFile(absPath, 'utf-8') };
    case 'text':
      return { kind: 'text', text: await readFile(absPath, 'utf-8') };
    default:
      throw new Error('unsupported');
  }
}

export async function readPreview(
  rawPath: string,
  options: { sheet?: string; limit?: number; offset?: number } = {},
): Promise<PreviewResponse> {
  const absPath = resolveSafe(rawPath);
  if (!absPath) throw new Error('not_found');

  const stat = statSync(absPath);
  const cached = cache.get(absPath);
  let snapshot: Snapshot;
  if (cached && cached.mtime === stat.mtimeMs) {
    snapshot = cached.snapshot;
  } else {
    snapshot = await loadSnapshot(absPath);
    rememberCache(absPath, { mtime: stat.mtimeMs, snapshot });
  }

  const meta = {
    label: path.basename(absPath),
    path: rawPath,
    bytes: stat.size,
    mtime: new Date(stat.mtimeMs).toISOString(),
  };

  if (snapshot.kind === 'xlsx' || snapshot.kind === 'csv') {
    const limit = Math.min(Math.max(1, options.limit ?? DEFAULT_LIMIT), MAX_LIMIT);
    const offset = Math.max(0, options.offset ?? 0);
    const sheets = snapshot.sheets.map((sheet) => {
      const matches = !options.sheet || options.sheet === sheet.name;
      const slice = matches ? sheet.rows.slice(offset, offset + limit) : [];
      return {
        name: sheet.name,
        columns: sheet.columns,
        rows: slice,
        totalRows: sheet.totalRows,
      };
    });
    return { kind: snapshot.kind, sheets, meta } as PreviewResponse;
  }

  if (snapshot.kind === 'json') {
    return { kind: 'json', json: snapshot.json, meta };
  }

  return { kind: snapshot.kind, text: snapshot.text, meta };
}
