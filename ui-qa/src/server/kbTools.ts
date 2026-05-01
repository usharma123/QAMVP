import type { RagSnippet, RunRecord, WorkflowPhase } from '../shared/types';
import { runCommand } from './commands';
import { DATABASE_URL, shellQuote } from './store';

export interface ToolCallRequest {
  name: string;
  arguments?: Record<string, unknown>;
  purpose?: string;
}

export interface ToolExecutionResult {
  ok: boolean;
  tool: string;
  result?: unknown;
  error?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  schema: Record<string, unknown>;
}

export interface KbToolRegistry {
  manifest: ToolDefinition[];
  execute(call: ToolCallRequest): Promise<ToolExecutionResult>;
}

export interface KbToolHandlers {
  generateTestCases?: (scope?: string) => Promise<unknown>;
  auditTraceability?: (repositoryPath?: string) => Promise<unknown>;
}

const ALLOWED_TABLES = new Set([
  'documents',
  'chunks',
  'entities',
  'relationships',
  'source_document_versions',
  'requirements',
  'requirement_links',
  'rtm_rows',
  'test_cases',
  'test_case_steps',
]);
const BLOCKED_SQL = /\b(insert|update|delete|truncate|drop|alter|create|copy|call|do|grant|revoke|vacuum|analyze|listen|notify|execute)\b/i;
const BLOCKED_FUNCTIONS = /\b(pg_read_file|pg_ls_dir|lo_import|lo_export|dblink|postgres_fdw|http_|curl|inet_server|inet_client)\b/i;

export function createKbToolRegistry(run: RunRecord, handlers: KbToolHandlers = {}): KbToolRegistry {
  const manifest = toolManifest();
  return {
    manifest,
    async execute(call) {
      try {
        switch (call.name) {
          case 'search_kb_chunks': {
            const query = stringArg(call.arguments, 'query');
            const limit = numberArg(call.arguments, 'limit', 8, 1, 20);
            return { ok: true, tool: call.name, result: await searchKbChunks(run, query, limit) };
          }
          case 'query_kb_sql': {
            const sql = stringArg(call.arguments, 'sql');
            const purpose = stringArg(call.arguments, 'purpose', call.purpose ?? 'Ad-hoc KB analysis');
            const limit = numberArg(call.arguments, 'limit', 50, 1, 200);
            return { ok: true, tool: call.name, result: await queryKbSql(run, sql, purpose, limit) };
          }
          case 'inspect_entities': {
            const entityType = optionalStringArg(call.arguments, 'entityType');
            const pattern = optionalStringArg(call.arguments, 'pattern');
            const limit = numberArg(call.arguments, 'limit', 25, 1, 100);
            return { ok: true, tool: call.name, result: await inspectEntities(run, entityType, pattern, limit) };
          }
          case 'inspect_relationships': {
            const relType = optionalStringArg(call.arguments, 'relType');
            const sourcePattern = optionalStringArg(call.arguments, 'sourcePattern');
            const targetPattern = optionalStringArg(call.arguments, 'targetPattern');
            const limit = numberArg(call.arguments, 'limit', 25, 1, 100);
            return {
              ok: true,
              tool: call.name,
              result: await inspectRelationships(run, relType, sourcePattern, targetPattern, limit),
            };
          }
          case 'inspect_document_versions': {
            const documentKind = optionalStringArg(call.arguments, 'documentKind');
            const activeOnly = booleanArg(call.arguments, 'activeOnly', false);
            const limit = numberArg(call.arguments, 'limit', 50, 1, 150);
            return { ok: true, tool: call.name, result: await inspectDocumentVersions(run, documentKind, activeOnly, limit) };
          }
          case 'inspect_requirements': {
            const documentKind = optionalStringArg(call.arguments, 'documentKind');
            const requirementType = optionalStringArg(call.arguments, 'requirementType');
            const pattern = optionalStringArg(call.arguments, 'pattern');
            const limit = numberArg(call.arguments, 'limit', 50, 1, 150);
            return { ok: true, tool: call.name, result: await inspectRequirements(run, documentKind, requirementType, pattern, limit) };
          }
          case 'inspect_rtm': {
            const status = optionalStringArg(call.arguments, 'status');
            const limit = numberArg(call.arguments, 'limit', 50, 1, 150);
            return { ok: true, tool: call.name, result: await inspectRtm(run, status, limit) };
          }
          case 'inspect_business_requirement_links': {
            const limit = numberArg(call.arguments, 'limit', 25, 1, 100);
            return { ok: true, tool: call.name, result: await inspectBusinessRequirementLinks(run, limit) };
          }
          case 'generate_testcases_from_kb': {
            if (!handlers.generateTestCases) throw new Error('generate_testcases_from_kb is not available in this context.');
            return {
              ok: true,
              tool: call.name,
              result: await handlers.generateTestCases(optionalStringArg(call.arguments, 'scope')),
            };
          }
          case 'audit_testcase_traceability': {
            if (!handlers.auditTraceability) throw new Error('audit_testcase_traceability is not available in this context.');
            return {
              ok: true,
              tool: call.name,
              result: await handlers.auditTraceability(optionalStringArg(call.arguments, 'repositoryPath')),
            };
          }
          default:
            throw new Error(`Unknown tool: ${call.name}`);
        }
      } catch (error) {
        return { ok: false, tool: call.name, error: error instanceof Error ? error.message : String(error) };
      }
    },
  };
}

