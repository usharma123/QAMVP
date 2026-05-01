import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type {
  ApprovalRequest,
  Checkpoint,
  CountByLabel,
  FindingCounts,
  GeneratedCaseStep,
  IngestedDocument,
  IngestionMap,
  RelationshipSample,
  RepositorySpec,
  RunRecord,
} from '../shared/types';
import { runCommand } from './commands';
import { retrieveRelevantContext } from './kbTools';
import { copyUploadsToSourcePack } from './uploads';
import {
  addEvidence,
  checkStopped,
  DATABASE_URL,
  emit,
  GENERATED_ROOT,
  id,
  now,
  persist,
  QAMVP_ROOT,
  rel,
  RESULTS_ROOT,
  shellQuote,
  stamp,
  stopFlags,
  updateEvent,
} from './store';

export const approvals = new Map<string, (approval: ApprovalRequest) => void>();
const DOCKER_COMPOSE = '"${COMPOSE[@]}"';

interface RtmGenerationRow {
  rtm_id: string;
  business_requirement_id?: string;
  functional_requirement_id?: string;
  hld_requirement_id?: string;
  lld_requirement_id?: string;
  coverage_status: string;
  confidence: number;
  notes: string;
  source_refs: string[];
  excerpt: string;
}

interface ConfidenceScorecard {
  subject: string;
  score: number;
  threshold: number;
  status: 'pass' | 'warn' | 'fail';
  rationale: string[];
}

interface ExecutableCasePlan {
  title: string;
  objective: string;
  priority: string;
  tags: string[];
  primaryRequirement: string;
  steps: GeneratedCaseStep[];
}

const CASE_CONFIDENCE_THRESHOLD = Number(process.env.UI_QA_CASE_CONFIDENCE_THRESHOLD ?? 0.72);
const STEP_CONFIDENCE_THRESHOLD = Number(process.env.UI_QA_STEP_CONFIDENCE_THRESHOLD ?? 0.7);
const ACTIONABLE_STEP = /\b(login|log in|logout|navigate|open|enter|select|submit|click|approve|reject|verify|assert|wait|refresh|locate|view)\b/i;
const META_STEP = /\b(review rtm|confirm mapped requirements|execute the user-visible workflow|capture evidence|reconcile|traceability captured|source requirement chain)\b/i;

export async function runWorkflow(run: RunRecord): Promise<void> {
  return runIngestionWorkflow(run);
}

