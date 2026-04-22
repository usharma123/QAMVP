from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class RawChunk:
    heading_path: str
    content: str
    metadata: dict
    urls: list[str] = field(default_factory=list)
