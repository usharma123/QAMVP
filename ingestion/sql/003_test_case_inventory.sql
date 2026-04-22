-- Add structured test-case inventory support to existing ingestion DBs.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'documents_source_format_check'
          AND conrelid = 'documents'::regclass
    ) THEN
        ALTER TABLE documents DROP CONSTRAINT documents_source_format_check;
    END IF;
END $$;

ALTER TABLE documents
    ADD CONSTRAINT documents_source_format_check
    CHECK (source_format IN ('docx', 'md', 'xlsx'));

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