export async function runIngestionWorkflow(run: RunRecord): Promise<void> {
  try {
    run.status = 'running';
    await persist(run);

    checkStopped(run);
    const sourcePack = path.join(GENERATED_ROOT, run.id, 'source-pack');
    const prepareSourcePack = await emit(run, 'upload_sources', 'Prepare active source pack', 'running');
    await copyUploadsToSourcePack(run, sourcePack);
    const sourceFiles = await listSourceDocs(sourcePack);
    const effectiveSourceFiles = run.uploads.length > 0
      ? sourceFiles
      : await listSourceDocs(path.join(QAMVP_ROOT, 'test-doc'));
    if (run.uploads.length > 0 && sourceFiles.length === 0) {
      await updateEvent(run, prepareSourcePack, 'blocked', {
        summary:
          'The run has uploaded source metadata, but no .docx/.md files were copied into the active source pack. Start a new run so uploads complete before ingestion begins.',
      });
      throw new Error('Active source pack contains no ingestible .docx or .md files.');
    }
    await validateSourceContract(run, effectiveSourceFiles);
    await addEvidence(run, {
      kind: 'folder',
      label: 'Active source pack',
      path: rel(sourcePack),
      phase: 'upload_sources',
    });
    await updateEvent(run, prepareSourcePack, 'succeeded', {
      title: 'Active source pack ready',
      summary: `${effectiveSourceFiles.length} ingestible source document(s) ready.`,
    });

    checkStopped(run);
    await ensureDependencies(run);
    await ensureDatabase(run);
    await ingestSources(run, sourcePack);
    await deriveRtm(run);
    await emitIngestionVisualization(run);
    await writeEntitySummary(run);

    checkStopped(run);
    run.status = 'ready';
    run.currentPhase = 'rag_ready';
    await emit(run, 'rag_ready', 'Document QA knowledge base ready', 'succeeded', {
      summary: 'Documents are ingested and ready for grounded Q&A. Ask questions about the source pack or request TestCases.xlsx generation.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    run.status = stopFlags.has(run.id) ? 'stopped' : 'blocked';
    await emit(run, run.currentPhase ?? 'complete', 'Workflow stopped', run.status === 'stopped' ? 'warning' : 'blocked', {
      summary: message,
    });
  } finally {
    approvals.delete(run.id);
    await persist(run);
  }
}

export async function generateTestCasesFromKb(run: RunRecord): Promise<RepositorySpec | null> {
  try {
    run.status = 'running';
    await persist(run);
    checkStopped(run);
    const spec = await generateTestCases(run);
    await writeGeneratedWorkbook(run, spec);
    await auditGeneratedTests(run, spec);
    run.status = run.blockerCount && run.blockerCount > 0 ? 'blocked' : 'approved';
    await emit(run, 'complete', 'TestCases.xlsx generation complete', 'succeeded', {
      summary: `Generated ${spec.cases.length} test case(s). Confidence audit ${run.blockerCount ? 'has blockers' : 'passed'}.`,
    });
    return spec;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    run.status = stopFlags.has(run.id) ? 'stopped' : 'blocked';
    await emit(run, run.currentPhase ?? 'generate_tests', 'Test case generation stopped', run.status === 'stopped' ? 'warning' : 'blocked', {
      summary: message,
    });
    return null;
  } finally {
    await persist(run);
  }
}

async function listSourceDocs(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && ['.docx', '.md'].includes(path.extname(entry.name).toLowerCase()))
    .map((entry) => entry.name);
}

async function validateSourceContract(run: RunRecord, sourceFiles: string[]): Promise<void> {
  const required = ['BRD', 'FRS', 'HLD', 'LLD'];
  const present = new Set<string>();
  for (const upload of run.uploads.filter((item) => item.status === 'accepted')) {
    if (required.includes(upload.documentType)) present.add(upload.documentType);
  }
  if (run.uploads.length === 0) {
    for (const file of sourceFiles) {
      const kind = inferSourceKind(file);
      if (kind) present.add(kind);
    }
  }
  const missing = required.filter((kind) => !present.has(kind));
  const event = await emit(run, 'upload_sources', 'Validate BRD/FRS/HLD/LLD source contract', 'running', {
    summary: 'Checking that the source pack contains the four real workflow documents.',
    technical: { rawLabel: 'source-contract', payload: { required, present: [...present], files: sourceFiles } },
  });
  if (missing.length > 0) {
    await updateEvent(run, event, 'blocked', {
      summary: `Missing required source document type(s): ${missing.join(', ')}.`,
      technical: { ...event.technical, payload: { required, present: [...present], missing, files: sourceFiles } },
    });
    throw new Error(`Missing required source document type(s): ${missing.join(', ')}.`);
  }
  await updateEvent(run, event, 'succeeded', {
    summary: 'Source pack includes BRD, FRS, HLD, and LLD.',
    technical: { ...event.technical, payload: { required, present: [...present], missing: [] } },
  });
}

function inferSourceKind(filename: string): string | null {
  const name = filename.toLowerCase();
  if (name.includes('brd') || name.includes('business') || name.startsWith('01-')) return 'BRD';
  if (name.includes('frs') || name.includes('functional') || name.startsWith('02-')) return 'FRS';
  if (name.includes('hld') || name.includes('high-level') || name.includes('high_level') || name.startsWith('03-')) return 'HLD';
  if (name.includes('lld') || name.includes('low-level') || name.includes('low_level') || name.startsWith('04-')) return 'LLD';
  return null;
}

async function ensureDependencies(run: RunRecord): Promise<void> {
  await runCommand(run, 'ingest_sources', 'Ensure ingestion virtualenv', '/bin/test -d ingestion/.venv || /usr/bin/python3 -m venv ingestion/.venv');
  await runCommand(run, 'ingest_sources', 'Install ingestion dependencies', 'source ingestion/.venv/bin/activate && ingestion/.venv/bin/pip install -r ingestion/requirements.txt -q');
}

async function ensureDatabase(run: RunRecord): Promise<void> {
  const status = await runCommand(
    run,
    'ingest_sources',
    'Inspect Docker pgvector service',
    `${dockerPrelude()}
"$DOCKER_BIN" version
${DOCKER_COMPOSE} ps`,
    { allowFailure: true },
  );

  if (status.exitCode !== 0) {
    await emit(run, 'ingest_sources', 'Docker preflight failed', 'blocked', {
      summary: [
        'Docker is required for the local Postgres + pgvector database.',
        'Open Docker Desktop and wait until it says it is running, then start the run again.',
        '',
        status.stderr || status.stdout,
      ].join('\n').trim(),
    });
    throw new Error('Docker preflight failed. Docker Desktop may still be starting or the docker CLI is unavailable.');
  }

  await runCommand(
    run,
    'ingest_sources',
    'Start local pgvector DB',
    `${dockerPrelude()}
${DOCKER_COMPOSE} up -d postgres`,
  );

  await runCommand(
    run,
    'ingest_sources',
    'Wait for pgvector DB readiness',
    `${dockerPrelude()}
for attempt in {1..45}; do
  if ${DOCKER_COMPOSE} exec -T postgres pg_isready -U ingestion -d ingestion >/dev/null 2>&1; then
    echo "Postgres is ready after $attempt attempt(s)."
    exit 0
  fi
  echo "Waiting for Postgres/pgvector readiness ($attempt/45)..."
  sleep 2
done
echo "Postgres did not become ready within 90 seconds." >&2
${DOCKER_COMPOSE} ps >&2 || true
${DOCKER_COMPOSE} logs --tail=120 postgres >&2 || true
exit 1`,
  );

  await runCommand(
    run,
    'ingest_sources',
    'Apply ingestion migrations',
    `${dockerPrelude()}
for migration in ingestion/sql/*.sql; do
  echo "Applying $migration"
  ${DOCKER_COMPOSE} exec -T postgres psql -v ON_ERROR_STOP=1 -U ingestion -d ingestion < "$migration"
done
echo "Migrations applied."`,
  );

  await runCommand(
    run,
    'ingest_sources',
    'Verify pgvector DB schema',
    `${dockerPrelude()}
${DOCKER_COMPOSE} exec -T postgres psql -U ingestion -d ingestion -c "select extname from pg_extension where extname = 'vector';"
${DOCKER_COMPOSE} exec -T postgres psql -U ingestion -d ingestion -c "select table_name from information_schema.tables where table_schema = 'public' order by table_name;"`,
  );
}

function dockerPrelude(): string {
  return `set -euo pipefail
DOCKER_BIN="$(command -v docker || true)"
if [ -z "$DOCKER_BIN" ]; then
  for candidate in /opt/homebrew/bin/docker /usr/local/bin/docker /Applications/Docker.app/Contents/Resources/bin/docker; do
    if [ -x "$candidate" ]; then
      DOCKER_BIN="$candidate"
      break
    fi
  done
fi
if [ -z "$DOCKER_BIN" ]; then
  echo "Docker CLI not found. Install Docker Desktop or add docker to PATH." >&2
  exit 127
fi
if ! "$DOCKER_BIN" info >/dev/null 2>&1; then
  echo "Docker CLI was found at $DOCKER_BIN, but the Docker daemon is not reachable." >&2
  echo "Open Docker Desktop and wait for the engine to finish starting." >&2
  exit 1
fi
COMPOSE=("$DOCKER_BIN" compose -f ingestion/docker-compose.yml)`;
}

async function ingestSources(run: RunRecord, sourcePackDir: string): Promise<void> {
  const testDocDir = run.uploads.length > 0 ? sourcePackDir : path.join(QAMVP_ROOT, 'test-doc');
  await runCommand(
    run,
    'ingest_sources',
    'Embed source documents into pgvector',
    `source ingestion/.venv/bin/activate && DATABASE_URL=${DATABASE_URL} ingestion/.venv/bin/python ingestion/scripts/ingest.py --format both --skip-test-cases --test-doc ${shellQuote(testDocDir)}`,
  );
}

async function deriveRtm(run: RunRecord): Promise<void> {
  const command = `source ingestion/.venv/bin/activate && DATABASE_URL=${DATABASE_URL} ingestion/.venv/bin/python - <<'PY'
import hashlib, json, os, re
from collections import defaultdict

import psycopg
from psycopg.types.json import Json

SOURCE_KINDS = ("brd", "frs", "hld", "lld")
ENTITY_TYPES = ("REQ", "BR", "DESIGN", "SECTION", "API", "COMP", "DATA", "CTRL")
KIND_ORDER = {"brd": 0, "frs": 1, "hld": 2, "lld": 3}

def req_type(entity_type, req_id):
    if entity_type == "BR" or req_id.startswith("BR-"):
        return "business"
    if req_id.startswith("REQ-FR") or req_id.startswith("FRS-") or "FRS" in req_id:
        return "functional"
    if req_id.startswith("HLD-") or "HLD" in req_id:
        return "hld_design"
    if req_id.startswith("LLD-") or "LLD" in req_id:
        return "lld_design"
    if entity_type == "SECTION":
        return "section"
    if entity_type == "DESIGN":
        return "design"
    return "requirement"

def canonical_doc_kind(req_id, fallback):
    if req_id.startswith("BR-") or req_id.startswith("BRD "):
        return "brd"
    if req_id.startswith(("REQ-FR", "REQ-NFR", "REQ-SEC", "FRS-")) or req_id.startswith("FRS "):
        return "frs"
    if req_id.startswith(("HLD-", "DES-")) or req_id.startswith("HLD "):
        return "hld"
    if req_id.startswith("LLD-") or req_id.startswith(("API-", "COMP-", "DATA-", "CTRL-")) or req_id.startswith("LLD "):
        return "lld"
    return fallback

def stable_hash(*parts):
    return hashlib.sha256("|".join(str(p or "") for p in parts).encode()).hexdigest()

with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
    with conn.cursor() as cur:
        cur.execute("delete from rtm_rows")
        cur.execute("delete from requirement_links")
        cur.execute("delete from requirements")
        cur.execute(
            """
            select e.entity_type, e.canonical_id, d.id, c.id, d.kind, coalesce(c.heading_path, ''), c.content
            from entities e
            join documents d on d.id = e.document_id
            join chunks c on c.id = e.chunk_id
            join source_document_versions sv on sv.document_id = d.id and sv.is_active = true
            where d.kind = any(%s)
              and e.entity_type = any(%s)
            order by d.kind, d.id, c.ordinal, e.canonical_id
            """,
            (list(SOURCE_KINDS), list(ENTITY_TYPES)),
        )
        rows = cur.fetchall()
        by_chunk = defaultdict(list)
        requirements = {}
        for entity_type, canonical_id, doc_id, chunk_id, kind, heading, content in rows:
            req_id = canonical_id.upper()
            doc_kind = canonical_doc_kind(req_id, kind)
            title = heading or req_id
            text = re.sub(r"\\s+", " ", content or "").strip()[:1200]
            requirements[req_id] = {
                "requirement_id": req_id,
                "requirement_type": req_type(entity_type, req_id),
                "source_document_id": doc_id,
                "source_chunk_id": chunk_id,
                "document_kind": doc_kind,
                "title": title[:240],
                "requirement_text": text,
                "canonical_hash": stable_hash(req_id, text),
                "metadata": {"entity_type": entity_type},
            }
            by_chunk[chunk_id].append(req_id)

        for item in requirements.values():
            cur.execute(
                """
                insert into requirements (
                  requirement_id, requirement_type, source_document_id, source_chunk_id,
                  document_kind, title, requirement_text, canonical_hash, metadata, updated_at
                )
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s, now())
                on conflict (requirement_id) do update set
                  requirement_type = excluded.requirement_type,
                  source_document_id = excluded.source_document_id,
                  source_chunk_id = excluded.source_chunk_id,
                  document_kind = excluded.document_kind,
                  title = excluded.title,
                  requirement_text = excluded.requirement_text,
                  canonical_hash = excluded.canonical_hash,
                  metadata = excluded.metadata,
                  updated_at = now()
                """,
                (
                    item["requirement_id"],
                    item["requirement_type"],
                    item["source_document_id"],
                    item["source_chunk_id"],
                    item["document_kind"],
                    item["title"],
                    item["requirement_text"],
                    item["canonical_hash"],
                    Json(item["metadata"]),
                ),
            )

        link_count = 0
        for chunk_id, ids in by_chunk.items():
            unique_ids = sorted(set(ids), key=lambda rid: (KIND_ORDER.get(requirements[rid]["document_kind"], 99), rid))
            for source in unique_ids:
                for target in unique_ids:
                    if source == target:
                        continue
                    sk = requirements[source]["document_kind"]
                    tk = requirements[target]["document_kind"]
                    if KIND_ORDER.get(tk, 99) != KIND_ORDER.get(sk, 99) + 1:
                        continue
                    link_id = stable_hash(source, target, chunk_id)[:32]
                    link_type = f"{sk}_to_{tk}"
                    cur.execute(
                        """
                        insert into requirement_links (
                          id, source_requirement_id, target_requirement_id, link_type,
                          confidence, evidence_chunk_id, evidence, metadata, updated_at
                        )
                        values (%s, %s, %s, %s, %s, %s, %s, %s, now())
                        on conflict (id) do update set
                          confidence = excluded.confidence,
                          evidence_chunk_id = excluded.evidence_chunk_id,
                          evidence = excluded.evidence,
                          metadata = excluded.metadata,
                          updated_at = now()
                        """,
                        (
                            link_id,
                            source,
                            target,
                            link_type,
                            0.78,
                            chunk_id,
                            requirements[target]["requirement_text"][:500],
                            Json({"derivation": "same_chunk_adjacent_doc_kind"}),
                        ),
                    )
                    link_count += 1

        by_kind = defaultdict(list)
        for req_id, item in requirements.items():
            by_kind[item["document_kind"]].append(req_id)

        rtm_count = 0
        unmapped = 0
        centers = by_kind["frs"] or by_kind["brd"] or sorted(requirements)
        for idx, center in enumerate(sorted(centers)):
            def nearest(kind):
                candidates = sorted(by_kind[kind])
                if not candidates:
                    return None
                return candidates[min(idx, len(candidates) - 1)]

            br = nearest("brd")
            fr = center if requirements[center]["document_kind"] == "frs" else nearest("frs")
            hld = nearest("hld")
            lld = nearest("lld")
            linked = [x for x in (br, fr, hld, lld) if x]
            missing = 4 - len(linked)
            unmapped += missing
            confidence = max(0.35, 1 - missing * 0.16)
            status = "complete" if missing == 0 else "partial"
            evidence = [requirements[x]["source_chunk_id"] for x in linked if requirements[x].get("source_chunk_id")]
            rtm_id = stable_hash(br, fr, hld, lld)[:32]
            cur.execute(
                """
                insert into rtm_rows (
                  rtm_id, business_requirement_id, functional_requirement_id, hld_requirement_id,
                  lld_requirement_id, coverage_status, confidence, evidence_chunk_ids, notes, metadata, updated_at
                )
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now())
                on conflict (rtm_id) do update set
                  business_requirement_id = excluded.business_requirement_id,
                  functional_requirement_id = excluded.functional_requirement_id,
                  hld_requirement_id = excluded.hld_requirement_id,
                  lld_requirement_id = excluded.lld_requirement_id,
                  coverage_status = excluded.coverage_status,
                  confidence = excluded.confidence,
                  evidence_chunk_ids = excluded.evidence_chunk_ids,
                  notes = excluded.notes,
                  metadata = excluded.metadata,
                  updated_at = now()
                """,
                (
                    rtm_id,
                    br,
                    fr,
                    hld,
                    lld,
                    status,
                    confidence,
                    evidence,
                    f"{missing} missing requirement column(s)." if missing else "All requirement columns mapped.",
                    Json({"derived_from": "requirement_inventory", "center": center}),
                ),
            )
            rtm_count += 1

        cur.execute("select count(*) from requirements")
        req_count = int(cur.fetchone()[0] or 0)
        cur.execute("select count(*) from rtm_rows")
        row_count = int(cur.fetchone()[0] or 0)
        cur.execute("select coalesce(avg(confidence), 0) from rtm_rows")
        avg_conf = float(cur.fetchone()[0] or 0)
        conn.commit()

print(json.dumps({
  "requirements": req_count,
  "rows": row_count,
  "links": link_count,
  "unmapped": unmapped,
  "averageConfidence": round(avg_conf, 3),
}))
PY`;
  const result = await runCommand(run, 'ingest_sources', 'Derive requirement RTM', command);
  const summary = parseJsonFromLastLine<{
    requirements: number;
    rows: number;
    links: number;
    unmapped: number;
    averageConfidence: number;
  }>(result.stdout, { requirements: 0, rows: 0, links: 0, unmapped: 0, averageConfidence: 0 });
  const base = path.join(RESULTS_ROOT, `derived_rtm_${stamp()}`);
  const jsonPath = `${base}.json`;
  const mdPath = `${base}.md`;
  await writeFile(jsonPath, JSON.stringify(summary, null, 2) + '\n', 'utf8');
  await writeFile(
    mdPath,
    [
      '# Derived Requirement Traceability Matrix',
      '',
      `Requirements: ${summary.requirements}`,
      `RTM rows: ${summary.rows}`,
      `Requirement links: ${summary.links}`,
      `Unmapped columns: ${summary.unmapped}`,
      `Average confidence: ${summary.averageConfidence}`,
      '',
      '## Methodology',
      '',
      'The RTM is derived only from rows in `source_document_versions` where `is_active = true`. Older BRD/FRS/HLD/LLD document versions remain queryable for history, but they are excluded from active requirement extraction, RTM derivation, and testcase generation unless promoted to the active baseline.',
      '',
    ].join('\n'),
    'utf8',
  );
  await addEvidence(run, { kind: 'json', label: 'Derived RTM JSON', path: rel(jsonPath), phase: 'ingest_sources' });
  await addEvidence(run, { kind: 'report', label: 'Derived RTM report', path: rel(mdPath), phase: 'ingest_sources' });
  await emit(run, 'ingest_sources', 'Derived requirement RTM', summary.rows > 0 ? 'succeeded' : 'warning', {
    summary: `${summary.rows} active-baseline RTM row(s), ${summary.requirements} requirement(s), ${summary.unmapped} unmapped column(s).`,
    technical: { rawLabel: 'ingest:rtm', payload: { kind: 'rtm-summary', ...summary } },
  });
}

async function emitIngestionVisualization(run: RunRecord): Promise<void> {
  const map = run.dryRun ? synthesizeIngestionMap(run) : await fetchIngestionMap(run);
  if (!map) {
    await emit(run, 'ingest_sources', 'Ingestion knowledge map unavailable', 'warning', {
      summary:
        'Could not introspect the ingestion DB to build a visualization. The ingestion command itself succeeded.',
    });
    return;
  }

  const totalEntities = sumCounts(map.entities);
  const totalRelationships = sumCounts(map.relationships);
  const rtmText = map.rtm ? ` · ${map.rtm.rows} RTM rows · ${map.rtm.unmapped} unmapped` : '';

  const docEvent = await emit(run, 'ingest_sources', 'Map ingested documents', 'running', {
    summary: 'Reading the documents table and per-document chunk and entity counts.',
  });
  await sleep(180);
  await updateEvent(run, docEvent, 'succeeded', {
    summary: `Indexed ${map.documents.length} document${map.documents.length === 1 ? '' : 's'}.`,
    technical: {
      rawLabel: 'ingest:documents',
      payload: { kind: 'ingestion-section', section: 'documents', documents: map.documents },
    },
  });

  const entityEvent = await emit(run, 'ingest_sources', 'Build entity map', 'running', {
    summary: 'Grouping extracted entities by type.',
  });
  await sleep(180);
  await updateEvent(run, entityEvent, 'succeeded', {
    summary: `${totalEntities} entit${totalEntities === 1 ? 'y' : 'ies'} across ${map.entities.length} type${map.entities.length === 1 ? '' : 's'}.`,
    technical: {
      rawLabel: 'ingest:entities',
      payload: { kind: 'ingestion-section', section: 'entities', entities: map.entities },
    },
  });

  const relEvent = await emit(run, 'ingest_sources', 'Trace relationships', 'running', {
    summary: 'Reading relationship edges and sampling cross-document references.',
  });
  await sleep(180);
  await updateEvent(run, relEvent, 'succeeded', {
    summary: `${totalRelationships} relationship${totalRelationships === 1 ? '' : 's'} across ${map.relationships.length} type${map.relationships.length === 1 ? '' : 's'}.`,
    technical: {
      rawLabel: 'ingest:relationships',
      payload: {
        kind: 'ingestion-section',
        section: 'relationships',
        relationships: map.relationships,
        samples: map.rel_samples,
      },
    },
  });

  await sleep(120);
  await emit(run, 'ingest_sources', 'Ingestion knowledge map', 'succeeded', {
    summary: `${map.documents.length} document${map.documents.length === 1 ? '' : 's'} · ${totalEntities} entities · ${totalRelationships} relationships${rtmText}${run.dryRun ? ' (synthesized for dry-run)' : ''}.`,
    technical: {
      rawLabel: 'ingest:map',
      payload: { kind: 'ingestion-map', ...map },
    },
  });
}

async function fetchIngestionMap(run: RunRecord): Promise<IngestionMap | null> {
  const command = `source ingestion/.venv/bin/activate && DATABASE_URL=${DATABASE_URL} ingestion/.venv/bin/python - <<'PY'
import os, json, psycopg
out = {"documents": [], "entities": [], "relationships": [], "rel_samples": [], "rtm": None}
with psycopg.connect(os.environ['DATABASE_URL']) as conn, conn.cursor() as cur:
    cur.execute("""
      select d.id,
             coalesce(d.metadata->>'original_path', d.title, d.path) as label,
             coalesce(d.kind, d.source_format, 'doc') as kind,
             coalesce(sv.version_label, d.metadata->>'document_version', '') as version_label,
             coalesce(sv.is_active, false) as is_active,
             (select count(*) from source_document_versions v where v.logical_doc_key = d.logical_doc_key and v.document_kind = d.kind) as version_count,
             (select count(*) from chunks c where c.document_id = d.id) as chunks,
             (select count(*) from entities e where e.document_id = d.id) as entities,
             (select count(*) from relationships r where r.source_document_id = d.id) as rels
      from documents d
      left join source_document_versions sv on sv.document_id = d.id
      where d.kind in ('brd', 'frs', 'hld', 'lld')
        and coalesce(sv.is_active, true) = true
      order by d.kind, d.created_at desc nulls last, d.id desc
      limit 30
    """)
    for row in cur.fetchall():
        out["documents"].append({
            "id": int(row[0]),
            "label": row[1] or "",
            "kind": (row[2] or "doc").upper(),
            "version": row[3] or "",
            "isActive": bool(row[4]),
            "versionCount": int(row[5] or 0),
            "chunks": int(row[6] or 0),
            "entities": int(row[7] or 0),
            "rels": int(row[8] or 0),
        })
    cur.execute("select entity_type, count(*) from entities group by entity_type order by count(*) desc, entity_type")
    out["entities"] = [{"type": t, "count": int(c)} for t, c in cur.fetchall()]
    cur.execute("select rel_type, count(*) from relationships group by rel_type order by count(*) desc, rel_type limit 12")
    out["relationships"] = [{"type": t, "count": int(c)} for t, c in cur.fetchall()]
    cur.execute("""
      select r.rel_type,
             coalesce(sd.title, sd.path, '') as source_label,
             coalesce(nullif(r.target_path, ''), nullif(r.target_anchor, ''), '') as target_label
      from relationships r
      left join documents sd on sd.id = r.source_document_id
      order by r.id desc
      limit 8
    """)
    out["rel_samples"] = [{"type": t, "from": s or "", "to": tg or ""} for t, s, tg in cur.fetchall()]
    cur.execute("""
      select
        coalesce((select count(*) from requirements), 0)::int,
        coalesce((select count(*) from rtm_rows), 0)::int,
        coalesce((select count(*) from requirement_links), 0)::int,
        coalesce((select sum(4
          - (case when business_requirement_id is null then 0 else 1 end)
          - (case when functional_requirement_id is null then 0 else 1 end)
          - (case when hld_requirement_id is null then 0 else 1 end)
          - (case when lld_requirement_id is null then 0 else 1 end)
        ) from rtm_rows), 0)::int,
        coalesce((select avg(confidence) from rtm_rows), 0)::float
    """)
    reqs, rows, links, unmapped, avg_conf = cur.fetchone()
    out["rtm"] = {
      "requirements": int(reqs or 0),
      "rows": int(rows or 0),
      "links": int(links or 0),
      "unmapped": int(unmapped or 0),
      "averageConfidence": round(float(avg_conf or 0), 3),
    }
print(json.dumps(out))
PY`;
  const result = await runCommand(run, 'ingest_sources', 'Query ingestion knowledge graph', command, {
    allowFailure: true,
  });
  if (result.exitCode !== 0) return null;
  try {
    const text = (result.stdout || '').trim();
    if (!text) return null;
    const lastLine = text.split(/\r?\n/).filter(Boolean).at(-1) ?? text;
    return JSON.parse(lastLine) as IngestionMap;
  } catch {
    return null;
  }
}

function synthesizeIngestionMap(run: RunRecord): IngestionMap {
  const seedNames = ['BRD-v1.docx', 'FRS-payments.docx', 'HLD-design.md', 'LLD-controls.md'];
  const seedKinds = ['BRD', 'FRS', 'HLD', 'LLD'];
  const sources = run.uploads.length > 0
    ? run.uploads.map((upload, idx) => ({
        label: upload.originalName,
        kind: (upload.documentType || seedKinds[idx % seedKinds.length] || 'DOC').toUpperCase(),
      }))
    : seedNames.map((name, idx) => ({ label: name, kind: seedKinds[idx % seedKinds.length] }));

  const documents: IngestedDocument[] = sources.map((source, idx) => {
    const chunks = 6 + ((idx * 7 + 4) % 18);
    const entities = 3 + ((idx * 5 + 2) % 11);
    const rels = 2 + ((idx * 3 + 1) % 7);
    return { id: idx + 1, label: source.label, kind: source.kind, version: '1.0', isActive: true, versionCount: 1, chunks, entities, rels };
  });

  const entities: CountByLabel[] = [
    { type: 'Requirement', count: documents.reduce((s, d) => s + Math.max(2, Math.floor(d.entities * 0.45)), 0) },
    { type: 'TestCase', count: documents.reduce((s, d) => s + Math.max(1, Math.floor(d.entities * 0.25)), 0) },
    { type: 'UseCase', count: documents.reduce((s, d) => s + Math.max(1, Math.floor(d.entities * 0.18)), 0) },
    { type: 'BusinessRule', count: documents.reduce((s, d) => s + Math.max(1, Math.floor(d.entities * 0.12)), 0) },
    { type: 'Persona', count: 3 },
    { type: 'System', count: 2 },
  ].filter((row) => row.count > 0);

  const relationships: CountByLabel[] = [
    { type: 'implements', count: documents.reduce((s, d) => s + d.rels, 0) },
    { type: 'verifies', count: Math.max(2, Math.floor(documents.length * 2.2)) },
    { type: 'depends_on', count: Math.max(1, Math.floor(documents.length * 1.4)) },
    { type: 'satisfies', count: Math.max(1, Math.floor(documents.length * 0.9)) },
    { type: 'derived_from', count: Math.max(1, Math.floor(documents.length * 0.6)) },
  ].filter((row) => row.count > 0);

  const rel_samples: RelationshipSample[] = [
    { type: 'implements', from: documents[0]?.label ?? 'BRD', to: 'REQ-001' },
    { type: 'verifies', from: 'TestCases', to: 'REQ-001' },
    { type: 'depends_on', from: documents[1]?.label ?? 'FRS', to: `${documents[0]?.label ?? 'BRD'}#§3.2` },
    { type: 'satisfies', from: documents[2]?.label ?? 'HLD', to: `${documents[1]?.label ?? 'FRS'}#§4.1` },
    { type: 'derived_from', from: documents[3]?.label ?? 'LLD', to: documents[2]?.label ?? 'HLD' },
  ].filter((sample) => sample.from && sample.to);

  return {
    documents,
    entities,
    relationships,
    rel_samples,
    rtm: {
      requirements: entities.reduce((sum, row) => sum + row.count, 0),
      rows: Math.max(1, documents.length),
      links: relationships.reduce((sum, row) => sum + row.count, 0),
      unmapped: 0,
      averageConfidence: 0.82,
    },
  };
}

function sumCounts(rows: CountByLabel[]): number {
  return rows.reduce((sum, row) => sum + (row.count || 0), 0);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJsonFromLastLine<T>(stdout: string, fallback: T): T {
  try {
    const text = (stdout || '').trim();
    const lastLine = text.split(/\r?\n/).filter(Boolean).at(-1) ?? text;
    return lastLine ? (JSON.parse(lastLine) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeEntitySummary(run: RunRecord): Promise<void> {
  const out = path.join(RESULTS_ROOT, `uiqa_entity_summary_${stamp()}.md`);
  const command = `source ingestion/.venv/bin/activate && DATABASE_URL=${DATABASE_URL} ingestion/.venv/bin/python - <<'PY'
import os, psycopg
with psycopg.connect(os.environ['DATABASE_URL']) as conn, conn.cursor() as cur:
    cur.execute("select entity_type, count(*) from entities group by entity_type order by entity_type")
    rows = cur.fetchall()
print('# Entity Map Summary')
print()
print('| Entity Type | Count |')
print('|---|---:|')
for t, c in rows:
    print(f'| {t} | {c} |')
PY`;
  const result = await runCommand(run, 'ingest_sources', 'Summarize entity map', command);
  await writeFile(out, result.stdout || '# Entity Map Summary\n\nNo entities found.\n', 'utf8');
  await addEvidence(run, {
    kind: 'report',
    label: 'Entity map summary',
    path: rel(out),
    phase: 'ingest_sources',
  });
}

async function loadExistingSpec(): Promise<RepositorySpec | null> {
  const specPath = path.join(QAMVP_ROOT, 'test-doc/test-case-repository.json');
  if (!existsSync(specPath)) return null;
  return JSON.parse(await readFile(specPath, 'utf8')) as RepositorySpec;
}

async function generateTestCases(run: RunRecord): Promise<RepositorySpec> {
  const rtmRows = await retrieveRtmRows(run);
  const kbSnippets = await retrieveRelevantContext(
    run,
    'requirements business rules acceptance criteria user flows validation controls',
    'generate_tests',
  );
  await emit(run, 'generate_tests', 'Prepare executable test generation plan', 'succeeded', {
    summary: 'Using active RTM rows and KB excerpts to create Playwright-runner executable steps.',
    technical: {
      rawLabel: 'generate_tests:planner',
      payload: buildGenerationPlanningPayload(rtmRows, kbSnippets),
    },
  });
  const spec = await generateFallbackSpec(run, kbSnippets, rtmRows);
  const dir = path.join(GENERATED_ROOT, run.id);
  await mkdir(dir, { recursive: true });
  const out = path.join(dir, 'test-case-repository.generated.json');
  await writeFile(out, JSON.stringify(spec, null, 2) + '\n', 'utf8');
  run.generatedSpecPath = rel(out);
  await addEvidence(run, {
    kind: 'json',
    label: 'Generated test case repository',
    path: rel(out),
    phase: 'generate_tests',
  });
  await emit(run, 'generate_tests', 'Generated test cases', 'succeeded', {
    summary: `${spec.cases.length} test case(s), ${spec.cases.reduce((sum, item) => sum + item.steps.length, 0)} step(s).`,
    technical: { rawLabel: 'generate_tests:repository', payload: { cases: spec.cases.length } },
  });
  return spec;
}

function buildGenerationPlanningPayload(
  rtmRows: RtmGenerationRow[],
  kbSnippets: Array<{ document: string; heading: string; content: string }>,
): Record<string, unknown> {
  const compactRows = rtmRows.slice(0, 12).map((row) => ({
    rtm_id: row.rtm_id,
    brd: row.business_requirement_id,
    frs: row.functional_requirement_id,
    hld: row.hld_requirement_id,
    lld: row.lld_requirement_id,
    coverage_status: row.coverage_status,
    confidence: row.confidence,
    notes: truncateText(row.notes, 240),
    source_refs: row.source_refs.slice(0, 3),
    excerpt: truncateText(row.excerpt, 360),
  }));
  const compactSnippets = kbSnippets.slice(0, 6).map((snippet, index) => ({
    ref: index + 1,
    document: snippet.document,
    heading: snippet.heading,
    excerpt: truncateText(snippet.content, 500),
  }));

  return {
    rules: [
      'TestCases.xlsx steps must be executable Playwright/browser actions.',
      'Use concrete actors, routes, locators, input values, and expected UI states when available.',
      'Do not generate meta/audit steps like Review RTM row, confirm mapped requirements, execute workflow, capture evidence, or reconcile source.',
      'Preserve source refs as metadata only; they must not be the step action.',
    ],
    rtmRowCount: rtmRows.length,
    kbSnippetCount: kbSnippets.length,
    compactRows,
    compactSnippets,
  };
}

function truncateText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 3))}...`;
}

async function retrieveRtmRows(run: RunRecord): Promise<RtmGenerationRow[]> {
  const command = `source ingestion/.venv/bin/activate && DATABASE_URL=${DATABASE_URL} ingestion/.venv/bin/python - <<'PY'
import json, os, psycopg
rows = []
with psycopg.connect(os.environ["DATABASE_URL"]) as conn, conn.cursor() as cur:
    cur.execute("""
      select r.rtm_id,
             r.business_requirement_id,
             r.functional_requirement_id,
             r.hld_requirement_id,
             r.lld_requirement_id,
             r.coverage_status,
             r.confidence,
             r.notes,
             coalesce(c.id, 0) as chunk_id,
             coalesce(d.metadata->>'original_path', d.path, '') as path,
             coalesce(c.ordinal, 0) as ordinal,
             left(regexp_replace(coalesce(c.content, ''), '\\s+', ' ', 'g'), 700) as excerpt
      from rtm_rows r
      left join chunks c on c.id = any(r.evidence_chunk_ids)
      left join documents d on d.id = c.document_id
      order by r.confidence asc, r.rtm_id, c.ordinal
      limit 40
    """)
    by_id = {}
    for row in cur.fetchall():
        item = by_id.setdefault(row[0], {
          "rtm_id": row[0],
          "business_requirement_id": row[1],
          "functional_requirement_id": row[2],
          "hld_requirement_id": row[3],
          "lld_requirement_id": row[4],
          "coverage_status": row[5],
          "confidence": float(row[6] or 0),
          "notes": row[7] or "",
          "source_refs": [],
          "excerpt": row[11] or "",
        })
        if row[8]:
            item["source_refs"].append(f"{row[9]}#chunk-{row[10]}")
    rows = list(by_id.values())
print(json.dumps(rows[:20]))
PY`;
  const result = await runCommand(run, 'generate_tests', 'Load derived RTM for generation', command, { allowFailure: true });
  if (result.exitCode !== 0) return [];
  return parseJsonFromLastLine<RtmGenerationRow[]>(result.stdout, []);
}

async function generateFallbackSpec(
  run: RunRecord,
  snippets: Awaited<ReturnType<typeof retrieveRelevantContext>>,
  rtmRows: RtmGenerationRow[] = [],
): Promise<RepositorySpec> {
  if (rtmRows.length > 0) {
    const cases = rtmRows.slice(0, 8).map((row, index) => {
      const requirementIds = [
        row.business_requirement_id,
        row.functional_requirement_id,
        row.hld_requirement_id,
        row.lld_requirement_id,
      ].filter((value): value is string => Boolean(value));
      const primaryRequirement = row.functional_requirement_id ?? row.business_requirement_id ?? requirementIds[0] ?? `REQ-RTM-${index + 1}`;
      const testCaseId = `TC-${String(index + 1).padStart(3, '0')}`;
      const sourceRefs = row.source_refs.length ? row.source_refs : [`rtm:${row.rtm_id}`];
      const confidence = Math.max(0.45, Math.min(0.95, row.confidence));
      const executablePlan = buildExecutableCasePlan(row, index, primaryRequirement, sourceRefs, confidence);
      return {
        test_case_id: testCaseId,
        requirement_ids: requirementIds.length ? requirementIds : [primaryRequirement],
        title: executablePlan.title,
        objective: executablePlan.objective,
        priority: executablePlan.priority,
        suite: 'Executable Playwright From Derived RTM',
        tags: executablePlan.tags,
        confidence,
        source_refs: sourceRefs,
        steps: executablePlan.steps,
      };
    });
    return {
      document_id: 'UIQA-RTM-GENERATED-REPO-001',
      version: stamp(),
      status: 'Generated by ui-qa from the derived requirement traceability matrix.',
      title: 'ui-qa RTM-Grounded Test Case Repository',
      source_workbook: 'test_data/TestCases.xlsx',
      cases,
    };
  }

  if (snippets.length > 0) {
    const cases = snippets.slice(0, 8).map((snippet, index) => {
      const requirementId = inferRequirementId(snippet.content, index + 1);
      const testCaseId = `TC-${String(index + 1).padStart(3, '0')}`;
      const sourceRef = `${snippet.path}#chunk-${snippet.ordinal}`;
      const title = titleFromSnippet(snippet.content, snippet.document, index + 1);
      return {
        test_case_id: testCaseId,
        requirement_ids: [requirementId],
        title,
        objective: `Validate the behavior and controls described in ${snippet.document}${snippet.heading ? ` (${snippet.heading})` : ''}.`,
        priority: index < 3 ? 'P1' : 'P2',
        suite: 'Generated From KB',
        tags: ['kb-generated', snippet.document.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')].filter(Boolean),
        confidence: 0.82,
        source_refs: [sourceRef],
        steps: [
          {
            requirement_id: requirementId,
            step_number: 1,
            step_description: `Review source requirement ${requirementId} and prepare data for: ${title}.`,
            expected_output: `Relevant source context is available and traceable to ${sourceRef}.`,
            test_data: snippet.document,
            confidence: 0.82,
            source_refs: [sourceRef],
          },
          {
            requirement_id: requirementId,
            step_number: 2,
            step_description: `Execute the user-visible workflow or control described by ${snippet.document}.`,
            expected_output: summarizeExpectedOutput(snippet.content),
            test_data: 'Use source-approved banking QA test data.',
            confidence: 0.78,
            source_refs: [sourceRef],
          },
          {
            requirement_id: requirementId,
            step_number: 3,
            step_description: 'Capture evidence and reconcile the observed result to the cited source document.',
            expected_output: `Evidence supports ${requirementId} and no unsupported behavior is introduced.`,
            test_data: 'Screenshots, logs, exported workbook rows, and audit notes.',
            confidence: 0.78,
            source_refs: [sourceRef],
          },
        ],
      };
    });
    return {
      document_id: 'UIQA-KB-GENERATED-REPO-001',
      version: stamp(),
      status: 'Generated by ui-qa from the active ingested knowledge base.',
      title: 'ui-qa KB-Generated Test Case Repository',
      source_workbook: 'test_data/TestCases.xlsx',
      cases,
    };
  }

  return {
    document_id: 'UIQA-GENERATED-REPO-001',
    version: stamp(),
    status: 'Generated by ui-qa from uploaded source documents.',
    title: 'ui-qa Generated Test Case Repository',
    source_workbook: 'test_data/TestCases.xlsx',
    cases: [
      {
        test_case_id: 'TC-001',
        requirement_ids: ['REQ-UIQA-001'],
        title: 'Validate uploaded source workflow',
        objective: 'Verify that uploaded source documents can be ingested and traced into a QA execution workflow.',
        priority: 'P1',
        suite: 'Generated Smoke',
        tags: ['ui-qa', 'generated'],
        confidence: 0.7,
        source_refs: run.uploads.map((upload) => upload.storedPath),
        steps: [
          {
            requirement_id: 'REQ-UIQA-001',
            step_number: 1,
            step_description: 'Review the active source pack and confirm required documents are present.',
            expected_output: 'The source pack contains accepted source documents with recorded hashes and document types.',
            test_data: run.uploads.map((upload) => upload.originalName).join(', '),
            confidence: 0.7,
            source_refs: run.uploads.map((upload) => upload.storedPath),
          },
        ],
      },
    ],
  };
}

