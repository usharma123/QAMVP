#!/usr/bin/env bash
# Export test-doc Markdown to Word (.docx) via Pandoc.
# Usage:
#   ./test-doc/scripts/export-docx.sh           # all numbered docs 01-09
#   ./test-doc/scripts/export-docx.sh --core      # BRD + FRS only
set -euo pipefail

ROOT="${TEST_DOC_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

if ! command -v pandoc &>/dev/null; then
  echo "ERROR: pandoc not found. Install from https://pandoc.org/installing.html" >&2
  exit 1
fi

CORE_ONLY=false
if [[ "${1:-}" == "--core" ]]; then
  CORE_ONLY=true
fi

export_one() {
  local base="$1"
  local md="${ROOT}/${base}.md"
  local docx="${ROOT}/${base}.docx"
  if [[ ! -f "$md" ]]; then
    echo "SKIP (missing): $md" >&2
    return 0
  fi
  echo "pandoc: $md -> $docx"
  pandoc "$md" -o "$docx" --from markdown --to docx
}

export_one "01-business-requirements-document"
export_one "02-functional-requirements-specification"

if [[ "$CORE_ONLY" == false ]]; then
  export_one "03-test-design-specification"
  export_one "04-test-strategy"
  export_one "05-test-plan"
  export_one "06-requirements-traceability-matrix"
  export_one "07-test-data-environment-specification"
  export_one "08-quality-risk-defect-governance"
  export_one "09-test-case-repository"
fi

echo "Done."
