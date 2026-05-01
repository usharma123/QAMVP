CREATE TABLE IF NOT EXISTS source_document_versions (
  id bigserial PRIMARY KEY,
  document_id bigint NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  logical_doc_key text NOT NULL,
  document_kind text NOT NULL,
  version_label text NOT NULL,
  content_sha256 text NOT NULL,
  source_format text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  supersedes_document_id bigint REFERENCES documents(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (logical_doc_key, document_kind, source_format, content_sha256)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_source_doc_versions_active
  ON source_document_versions(logical_doc_key, document_kind, source_format)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_source_doc_versions_doc ON source_document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_source_doc_versions_kind ON source_document_versions(document_kind, is_active);