function buildExecutableCasePlan(
  row: RtmGenerationRow,
  index: number,
  primaryRequirement: string,
  sourceRefs: string[],
  confidence: number,
): ExecutableCasePlan {
  const text = `${primaryRequirement} ${row.business_requirement_id ?? ''} ${row.functional_requirement_id ?? ''} ${row.hld_requirement_id ?? ''} ${row.lld_requirement_id ?? ''} ${row.excerpt} ${row.notes}`.toLowerCase();
  const stepConfidence = Math.max(0.45, confidence - 0.03);
  const mk = (step_number: number, step_description: string, expected_output: string, test_data: string, requirement_id = primaryRequirement): GeneratedCaseStep => ({
    requirement_id,
    step_number,
    step_description,
    expected_output,
    test_data,
    confidence: stepConfidence,
    source_refs: sourceRefs,
  });

  if (/invalid|validation|missing|required|field|trade-symbol|trade-quantity|trade-price|req-fr-004/.test(text)) {
    return {
      title: 'Validate maker trade form field validation',
      objective: 'Verify the trade capture form blocks incomplete or invalid trade submissions before pending approval.',
      priority: 'P1',
      tags: ['kb-generated', 'rtm-grounded', 'playwright', 'trade-capture', 'negative'],
      primaryRequirement,
      steps: [
        mk(1, 'Navigate to `/login` and login as maker using username `admin` and password `admin`.', 'Authenticated maker workspace is displayed.', 'username=admin; password=admin'),
        mk(2, 'Navigate to `/trade` and leave required trade fields blank.', 'Trade capture form is visible with symbol, side, quantity, price, account, and settlement date controls.', 'route=/trade'),
        mk(3, 'Submit the trade form without symbol, quantity, price, account, and settlement date.', 'Submission is blocked and field-level validation messages are displayed.', 'missingFields=symbol,quantity,price,account,settlementDate'),
        mk(4, 'Enter symbol `AAPL`, side `BUY`, quantity `0`, price `178.50`, account `ACC-1001`, then submit again.', 'Quantity validation prevents submission because quantity must be positive.', 'symbol=AAPL; side=BUY; quantity=0; price=178.50; account=ACC-1001'),
        mk(5, 'Correct quantity to `100` and submit the trade form.', 'Trade is accepted and a pending approval confirmation is shown.', 'quantity=100'),
      ],
    };
  }

  if (/approval|approve|reject|checker|pending|maker-checker|segregation|req-fr-005|req-fr-006|req-sec-002/.test(text)) {
    return {
      title: 'Validate maker-checker approval workflow',
      objective: 'Verify a maker-created trade enters pending approval and a checker can approve it independently.',
      priority: 'P1',
      tags: ['kb-generated', 'rtm-grounded', 'playwright', 'approval', 'maker-checker'],
      primaryRequirement,
      steps: [
        mk(1, 'Navigate to `/login` and login as maker using username `admin` and password `admin`.', 'Authenticated maker workspace is displayed.', 'username=admin; password=admin'),
        mk(2, 'Navigate to `/trade` and enter BUY AAPL trade data: quantity `100`, price `178.50`, account `ACC-1001`, settlement date `2026-05-04`.', 'All required trade fields are populated with the supplied values.', 'symbol=AAPL; side=BUY; quantity=100; price=178.50; account=ACC-1001; settlementDate=2026-05-04'),
        mk(3, 'Submit the trade instruction.', 'Success notification is displayed and the trade status is `pending`.', 'expectedStatus=pending'),
        mk(4, 'Logout maker and login as checker using username `checker` and password `chscker@123`.', 'Authenticated checker workspace is displayed.', 'username=checker; password=chscker@123'),
        mk(5, 'Navigate to `/approvals` and locate the pending AAPL BUY trade row.', 'Approval queue shows the pending AAPL BUY trade with quantity `100`.', 'route=/approvals; symbol=AAPL; side=BUY; quantity=100'),
        mk(6, 'Click the approve action for the AAPL BUY trade.', 'Approval succeeds and a trade-approved notification is displayed.', 'decision=approve'),
        mk(7, 'Refresh or revisit `/approvals`.', 'Pending count decreases and the approved trade is no longer actionable in the queue.', 'expectedPendingCount=0'),
      ],
    };
  }

  if (/dashboard|notional|summary|count|approved|req-fr-007|req-fr-008/.test(text)) {
    return {
      title: 'Validate dashboard status counts and approved notional',
      objective: 'Verify dashboard summary cards reflect approved trade count and approved notional after checker approval.',
      priority: 'P1',
      tags: ['kb-generated', 'rtm-grounded', 'playwright', 'dashboard'],
      primaryRequirement,
      steps: [
        mk(1, 'Login as maker and submit a BUY AAPL trade with quantity `100` and price `178.50` from `/trade`.', 'Trade submission succeeds with pending status.', 'username=admin; password=admin; symbol=AAPL; side=BUY; quantity=100; price=178.50'),
        mk(2, 'Logout maker, login as checker, navigate to `/approvals`, and approve the AAPL BUY trade.', 'Trade approval succeeds and queue removes the pending row.', 'username=checker; password=chscker@123; decision=approve'),
        mk(3, 'Navigate to `/dashboard`.', 'Dashboard summary page is visible.', 'route=/dashboard'),
        mk(4, 'Verify the approved trade count summary card.', 'Approved count is `1` and pending count is `0` for the approved trade scenario.', 'expectedApprovedCount=1; expectedPendingCount=0'),
        mk(5, 'Verify the approved notional summary card.', 'Approved notional equals `17850.00` for quantity `100` multiplied by price `178.50`.', 'quantity=100; price=178.50; expectedApprovedNotional=17850.00'),
      ],
    };
  }

  if (/audit|evidence|event|retention|req-fr-009|req-nfr-001|req-sec-003/.test(text)) {
    return {
      title: 'Validate audit trail records controlled actions',
      objective: 'Verify authentication, trade submission, and approval actions produce visible audit events.',
      priority: 'P2',
      tags: ['kb-generated', 'rtm-grounded', 'playwright', 'audit'],
      primaryRequirement,
      steps: [
        mk(1, 'Login as maker and submit a BUY AAPL trade from `/trade`.', 'Trade submission succeeds and records a submit action.', 'username=admin; password=admin; symbol=AAPL; side=BUY; quantity=100; price=178.50'),
        mk(2, 'Logout maker, login as checker, and approve the pending AAPL trade from `/approvals`.', 'Approval succeeds and records an approval action.', 'username=checker; password=chscker@123; decision=approve'),
        mk(3, 'Navigate to `/audit` or the audit trail view.', 'Audit trail page is visible to the authorized user.', 'route=/audit'),
        mk(4, 'Verify audit rows for login, trade submission, and approval.', 'Audit trail contains events for login, submit, and approve with actor and timestamp fields.', 'expectedEvents=login,submit,approve'),
      ],
    };
  }

  if (/route|guard|unauth|auth|login|password|username|req-fr-001|req-fr-002|req-sec-001/.test(text)) {
    return {
      title: 'Validate login and protected route access',
      objective: 'Verify unauthenticated users are redirected to login and valid maker credentials open the protected workspace.',
      priority: 'P1',
      tags: ['kb-generated', 'rtm-grounded', 'playwright', 'authentication'],
      primaryRequirement,
      steps: [
        mk(1, 'Open `/trade` in a new unauthenticated browser session.', 'The application redirects to `/login` or displays the login form.', 'route=/trade; session=anonymous'),
        mk(2, 'Verify username, password, and submit controls are visible on `/login`.', 'Login form controls are visible and enabled.', 'locators=username,password,login-submit'),
        mk(3, 'Enter username `admin` and password `admin`, then submit the login form.', 'Maker user is authenticated and the protected workspace is displayed.', 'username=admin; password=admin'),
        mk(4, 'Verify the maker role is visible in the authenticated shell.', 'Navbar or user shell identifies the active role as maker/admin.', 'expectedRole=maker'),
        mk(5, 'Logout from the authenticated shell.', 'Session is cleared and `/login` is visible again.', 'action=logout'),
      ],
    };
  }

  return {
    title: `Validate executable behavior for ${primaryRequirement}`,
    objective: 'Verify the user-visible behavior represented by the RTM requirement chain through browser actions.',
    priority: 'P2',
    tags: ['kb-generated', 'rtm-grounded', 'playwright'],
    primaryRequirement,
    steps: [
      mk(1, 'Login as maker using username `admin` and password `admin`.', 'Authenticated maker workspace is displayed.', 'username=admin; password=admin'),
      mk(2, 'Navigate to the application area described by the mapped requirement.', 'The relevant page or component is visible.', `requirement=${primaryRequirement}`),
      mk(3, 'Perform the primary user action described by the requirement using source-approved test data.', 'The application accepts the action or displays the documented validation result.', row.notes || `sourceRefs=${sourceRefs.join(',')}`),
      mk(4, 'Verify the resulting UI state against the requirement expected behavior.', summarizeExpectedOutput(row.excerpt || 'The system behavior matches the cited requirement.'), `requirement=${primaryRequirement}`),
    ],
  };
}

