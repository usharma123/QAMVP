"""Parse Markdown into chunks using # headings."""

from __future__ import annotations

import re

from common import RawChunk


HEADING_RE = re.compile(r"^(#{1,6})\s+(.+)$")
LINK_RE = re.compile(r"\[([^\]]*)\]\(([^)]+)\)")


def parse_markdown(md_path: str, max_chars: int = 3200, overlap: int = 200) -> list[RawChunk]:
    text = open(md_path, encoding="utf-8").read()
    lines = text.splitlines()
    heading_stack: list[tuple[int, str]] = []
    chunks: list[RawChunk] = []
    buf: list[str] = []
    line_start = 0
    urls_in_section: list[str] = []

    def flush(end_line: int):
        nonlocal buf, line_start, urls_in_section
        if not buf:
            urls_in_section = []
            return
        body = "\n".join(buf).strip()
        if not body:
            buf = []
            urls_in_section = []
            return
        path = " > ".join(h[1] for h in heading_stack) if heading_stack else "(preamble)"
        urls_in_section = []
        for m in LINK_RE.finditer(body):
            urls_in_section.append(m.group(2).strip())

        def emit(content: str, u: list[str], suffix: str = ""):
            chunks.append(
                RawChunk(
                    heading_path=path + suffix,
                    content=content,
                    metadata={"line_start": line_start, "line_end": end_line},
                    urls=list(dict.fromkeys(u)),
                )
            )

        if len(body) <= max_chars:
            emit(body, urls_in_section)
        else:
            paras = re.split(r"\n\n+", body)
            piece: list[str] = []
            piece_len = 0
            part = 0
            for p in paras:
                plen = len(p) + (2 if piece else 0)
                if piece_len + plen > max_chars and piece:
                    emit("\n\n".join(piece), urls_in_section if part == 0 else [], f" [part{part}]")
                    part += 1
                    joined = "\n\n".join(piece)
                    tail = joined[-overlap:] if len(joined) > overlap else joined
                    piece = [tail + "\n\n" + p] if tail.strip() else [p]
                    piece_len = len(piece[0])
                else:
                    if piece:
                        piece.append(p)
                    else:
                        piece = [p]
                    piece_len += plen
            if piece:
                emit("\n\n".join(piece), urls_in_section if part == 0 else [], f" [part{part}]" if part else "")

        buf = []
        urls_in_section = []

    for i, line in enumerate(lines):
        m = HEADING_RE.match(line)
        if m:
            flush(i)
            level = len(m.group(1))
            title = m.group(2).strip()
            heading_stack = [h for h in heading_stack if h[0] < level]
            heading_stack.append((level, title[:500]))
            line_start = i + 1
            continue
        if not buf and line.strip():
            line_start = i
        buf.append(line)

    flush(len(lines))
    return chunks
