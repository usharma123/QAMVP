"""Extract traceability-style entities from chunk text."""

from __future__ import annotations

import re
from dataclasses import dataclass

REQ_PATTERN = re.compile(
    r"\bREQ-(?:FR|NFR|SEC)-(?:FUT-)?\d+\b", re.I
)
BR_PATTERN = re.compile(r"\bBR-\d+\b", re.I)
TKT_PATTERN = re.compile(r"\bTKT-QAMVP-\d+\b", re.I)
TC_PATTERN = re.compile(r"\bTC-[A-Z]{2,}-\d{3}\b|\bTC-\d{3}\b|\bTC-[A-Z0-9-]+\b", re.I)
SECTION_PATTERN = re.compile(r"\b(?:BRD|FRS|TDS)\s*§\s*[\d.]+", re.I)


@dataclass
class EntityHit:
    entity_type: str
    canonical_id: str


def extract_entities(text: str) -> list[EntityHit]:
    hits: list[EntityHit] = []
    for m in REQ_PATTERN.finditer(text):
        hits.append(EntityHit("REQ", m.group(0).upper()))
    for m in BR_PATTERN.finditer(text):
        hits.append(EntityHit("BR", m.group(0).upper()))
    for m in TKT_PATTERN.finditer(text):
        hits.append(EntityHit("TKT", m.group(0).upper()))
    for m in TC_PATTERN.finditer(text):
        canon = m.group(0).upper()
        if canon.startswith("TC-"):
            hits.append(EntityHit("TC", canon))
    for m in SECTION_PATTERN.finditer(text):
        raw = " ".join(m.group(0).split())
        hits.append(EntityHit("SECTION", raw.upper()))
    # Dedupe by (type, id)
    seen: set[tuple[str, str]] = set()
    out: list[EntityHit] = []
    for h in hits:
        key = (h.entity_type, h.canonical_id)
        if key not in seen:
            seen.add(key)
            out.append(h)
    return out