function inferRequirementId(content: string, ordinal: number): string {
  const match = content.match(/\b(?:REQ|FRS|BRD|HLD|LLD)[-_ ]?\d{1,4}\b/i);
  if (match) return match[0].replace(/\s+/g, '-').toUpperCase();
  return `REQ-KB-${String(ordinal).padStart(3, '0')}`;
}

function titleFromSnippet(content: string, document: string, ordinal: number): string {
  const firstSentence = content.split(/[.!?]\s+/).find((part) => part.trim().length > 24)?.trim();
  const base = firstSentence || `Validate source behavior from ${document || `document ${ordinal}`}`;
  return base.length > 96 ? `${base.slice(0, 93)}...` : base;
}

function summarizeExpectedOutput(content: string): string {
  const sentence = content.split(/[.!?]\s+/).find((part) => /must|shall|should|will|verify|validate|ensure|display|allow|prevent/i.test(part));
  const base = sentence?.trim() || 'The system behavior matches the cited source requirement.';
  return base.length > 180 ? `${base.slice(0, 177)}...` : base;
}

function scoreSpec(
  spec: RepositorySpec,
  kbIds: Set<string>,
): { counts: FindingCounts; findings: string[]; scorecards: ConfidenceScorecard[] } {
  const counts: FindingCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  const findings: string[] = [];
  const scorecards: ConfidenceScorecard[] = [];
  if (!spec.cases.length) {
    counts.critical += 1;
    findings.push('Repository contains no generated test cases.');
  }
  for (const testCase of spec.cases) {
    const caseRationale: string[] = [];
    let caseScore = testCase.confidence ?? 0.5;
    if (!testCase.requirement_ids?.length) {
      counts.high += 1;
      caseScore -= 0.24;
      caseRationale.push('Missing requirement IDs.');
      findings.push(`${testCase.test_case_id}: missing requirement_ids.`);
    }
    if (!testCase.source_refs?.length) {
      counts.high += 1;
      caseScore -= 0.2;
      caseRationale.push('Missing case-level source refs.');
      findings.push(`${testCase.test_case_id}: missing case-level source refs.`);
    }
    let exactReqMatches = 0;
    for (const req of testCase.requirement_ids ?? []) {
      if (kbIds.size > 0 && !kbIds.has(req.toUpperCase())) {
        counts.low += 1;
        caseScore -= 0.04;
        caseRationale.push(`${req} was not found as an exact KB requirement/entity.`);
        findings.push(`${testCase.test_case_id}: requirement ${req} was not found as an exact KB entity; verify citation manually.`);
      } else {
        exactReqMatches += 1;
      }
    }
    if (exactReqMatches > 0) caseRationale.push(`${exactReqMatches} requirement ID(s) matched the KB inventory.`);
    if ((testCase.confidence ?? 0) < 0.65) {
      counts.high += 1;
      findings.push(`${testCase.test_case_id}: confidence below 0.65.`);
    } else if ((testCase.confidence ?? 1) < 0.8) {
      counts.medium += 1;
      findings.push(`${testCase.test_case_id}: confidence below 0.80.`);
    }
    const seenSteps = new Set<number>();
    for (const step of testCase.steps) {
      const stepRationale: string[] = [];
      let stepScore = step.confidence ?? 0.5;
      if (META_STEP.test(step.step_description)) {
        counts.high += 1;
        stepScore -= 0.3;
        stepRationale.push('Step is a traceability/meta instruction, not an executable browser action.');
        findings.push(`${testCase.test_case_id} step ${step.step_number}: meta step is not executable by the Playwright runner.`);
      }
      if (!ACTIONABLE_STEP.test(step.step_description)) {
        counts.medium += 1;
        stepScore -= 0.16;
        stepRationale.push('Step does not contain an actionable browser/test verb.');
        findings.push(`${testCase.test_case_id} step ${step.step_number}: step description lacks an actionable browser/test verb.`);
      }
      if (/\b(enter|select|submit|approve|reject|login|log in)\b/i.test(step.step_description) && !/[=:/]/.test(step.test_data)) {
        counts.medium += 1;
        stepScore -= 0.12;
        stepRationale.push('Action step needs concrete structured test data.');
        findings.push(`${testCase.test_case_id} step ${step.step_number}: action step lacks concrete structured test data.`);
      }
      if (!step.expected_output.trim()) {
        counts.medium += 1;
        stepScore -= 0.18;
        stepRationale.push('Missing expected output.');
        findings.push(`${testCase.test_case_id} step ${step.step_number}: missing expected output.`);
      }
      if (!step.step_description.trim()) {
        counts.high += 1;
        stepScore -= 0.22;
        stepRationale.push('Missing step description.');
        findings.push(`${testCase.test_case_id} step ${step.step_number}: missing step description.`);
      }
      if (!step.source_refs?.length) {
        counts.medium += 1;
        stepScore -= 0.2;
        stepRationale.push('Missing step-level source refs.');
        findings.push(`${testCase.test_case_id} step ${step.step_number}: missing source refs.`);
      }
      if (step.requirement_id && kbIds.size > 0 && kbIds.has(step.requirement_id.toUpperCase())) {
        stepScore += 0.04;
        stepRationale.push('Step requirement matched the KB inventory.');
      } else if (step.requirement_id && kbIds.size > 0) {
        stepScore -= 0.04;
        stepRationale.push('Step requirement was not an exact KB match.');
      }
      if ((step.confidence ?? 0) < 0.65) {
        counts.medium += 1;
        findings.push(`${testCase.test_case_id} step ${step.step_number}: confidence below 0.65.`);
      }
      if (seenSteps.has(step.step_number)) {
        counts.high += 1;
        stepScore -= 0.15;
        stepRationale.push('Duplicate step number.');
        findings.push(`${testCase.test_case_id}: duplicate step ${step.step_number}.`);
      }
      seenSteps.add(step.step_number);
      const normalizedStepScore = clampScore(stepScore);
      const stepStatus = scoreStatus(normalizedStepScore, STEP_CONFIDENCE_THRESHOLD);
      if (stepStatus === 'fail') {
        counts.high += 1;
        findings.push(`${testCase.test_case_id} step ${step.step_number}: source-alignment score ${normalizedStepScore.toFixed(2)} below threshold ${STEP_CONFIDENCE_THRESHOLD}.`);
      } else if (stepStatus === 'warn') {
        counts.low += 1;
      }
      scorecards.push({
        subject: `${testCase.test_case_id} step ${step.step_number}`,
        score: normalizedStepScore,
        threshold: STEP_CONFIDENCE_THRESHOLD,
        status: stepStatus,
        rationale: stepRationale.length ? stepRationale : ['Step has requirement, expected output, and source refs.'],
      });
    }
    if (testCase.steps.length === 0) caseScore -= 0.25;
    const normalizedCaseScore = clampScore(caseScore);
    const caseStatus = scoreStatus(normalizedCaseScore, CASE_CONFIDENCE_THRESHOLD);
    if (caseStatus === 'fail') {
      counts.high += 1;
      findings.push(`${testCase.test_case_id}: source-alignment score ${normalizedCaseScore.toFixed(2)} below threshold ${CASE_CONFIDENCE_THRESHOLD}.`);
    } else if (caseStatus === 'warn') {
      counts.low += 1;
    }
    scorecards.push({
      subject: testCase.test_case_id,
      score: normalizedCaseScore,
      threshold: CASE_CONFIDENCE_THRESHOLD,
      status: caseStatus,
      rationale: caseRationale.length ? caseRationale : ['Case has requirement IDs, source refs, and declared confidence.'],
    });
  }
  return { counts, findings, scorecards };
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(3))));
}

