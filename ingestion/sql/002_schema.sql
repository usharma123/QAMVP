-- Ingestion schema: documents, chunks (pgvector), entities, relationships,
-- and structured test-case inventory.

CREATE TABLE IF NOT EXISTS documents (
    id BIGSERIAL PRIMARY KEY,
    path TEXT NOT NULL,
    source_format TEXT NOT NULL CHECK (source_format IN ('docx', 'md', 'xlsx')),
    title TEXT,
    kind TEXT,
    logical_doc_key TEXT,
    content_sha256 TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (path, source_format)
);

CREATE TABLE IF NOT EXISTS chunks (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
    ordinal INT NOT NULL,
    heading_path TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL,
    embedding vector(384),
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE (document_id, ordinal)
);

CREATE INDEX IF NOT EXISTS idx_chunks_document ON chunks (document_id);

CREATE TABLE IF NOT EXISTS entities (
    id BIGSERIAL PRIMARY KEY,
    entity_type TEXT NOT NULL,
    canonical_id TEXT NOT NULL,
    document_id BIGINT NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
    chunk_id BIGINT NOT NULL REFERENCES chunks (id) ON DELETE CASCADE,
    first_seen TEXT
);

CREATE INDEX IF NOT EXISTS idx_entities_document ON entities (document_id);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities (entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_canonical ON entities (canonical_id);

CREATE TABLE IF NOT EXISTS relationships (
    id BIGSERIAL PRIMARY KEY,
    source_chunk_id BIGINT NOT NULL REFERENCES chunks (id) ON DELETE CASCADE,
    source_document_id BIGINT NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
    target_path TEXT,
    target_anchor TEXT,
    rel_type TEXT NOT NULL,
    evidence TEXT
);

CREATE INDEX IF NOT EXISTS idx_rel_source_chunk ON relationships (source_chunk_id);
CREATE INDEX IF NOT EXISTS idx_rel_source_doc ON relationships (source_document_id);
CREATE INDEX IF NOT EXISTS idx_rel_type ON relationships (rel_type);

CREATE TABLE IF NOT EXISTS test_cases (
    id BIGSERIAL PRIMARY KEY,
    test_case_id TEXT NOT NULL UNIQUE,
    requirement_ids TEXT[] NOT NULL DEFAULT '{}',
    title TEXT,
    objective TEXT,
    priority TEXT,
    suite TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}',
    source_document_id BIGINT REFERENCES documents (id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_test_cases_requirement_ids ON test_cases USING gin (requirement_ids);
CREATE INDEX IF NOT EXISTS idx_test_cases_suite ON test_cases (suite);

CREATE TABLE IF NOT EXISTS test_case_steps (
    id BIGSERIAL PRIMARY KEY,
    test_case_id TEXT NOT NULL REFERENCES test_cases (test_case_id) ON DELETE CASCADE,
    requirement_id TEXT NOT NULL,
    step_number INT NOT NULL,
    step_description TEXT NOT NULL,
    expected_output TEXT,
    test_data TEXT,
    source_row INT,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE (test_case_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_test_case_steps_requirement ON test_case_steps (requirement_id);
CREATE INDEX IF NOT EXISTS idx_test_case_steps_case ON test_case_steps (test_case_id);

CREATE INDEX IF NOT EXISTS chunks_embedding_hnsw ON chunks
    USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS chunks_content_fts ON chunks
    USING gin (to_tsvector('english', coalesce(content, '')));
