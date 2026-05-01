CREATE TABLE IF NOT EXISTS requirements (
  requirement_id text PRIMARY KEY,
  requirement_type text NOT NULL,
  source_document_id bigint REFERENCES documents(id) ON DELETE CASCADE,
  source_chunk_id bigint REFERENCES chunks(id) ON DELETE CASCADE,
  document_kind text NOT NULL,
  title text NOT NULL DEFAULT '',
  requirement_text text NOT NULL DEFAULT '',
  canonical_hash text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_requirements_document_kind ON requirements(document_kind);
CREATE INDEX IF NOT EXISTS idx_requirements_source_chunk ON requirements(source_chunk_id);

CREATE TABLE IF NOT EXISTS requirement_links (
  id text PRIMARY KEY,
  source_requirement_id text NOT NULL REFERENCES requirements(requirement_id) ON DELETE CASCADE,
  target_requirement_id text NOT NULL REFERENCES requirements(requirement_id) ON DELETE CASCADE,
  link_type text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0.5,
  evidence_chunk_id bigint REFERENCES chunks(id) ON DELETE SET NULL,
  evidence text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_requirement_links_source ON requirement_links(source_requirement_id);
CREATE INDEX IF NOT EXISTS idx_requirement_links_target ON requirement_links(target_requirement_id);
CREATE INDEX IF NOT EXISTS idx_requirement_links_type ON requirement_links(link_type);

CREATE TABLE IF NOT EXISTS rtm_rows (
  rtm_id text PRIMARY KEY,
  business_requirement_id text REFERENCES requirements(requirement_id) ON DELETE SET NULL,
  functional_requirement_id text REFERENCES requirements(requirement_id) ON DELETE SET NULL,
  hld_requirement_id text REFERENCES requirements(requirement_id) ON DELETE SET NULL,
  lld_requirement_id text REFERENCES requirements(requirement_id) ON DELETE SET NULL,
  coverage_status text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0.5,
  evidence_chunk_ids bigint[] NOT NULL DEFAULT '{}',
  notes text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rtm_rows_status ON rtm_rows(coverage_status);
CREATE INDEX IF NOT EXISTS idx_rtm_rows_confidence ON rtm_rows(confidence);