function scoreStatus(score: number, threshold: number): ConfidenceScorecard['status'] {
  if (score < threshold) return 'fail';
  if (score < Math.min(0.9, threshold + 0.08)) return 'warn';
  return 'pass';
}

async function auditGeneratedTests(run: RunRecord, spec: RepositorySpec): Promise<void> {
  const kbIds = await loadKbEntityIds(run);
  const { counts, findings, scorecards } = scoreSpec(spec, kbIds);
  run.findingCounts = counts;
  run.blockerCount = counts.critical + counts.high;
  const base = path.join(RESULTS_ROOT, `generated_test_case_audit_${stamp()}`);
  const jsonPath = `${base}.json`;
  const mdPath = `${base}.md`;
  const payload = {
    summary: {
      finding_counts: counts,
      case_count: spec.cases.length,
      kb_entity_ids_checked: kbIds.size,
      thresholds: {
        case: CASE_CONFIDENCE_THRESHOLD,
        step: STEP_CONFIDENCE_THRESHOLD,
      },
      verdict: counts.critical || counts.high ? 'blocked' : counts.medium ? 'approved_with_conditions' : 'approved',
    },
    scorecards,
    findings,
  };
  await writeFile(jsonPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  await writeFile(
    mdPath,
    [
      '# Generated Test Case Confidence & Traceability Audit',
      '',
      `Cases: ${spec.cases.length}`,
      `KB entity IDs checked: ${kbIds.size}`,
      `Case confidence threshold: ${CASE_CONFIDENCE_THRESHOLD}`,
      `Step confidence threshold: ${STEP_CONFIDENCE_THRESHOLD}`,
      `Findings: ${JSON.stringify(counts)}`,
      '',
      '## Checks',
      '- Requirement IDs present',
      '- Case and step source refs present',
      '- Expected output present for each step',
      '- Step confidence at or above threshold',
      '- Requirement IDs compared against KB entity IDs when available',
      '- Numeric source-alignment score calculated for each case and step',
      '',
      '## Confidence Scorecards',
      '| Subject | Score | Threshold | Status | Rationale |',
      '|---|---:|---:|---|---|',
      ...scorecards.map((item) => `| ${item.subject} | ${item.score.toFixed(2)} | ${item.threshold.toFixed(2)} | ${item.status} | ${item.rationale.join('; ').replaceAll('|', '\\|')} |`),
      '',
      '## Findings',
      ...(findings.length ? findings.map((f) => `- ${f}`) : ['- No blocking findings.']),
      '',
    ].join('\n'),
    'utf8',
  );
  await addEvidence(run, {
    kind: 'report',
    label: 'Generated test confidence audit',
    path: rel(mdPath),
    phase: 'audit_generated_tests',
  });
  await addEvidence(run, {
    kind: 'json',
    label: 'Generated test confidence audit JSON',
    path: rel(jsonPath),
    phase: 'audit_generated_tests',
  });
  if (counts.critical || counts.high) {
    await emit(run, 'audit_generated_tests', 'Generated test confidence audit blocked', 'blocked', {
      summary: findings.join('\n'),
    });
    throw new Error('Generated test confidence audit blocked reseed.');
  }
  await emit(run, 'audit_generated_tests', 'Generated test confidence audit passed', counts.medium ? 'warning' : 'succeeded', {
    summary: `Finding counts: ${JSON.stringify(counts)}. Confidence scorecards: ${scorecards.length}.`,
    technical: { rawLabel: 'audit_generated_tests:confidence', payload: { counts, scorecards } },
  });
}

async function loadKbEntityIds(run: RunRecord): Promise<Set<string>> {
  const command = `source ingestion/.venv/bin/activate && DATABASE_URL=${DATABASE_URL} ingestion/.venv/bin/python - <<'PY'
import os, json, psycopg
with psycopg.connect(os.environ['DATABASE_URL']) as conn, conn.cursor() as cur:
    cur.execute("""
      select distinct upper(canonical_id) from entities where canonical_id is not null and canonical_id <> ''
      union
      select distinct upper(requirement_id) from requirements where requirement_id is not null and requirement_id <> ''
    """)
    print(json.dumps([r[0] for r in cur.fetchall()]))
PY`;
  const result = await runCommand(run, 'audit_generated_tests', 'Load KB entity IDs for traceability audit', command, {
    allowFailure: true,
  });
  if (result.exitCode !== 0) return new Set();
  try {
    const lastLine = (result.stdout || '').trim().split(/\r?\n/).filter(Boolean).at(-1);
    const rows = lastLine ? (JSON.parse(lastLine) as string[]) : [];
    return new Set(rows.map((row) => row.toUpperCase()));
  } catch {
    return new Set();
  }
}

async function writeGeneratedWorkbook(run: RunRecord, spec: RepositorySpec): Promise<void> {
  const dir = path.join(GENERATED_ROOT, run.id);
  await mkdir(dir, { recursive: true });
  const specPath = path.join(dir, 'test-case-repository.generated.json');
  const workbookPath = run.dryRun
    ? path.join(dir, 'TestCases.generated.xlsx')
    : path.join(QAMVP_ROOT, 'test_data/TestCases.xlsx');
  const markdownPath = path.join(dir, 'test-case-repository.generated.md');
  await writeFile(specPath, JSON.stringify(spec, null, 2) + '\n', 'utf8');
  await runCommand(
    run,
    'generate_tests',
    'Build TestCases workbook from generated repository',
    `source ingestion/.venv/bin/activate && ingestion/.venv/bin/python test-doc/scripts/build_test_case_repository.py --spec ${shellQuote(specPath)} --workbook-out ${shellQuote(workbookPath)} --markdown-out ${shellQuote(markdownPath)}`,
  );
  await addEvidence(run, {
    kind: 'workbook',
    label: run.dryRun ? 'Generated TestCases workbook (dry-run)' : 'Generated TestCases.xlsx',
    path: rel(workbookPath),
    phase: 'generate_tests',
  });
  await addEvidence(run, {
    kind: 'report',
    label: 'Generated test case repository Markdown',
    path: rel(markdownPath),
    phase: 'generate_tests',
  });
}

async function reseedStructuredDb(run: RunRecord, spec: RepositorySpec): Promise<void> {
  if (run.dryRun) {
    const drySpecPath = path.join(GENERATED_ROOT, run.id, 'dry-run-active-test-case-repository.json');
    await mkdir(path.dirname(drySpecPath), { recursive: true });
    await writeFile(drySpecPath, JSON.stringify(spec, null, 2) + '\n', 'utf8');
    await addEvidence(run, {
      kind: 'json',
      label: 'Dry-run active test case repository JSON',
      path: rel(drySpecPath),
      phase: 'reseed_structured_db',
    });
    await emit(run, 'reseed_structured_db', 'Dry-run structured DB reseed', 'succeeded', {
      summary: 'Dry run preserved source artifacts and recorded the generated repository under test_data/ui-qa.',
    });
    return;
  }

  const specPath = path.join(QAMVP_ROOT, 'test-doc/test-case-repository.json');
  await writeFile(specPath, JSON.stringify(spec, null, 2) + '\n', 'utf8');
  await addEvidence(run, {
    kind: 'json',
    label: 'Active test case repository JSON',
    path: rel(specPath),
    phase: 'reseed_structured_db',
  });
  await runCommand(
    run,
    'reseed_structured_db',
    'Build repository Markdown and workbook',
    'source ingestion/.venv/bin/activate && ingestion/.venv/bin/python test-doc/scripts/build_test_case_repository.py --spec test-doc/test-case-repository.json --workbook-out test_data/TestCases.xlsx --markdown-out test-doc/09-test-case-repository.md',
  );
  await runCommand(
    run,
    'reseed_structured_db',
    'Reload structured test cases into DB',
    `source ingestion/.venv/bin/activate && DATABASE_URL=${DATABASE_URL} ingestion/.venv/bin/python ingestion/scripts/ingest.py --format both`,
  );
  await addEvidence(run, {
    kind: 'workbook',
    label: 'Executable TestCases workbook',
    path: 'test_data/TestCases.xlsx',
    phase: 'reseed_structured_db',
  });
  await addEvidence(run, {
    kind: 'report',
    label: 'Rendered test case repository',
    path: 'test-doc/09-test-case-repository.md',
    phase: 'reseed_structured_db',
  });
}

async function auditIngestionGate(run: RunRecord): Promise<void> {
  const ts = stamp();
  const md = path.join(RESULTS_ROOT, `ingestion_audit_${ts}.md`);
  const js = path.join(RESULTS_ROOT, `ingestion_audit_${ts}.json`);
  if (run.dryRun) {
    const counts: FindingCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    await writeFile(
      md,
      '# Test Case Ingestion Audit Gate\n\nGate: PASS\n\nDry-run synthetic gate artifact generated by ui-qa.\n',
      'utf8',
    );
    await writeFile(
      js,
      JSON.stringify({ summary: { finding_counts: counts, dry_run: true } }, null, 2) + '\n',
      'utf8',
    );
    run.findingCounts = counts;
    run.blockerCount = 0;
    run.gateStatus = 'passed';
    await addEvidence(run, { kind: 'report', label: 'Dry-run ingestion audit report', path: rel(md), phase: 'audit_ingestion' });
    await addEvidence(run, { kind: 'json', label: 'Dry-run ingestion audit JSON', path: rel(js), phase: 'audit_ingestion' });
    await emit(run, 'audit_ingestion', 'Dry-run ingestion audit gate passed', 'succeeded', {
      summary: `Finding counts: ${JSON.stringify(counts)}.`,
    });
    return;
  }

  const command = `source ingestion/.venv/bin/activate && DATABASE_URL=${DATABASE_URL} ingestion/.venv/bin/python ingestion/scripts/audit_test_case_ingestion.py --report ${shellQuote(md)} --json ${shellQuote(js)}`;
  const result = await runCommand(run, 'audit_ingestion', 'Run ingestion audit gate', command, {
    allowFailure: true,
  });
  await addEvidence(run, { kind: 'report', label: 'Ingestion audit report', path: rel(md), phase: 'audit_ingestion' });
  await addEvidence(run, { kind: 'json', label: 'Ingestion audit JSON', path: rel(js), phase: 'audit_ingestion' });
  let counts: FindingCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  try {
    const data = JSON.parse(await readFile(js, 'utf8')) as { summary?: { finding_counts?: Partial<FindingCounts> } };
    counts = { ...counts, ...(data.summary?.finding_counts ?? {}) };
  } catch {
    counts.critical = 1;
  }
  run.findingCounts = counts;
  run.blockerCount = counts.critical + counts.high;
  if (result.exitCode !== 0 || counts.critical || counts.high) {
    run.gateStatus = 'blocked';
    await emit(run, 'audit_ingestion', 'Ingestion audit gate blocked', 'blocked', {
      summary: `Finding counts: ${JSON.stringify(counts)}.`,
    });
    throw new Error('Ingestion audit gate blocked execution.');
  }
  run.gateStatus = 'passed';
  await emit(run, 'audit_ingestion', 'Ingestion audit gate passed', 'succeeded', {
    summary: `Finding counts: ${JSON.stringify(counts)}.`,
  });
}

async function checkpoint(run: RunRecord, title: string, message: string): Promise<ApprovalRequest> {
  if (run.autoApprove) {
    await emit(run, 'checkpoint', title, 'succeeded', { summary: 'Auto-approved for this run.' });
    return { decision: 'approve', note: 'Auto-approved.' };
  }
  const cp: Checkpoint = { id: id('cp'), phase: 'checkpoint', title, message, createdAt: now() };
  run.checkpoints.push(cp);
  run.status = 'waiting';
  await emit(run, 'checkpoint', title, 'waiting', { summary: message });
  await persist(run);
  return new Promise<ApprovalRequest>((resolve) => approvals.set(run.id, resolve));
}

async function publishArtifacts(run: RunRecord): Promise<void> {
  await runCommand(
    run,
    'publish_artifacts',
    'Export repository JSON from DB',
    `source ingestion/.venv/bin/activate && DATABASE_URL=${DATABASE_URL} ingestion/.venv/bin/python ingestion/scripts/export_test_case_repository.py --output test-doc/test-case-repository.json`,
  );
  await runCommand(
    run,
    'publish_artifacts',
    'Render repository Markdown and workbook',
    'source ingestion/.venv/bin/activate && ingestion/.venv/bin/python test-doc/scripts/build_test_case_repository.py --spec test-doc/test-case-repository.json --workbook-out test_data/TestCases.xlsx --markdown-out test-doc/09-test-case-repository.md',
  );
  await addEvidence(run, { kind: 'json', label: 'Exported repository JSON', path: 'test-doc/test-case-repository.json', phase: 'publish_artifacts' });
  await addEvidence(run, { kind: 'workbook', label: 'Exported TestCases workbook', path: 'test_data/TestCases.xlsx', phase: 'publish_artifacts' });
}

async function runPlaywright(run: RunRecord): Promise<void> {
  await runCommand(run, 'execute_browser', 'Install Playwright dependencies', 'npm install --prefix playwright-runner');
  const workers = process.env.PLAYWRIGHT_WORKERS ?? '2';
  const grep = run.scope && run.scope !== 'all' ? ` --grep ${shellQuote(run.scope)}` : '';
  await runCommand(
    run,
    'execute_browser',
    'Run Playwright',
    `TC_ID=${shellQuote(run.scope || 'all')} PLAYWRIGHT_WORKERS=${workers} npx --prefix playwright-runner playwright test --config ${shellQuote(path.join(QAMVP_ROOT, 'playwright-runner/playwright.config.ts'))} --workers=${workers}${grep}`,
    { allowFailure: true },
  );
}

async function verifyEvidence(run: RunRecord): Promise<void> {
  if (run.dryRun) {
    const out = path.join(RESULTS_ROOT, `uiqa_evidence_verification_${stamp()}.json`);
    await writeFile(out, JSON.stringify({ checked: 0, missing: [], dry_run: true }, null, 2) + '\n', 'utf8');
    await addEvidence(run, { kind: 'json', label: 'Dry-run evidence verification', path: rel(out), phase: 'verify_evidence' });
    await emit(run, 'verify_evidence', 'Dry-run Playwright artifact verification', 'succeeded', {
      summary: 'Dry run skipped Playwright evidence checks.',
    });
    return;
  }

  const resultDir = path.join(QAMVP_ROOT, 'test_data/test-results');
  const tcDirs = (await readdir(resultDir, { withFileTypes: true })).filter((entry) => entry.isDirectory() && entry.name.startsWith('TC-'));
  const missing: string[] = [];
  let checked = 0;
  for (const tcDir of tcDirs) {
    const full = path.join(resultDir, tcDir.name);
    const children = await readdir(full, { withFileTypes: true });
    const latest = children
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('playwright_'))
      .map((entry) => entry.name)
      .sort()
      .at(-1);
    if (!latest) continue;
    checked += 1;
    const runDir = path.join(full, latest);
    for (const file of ['manifest.json', 'result.json', 'step-log.md', 'final-page-text.txt', 'trace.zip']) {
      if (!existsSync(path.join(runDir, file))) missing.push(`${tcDir.name}/${latest}/${file}`);
    }
  }
  const out = path.join(RESULTS_ROOT, `uiqa_evidence_verification_${stamp()}.json`);
  await writeFile(out, JSON.stringify({ checked, missing }, null, 2) + '\n', 'utf8');
  await addEvidence(run, { kind: 'json', label: 'Evidence verification', path: rel(out), phase: 'verify_evidence' });
  await emit(run, 'verify_evidence', 'Verify Playwright artifacts', missing.length ? 'warning' : 'succeeded', {
    summary: missing.length ? `Missing ${missing.length} expected artifact(s).` : `Verified latest artifacts for ${checked} test case(s).`,
  });
}

