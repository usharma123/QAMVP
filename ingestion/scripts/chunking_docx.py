"""Parse .docx into chunks using heading styles + size limits."""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from common import RawChunk
from docx import Document
from docx.oxml.ns import qn

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def _paragraph_hyperlink_urls(paragraph) -> list[str]:
    urls: list[str] = []
    for h in paragraph._p.findall(f".//{{{W_NS}}}hyperlink"):
        rid = h.get(qn("r:id"))
        if not rid or paragraph.part is None:
            continue
        try:
            rel = paragraph.part.rels[rid]
            urls.append(str(rel.target_ref))
        except KeyError:
            continue
    return urls


def _heading_level(style_name: str) -> int | None:
    if not style_name:
        return None
    m = re.match(r"Heading\s*(\d+)", style_name, re.I)
    if m:
        return int(m.group(1))
    if style_name.lower() in ("title", "subtitle"):
        return 1 if style_name.lower() == "title" else 2
    return None


@dataclass
class DocxBlock:
    para_index: int
    style: str
    text: str
    urls: list[str] = field(default_factory=list)


def iter_docx_blocks(doc_path: str) -> list[DocxBlock]:
    doc = Document(doc_path)
    blocks: list[DocxBlock] = []
    for i, para in enumerate(doc.paragraphs):
        style = para.style.name if para.style else ""
        text = (para.text or "").strip()
        urls = _paragraph_hyperlink_urls(para)
        if not text and not urls:
            continue
        blocks.append(DocxBlock(para_index=i, style=style, text=text, urls=urls))
    return blocks


def chunk_docx_blocks(
    blocks: list[DocxBlock],
    max_chars: int = 3200,
    overlap: int = 200,
) -> list[RawChunk]:
    """Build chunks from a flat list of blocks (headings reset section)."""
    heading_stack: list[tuple[int, str]] = []
    chunks: list[RawChunk] = []
    buf_lines: list[str] = []
    buf_urls: list[str] = []
    buf_meta: dict = {"para_start": None, "para_end": None}

    def flush():
        nonlocal buf_lines, buf_urls, buf_meta
        if not buf_lines and not buf_urls:
            buf_meta = {"para_start": None, "para_end": None}
            buf_urls = []
            return
        text = "\n".join(buf_lines).strip()
        if not text and not buf_urls:
            buf_lines = []
            buf_urls = []
            buf_meta = {"para_start": None, "para_end": None}
            return
        path = " > ".join(h[1] for h in heading_stack) if heading_stack else "(preamble)"
        meta = {**buf_meta, "heading_stack_depth": len(heading_stack)}
        urls = list(dict.fromkeys(buf_urls))

        def emit_piece(content: str, piece_urls: list[str], ord_suffix: int = 0):
            chunks.append(
                RawChunk(
                    heading_path=path + (f" [part{ord_suffix}]" if ord_suffix else ""),
                    content=content,
                    metadata=dict(meta),
                    urls=list(piece_urls),
                )
            )

        if len(text) <= max_chars:
            emit_piece(text or "(link-only)", urls)
        else:
            paras = text.split("\n\n")
            piece: list[str] = []
            piece_len = 0
            part = 0
            for p in paras:
                plen = len(p) + (2 if piece else 0)
                if piece_len + plen > max_chars and piece:
                    emit_piece("\n\n".join(piece), urls if part == 0 else [], part)
                    part += 1
                    # overlap: last overlap chars from previous
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
                emit_piece("\n\n".join(piece), urls if part == 0 else [], part)

        buf_lines = []
        buf_urls = []
        buf_meta = {"para_start": None, "para_end": None}

    for b in blocks:
        level = _heading_level(b.style)
        if level is not None and b.text:
            flush()
            heading_stack = [h for h in heading_stack if h[0] < level]
            heading_stack.append((level, b.text[:500]))
            if buf_meta["para_start"] is None:
                buf_meta["para_start"] = b.para_index
            buf_meta["para_end"] = b.para_index
            continue
        if buf_meta["para_start"] is None:
            buf_meta["para_start"] = b.para_index
        buf_meta["para_end"] = b.para_index
        if b.text:
            buf_lines.append(b.text)
        buf_urls.extend(b.urls)

    flush()
    return chunks


def parse_docx(doc_path: str, max_chars: int = 3200, overlap: int = 200) -> list[RawChunk]:
    blocks = iter_docx_blocks(doc_path)
    if not any(_heading_level(b.style) for b in blocks):
        # Fallback: window by character on concatenated paragraphs
        return _fallback_window_chunks(blocks, max_chars, overlap)
    return chunk_docx_blocks(blocks, max_chars, overlap)


def _fallback_window_chunks(
    blocks: list[DocxBlock], max_chars: int, overlap: int
) -> list[RawChunk]:
    text_parts: list[str] = []
    all_urls: list[str] = []
    meta_start = blocks[0].para_index if blocks else 0
    meta_end = blocks[-1].para_index if blocks else 0
    for b in blocks:
        if b.text:
            text_parts.append(b.text)
        all_urls.extend(b.urls)
    full = "\n\n".join(text_parts)
    if not full:
        return []
    chunks: list[RawChunk] = []
    start = 0
    i = 0
    while start < len(full):
        end = min(start + max_chars, len(full))
        piece = full[start:end].strip()
        if piece:
            chunks.append(
                RawChunk(
                    heading_path=f"(no headings) [window {i}]",
                    content=piece,
                    metadata={
                        "para_start": meta_start,
                        "para_end": meta_end,
                        "fallback": True,
                    },
                    urls=list(dict.fromkeys(all_urls)) if i == 0 else [],
                )
            )
        i += 1
        if end >= len(full):
            break
        start = end - overlap
    return chunks
