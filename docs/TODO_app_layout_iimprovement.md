# TODO: Improve `generate app layout` with Design Doc Ingestion

## Problem
The current `generate app layout` command crawls the live DOM but cannot infer:
- User roles and credentials (not in the DOM)
- Business rules ("dashboard only shows approved trades", BUY+SELL matching logic)
- Conditional UI behaviour ("GTC shows expiry date field")
- Expected assertion values ("Pending: N", "Total Trades: N")
- Semantic role names (Maker vs Checker)

## Proposed Approach
Ingest application design documents (HLD, UI specs) alongside the DOM crawl to give
the LLM both structural accuracy (from the crawl) and semantic richness (from the spec).

## Suggested Flow

Design docs (roles, rules, behaviour)
+
Live DOM crawl (element names, routes)
↓
LLM synthesis
↓
app_layout_generated.md
↓
Human review & promote to app_layout.md


## Implementation Notes
- Accept a docs folder path in `generate app layout` command
- Supported formats: Markdown, plain text (native), PDF (needs PyMuPDF or similar)
- Pass only relevant sections (UI, roles) to avoid bloating the prompt
- Crawl still needed for live `data-testid` locator names — specs won't have those
- Keep the human review + promote step (spec docs go stale; DOM is always live)
## Risks
- Specs go stale faster than code — outdated spec → wrong layout
- Large docs need chunking to avoid prompt size issues (not a concern at POC scale)
## Status
- [ ] Decide on doc format(s) to support
- [ ] Implement doc ingestion in `generate_app_layout_flow()`
- [ ] Update `generate_app_layout_prompt.md` to accept both spec + crawl sections
- [ ] Test with a one-page UI spec for the mock trading app