export async function retrieveRelevantContext(
  run: RunRecord,
  question: string,
  phase: WorkflowPhase = 'rag_ready',
  limit = 8,
): Promise<RagSnippet[]> {
  const result = await searchKbChunks(run, question, limit, phase);
  return result.snippets;
}

async function searchKbChunks(run: RunRecord, query: string, limit: number, phase: WorkflowPhase = 'rag_ready') {
  const command = `source ingestion/.venv/bin/activate && UI_QA_QUERY=${shellQuote(query)} UI_QA_LIMIT=${limit} DATABASE_URL=${DATABASE_URL} ingestion/.venv/bin/python - <<'PY'
import json, os, psycopg
query = os.environ.get("UI_QA_QUERY", "").strip()
limit = int(os.environ.get("UI_QA_LIMIT", "8"))
out = []
with psycopg.connect(os.environ["DATABASE_URL"]) as conn, conn.cursor() as cur:
    cur.execute("""
      with query as (
        select websearch_to_tsquery('english', %s) as q
      )
      select c.id,
             coalesce(d.title, d.path, '') as document,
             coalesce(d.metadata->>'original_path', d.path) as path,
             c.heading_path,
             c.ordinal,
             left(regexp_replace(c.content, '\\s+', ' ', 'g'), 1600) as content,
             ts_rank_cd(to_tsvector('english', coalesce(c.content, '')), query.q) as rank
      from chunks c
      join documents d on d.id = c.document_id
      left join source_document_versions sv on sv.document_id = d.id
      cross join query
      where query.q @@ to_tsvector('english', coalesce(c.content, ''))
        and (d.kind not in ('brd', 'frs', 'hld', 'lld') or coalesce(sv.is_active, true) = true)
      order by rank desc, d.created_at desc nulls last, c.ordinal asc
      limit %s
    """, (query, limit))
    rows = cur.fetchall()
    if not rows:
        cur.execute("""
          select c.id,
                 coalesce(d.title, d.path, '') as document,
                 coalesce(d.metadata->>'original_path', d.path) as path,
                 c.heading_path,
                 c.ordinal,
                 left(regexp_replace(c.content, '\\s+', ' ', 'g'), 1600) as content,
                 0.0 as rank
          from chunks c
          join documents d on d.id = c.document_id
          left join source_document_versions sv on sv.document_id = d.id
          where d.kind not in ('brd', 'frs', 'hld', 'lld') or coalesce(sv.is_active, true) = true
          order by d.created_at desc nulls last, c.ordinal asc
          limit %s
        """, (limit,))
        rows = cur.fetchall()
    for row in rows:
        out.append({
          "id": f"chunk-{row[0]}",
          "document": row[1] or "",
          "path": row[2] or "",
          "heading": row[3] or "",
          "ordinal": int(row[4] or 0),
          "content": row[5] or "",
          "rank": float(row[6] or 0),
        })
print(json.dumps(out))
PY`;
  const result = await runCommand(run, phase, 'Tool search_kb_chunks', command, { allowFailure: true });
  const snippets = parseLastJson<RagSnippet[]>(result.stdout, []);
  return { query, count: snippets.length, snippets };
}