async function finalAudit(run: RunRecord): Promise<void> {
  const counts = run.findingCounts ?? { critical: 0, high: 0, medium: 0, low: 0 };
  const missingEvidence = run.events.some((event) => event.phase === 'verify_evidence' && event.status === 'warning');
  const verdict = counts.critical || counts.high || missingEvidence
    ? 'not_approved'
    : counts.medium
      ? 'approved_with_conditions'
      : 'approved';
  run.auditVerdict = verdict;
  const md = path.join(RESULTS_ROOT, `audit_uiqa_${stamp()}.md`);
  const body = `# Corporate QA Audit Report

## Executive Summary
Verdict: ${verdict.replaceAll('_', ' ')}

## Scope
- Source documents: ui-qa active source pack and test-doc artifacts
- KB/DB records: local Postgres pgvector structured test cases
- Execution artifacts: latest Playwright artifacts under test_data/test-results

## Independence Statement
This MVP audit is artifact-driven and treats Cursor SDK generation output as untrusted context.

## Findings
Finding counts: ${JSON.stringify(counts)}

## Approval Decision
Decision: ${verdict.replaceAll('_', ' ')}
`;
  await writeFile(md, body, 'utf8');
  await addEvidence(run, { kind: 'report', label: 'Final QA audit', path: rel(md), phase: 'audit_run' });
  await emit(run, 'audit_run', 'Run independent final audit', verdict === 'not_approved' ? 'blocked' : 'succeeded', {
    summary: `Verdict: ${verdict}.`,
  });
  if (verdict === 'not_approved') throw new Error('Final audit did not approve the run.');
}