async function queryKbSql(run: RunRecord, sql: string, purpose: string, limit: number) {
  const normalized = validateReadOnlySql(sql);
  const command = `source ingestion/.venv/bin/activate && UI_QA_SQL=${shellQuote(normalized)} UI_QA_LIMIT=${limit} DATABASE_URL=${DATABASE_URL} ingestion/.venv/bin/python - <<'PY'
import datetime, decimal, json, os, psycopg
sql = os.environ["UI_QA_SQL"]
limit = int(os.environ.get("UI_QA_LIMIT", "50"))
wrapped = f"select * from ({sql}) as uiqa_readonly_result limit {limit}"
def encode(value):
    if isinstance(value, decimal.Decimal):
        return float(value)
    if isinstance(value, (datetime.date, datetime.datetime)):
        return value.isoformat()
    return value
with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
    conn.execute("set statement_timeout = '5000ms'")
    conn.execute("set transaction read only")
    with conn.cursor() as cur:
        cur.execute(wrapped)
        columns = [desc.name for desc in cur.description]
        rows = [{col: encode(value) for col, value in zip(columns, row)} for row in cur.fetchall()]
print(json.dumps({"columns": columns, "rows": rows, "rowCount": len(rows)}))
PY`;
  const result = await runCommand(run, 'rag_ready', `Tool query_kb_sql: ${purpose}`, command, { allowFailure: true });
  if (result.exitCode !== 0) {
    return { purpose, sql: summarizeSql(normalized), rowCount: 0, rows: [], error: result.stderr || result.stdout };
  }
  return { purpose, sql: summarizeSql(normalized), ...parseLastJson<Record<string, unknown>>(result.stdout, {}) };
}

async function inspectEntities(run: RunRecord, entityType: string | undefined, pattern: string | undefined, limit: number) {
  const where: string[] = [];
  if (entityType) where.push(`entity_type = ${sqlLiteral(entityType.toUpperCase())}`);
  if (pattern) where.push(`canonical_id ilike ${sqlLiteral(`%${pattern}%`)}`);
  const sql = `
    select entity_type,
           canonical_id,
           count(*) as mentions,
           count(distinct document_id) as documents
    from entities
    ${where.length ? `where ${where.join(' and ')}` : ''}
    group by entity_type, canonical_id
    order by mentions desc, canonical_id
    limit ${limit}
  `;
  return queryKbSql(run, sql, 'Inspect KB entities', limit);
}

async function inspectRelationships(
  run: RunRecord,
  relType: string | undefined,
  sourcePattern: string | undefined,
  targetPattern: string | undefined,
  limit: number,
) {
  const where: string[] = [];
  if (relType) where.push(`r.rel_type = ${sqlLiteral(relType)}`);
  if (sourcePattern) where.push(`coalesce(sd.title, sd.path, '') ilike ${sqlLiteral(`%${sourcePattern}%`)}`);
  if (targetPattern) where.push(`coalesce(r.target_path, r.target_anchor, '') ilike ${sqlLiteral(`%${targetPattern}%`)}`);
  const sql = `
    select r.rel_type,
           coalesce(sd.title, sd.path, '') as source,
           coalesce(r.target_path, r.target_anchor, '') as target,
           left(regexp_replace(coalesce(r.evidence, ''), '\\s+', ' ', 'g'), 300) as evidence
    from relationships r
    left join documents sd on sd.id = r.source_document_id
    ${where.length ? `where ${where.join(' and ')}` : ''}
    order by r.id desc
    limit ${limit}
  `;
  return queryKbSql(run, sql, 'Inspect KB relationships', limit);
}

async function inspectDocumentVersions(
  run: RunRecord,
  documentKind: string | undefined,
  activeOnly: boolean,
  limit: number,
) {
  const where: string[] = [];
  if (documentKind) where.push(`sv.document_kind = ${sqlLiteral(documentKind.toLowerCase())}`);
  if (activeOnly) where.push('sv.is_active = true');
  const sql = `
    select sv.document_kind,
           sv.logical_doc_key,
           sv.version_label,
           sv.content_sha256,
           sv.source_format,
           sv.is_active,
           coalesce(d.metadata->>'original_path', d.path) as path,
           sv.created_at
    from source_document_versions sv
    join documents d on d.id = sv.document_id
    ${where.length ? `where ${where.join(' and ')}` : ''}
    order by sv.document_kind, sv.logical_doc_key, sv.is_active desc, sv.created_at desc
    limit ${limit}
  `;
  return queryKbSql(run, sql, 'Inspect document versions', limit);
}

async function inspectRequirements(
  run: RunRecord,
  documentKind: string | undefined,
  requirementType: string | undefined,
  pattern: string | undefined,
  limit: number,
) {
  const where: string[] = [];
  if (documentKind) where.push(`document_kind = ${sqlLiteral(documentKind.toLowerCase())}`);
  if (requirementType) where.push(`requirement_type = ${sqlLiteral(requirementType)}`);
  if (pattern) where.push(`(requirement_id ilike ${sqlLiteral(`%${pattern}%`)} or requirement_text ilike ${sqlLiteral(`%${pattern}%`)})`);
  const sql = `
    select requirement_id,
           requirement_type,
           document_kind,
           title,
           left(regexp_replace(requirement_text, '\\s+', ' ', 'g'), 300) as excerpt
    from requirements
    ${where.length ? `where ${where.join(' and ')}` : ''}
    order by document_kind, requirement_id
    limit ${limit}
  `;
  return queryKbSql(run, sql, 'Inspect derived requirements', limit);
}

async function inspectRtm(run: RunRecord, status: string | undefined, limit: number) {
  const where = status ? `where coverage_status = ${sqlLiteral(status)}` : '';
  const sql = `
    select rtm_id,
           business_requirement_id,
           functional_requirement_id,
           hld_requirement_id,
           lld_requirement_id,
           coverage_status,
           confidence,
           notes
    from rtm_rows
    ${where}
    order by confidence asc, rtm_id
    limit ${limit}
  `;
  return queryKbSql(run, sql, 'Inspect derived RTM', limit);
}

async function inspectBusinessRequirementLinks(run: RunRecord, limit: number) {
  const sql = `
    with brs as (
      select requirement_id
      from requirements
      where document_kind = 'brd'
         or requirement_id like 'BR-%'
         or requirement_id like 'BRD %'
    ),
    rtm_degree as (
      select business_requirement_id as requirement_id, count(*)::int as rtm_rows
      from rtm_rows
      where business_requirement_id is not null
      group by business_requirement_id
    ),
    link_degree as (
      select requirement_id, count(*)::int as explicit_links
      from (
        select source_requirement_id as requirement_id from requirement_links
        union all
        select target_requirement_id as requirement_id from requirement_links
      ) x
      group by requirement_id
    ),
    mentions as (
      select canonical_id as requirement_id, count(*)::int as mentions
      from entities
      where entity_type in ('BR', 'REQ', 'SECTION')
      group by canonical_id
    )
    select b.requirement_id,
           coalesce(rd.rtm_rows, 0) as rtm_rows,
           coalesce(ld.explicit_links, 0) as explicit_links,
           coalesce(m.mentions, 0) as mentions,
           coalesce(rd.rtm_rows, 0) + coalesce(ld.explicit_links, 0) + coalesce(m.mentions, 0) as total_link_score
    from brs b
    left join rtm_degree rd on rd.requirement_id = b.requirement_id
    left join link_degree ld on ld.requirement_id = b.requirement_id
    left join mentions m on m.requirement_id = b.requirement_id
    order by total_link_score desc, rtm_rows desc, explicit_links desc, mentions desc, b.requirement_id
    limit ${limit}
  `;
  return queryKbSql(run, sql, 'Inspect most-linked business requirements', limit);
}

function toolManifest(): ToolDefinition[] {
  return [
    {
      name: 'search_kb_chunks',
      description: 'Search ingested document chunks and return cited snippets.',
      schema: { query: 'string', limit: 'number optional 1-20' },
    },
    {
      name: 'query_kb_sql',
      description: 'Run read-only analytical SQL against KB tables. SELECT/WITH only.',
      schema: { sql: 'string SELECT/WITH only', purpose: 'string', limit: 'number optional 1-200' },
    },
    {
      name: 'inspect_entities',
      description: 'Inspect entity inventory, counts, and examples.',
      schema: { entityType: 'string optional, e.g. TC/REQ/BR/TKT/SECTION', pattern: 'string optional', limit: 'number optional' },
    },
    {
      name: 'inspect_relationships',
      description: 'Inspect relationship rows and evidence samples.',
      schema: { relType: 'string optional', sourcePattern: 'string optional', targetPattern: 'string optional', limit: 'number optional' },
    },
    {
      name: 'inspect_document_versions',
      description: 'Inspect source document versions and active baseline state for BRD/FRS/HLD/LLD.',
      schema: { documentKind: 'brd/frs/hld/lld optional', activeOnly: 'boolean optional', limit: 'number optional' },
    },
    {
      name: 'inspect_requirements',
      description: 'Inspect normalized requirements derived from BRD, FRS, HLD, and LLD.',
      schema: { documentKind: 'brd/frs/hld/lld optional', requirementType: 'string optional', pattern: 'string optional', limit: 'number optional' },
    },
    {
      name: 'inspect_rtm',
      description: 'Inspect derived requirement traceability matrix rows and confidence/coverage status.',
      schema: { status: 'complete/partial optional', limit: 'number optional' },
    },
    {
      name: 'inspect_business_requirement_links',
      description: 'Rank BRD/business requirements by derived RTM rows, explicit requirement links, and KB mentions.',
      schema: { limit: 'number optional' },
    },
    {
      name: 'generate_testcases_from_kb',
      description: 'Generate TestCases.xlsx and repository artifacts from the KB, then run traceability audit.',
      schema: { scope: 'string optional' },
    },
    {
      name: 'audit_testcase_traceability',
      description: 'Summarize the latest generated testcase traceability audit.',
      schema: { repositoryPath: 'string optional' },
    },
  ];
}

function validateReadOnlySql(sql: string): string {
  const normalized = sql.trim().replace(/;+\s*$/, '');
  if (!/^(select|with)\b/i.test(normalized)) throw new Error('Only SELECT or WITH queries are allowed.');
  if (normalized.includes(';')) throw new Error('Semicolon chaining is not allowed.');
  if (BLOCKED_SQL.test(normalized)) throw new Error('Unsafe SQL keyword rejected.');
  if (BLOCKED_FUNCTIONS.test(normalized)) throw new Error('Unsafe SQL function rejected.');
  const cteNames = new Set([...normalized.matchAll(/(?:\bwith|,)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+as\s*\(/gi)].map((match) => match[1].toLowerCase()));
  for (const match of normalized.matchAll(/\b(from|join)\s+([a-zA-Z_][a-zA-Z0-9_.]*)/gi)) {
    const table = match[2].split('.').at(-1)?.toLowerCase() ?? '';
    if (!ALLOWED_TABLES.has(table) && !cteNames.has(table)) {
      throw new Error(`Table ${match[2]} is not in the KB read allowlist.`);
    }
  }
  return normalized;
}

function parseLastJson<T>(stdout: string, fallback: T): T {
  try {
    const lastLine = (stdout || '').trim().split(/\r?\n/).filter(Boolean).at(-1);
    return lastLine ? (JSON.parse(lastLine) as T) : fallback;
  } catch {
    return fallback;
  }
}

function stringArg(args: Record<string, unknown> | undefined, key: string, fallback?: string): string {
  const value = args?.[key] ?? fallback;
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing string argument: ${key}`);
  return value.trim();
}

function optionalStringArg(args: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = args?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function numberArg(args: Record<string, unknown> | undefined, key: string, fallback: number, min: number, max: number): number {
  const raw = args?.[key];
  const value = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : fallback;
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function booleanArg(args: Record<string, unknown> | undefined, key: string, fallback: boolean): boolean {
  const raw = args?.[key];
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') return raw.toLowerCase() === 'true';
  return fallback;
}

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function summarizeSql(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim().slice(0, 1000);
}
