#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Extrage textul din docs/*.docx si docs/*.odt in .ai/docs-extracted.json.

Doar biblioteca standard: zipfile pentru decomprimare, ElementTree pentru XML.
DOCX: word/document.xml, word/header*.xml, word/footer*.xml, word/footnotes.xml;
fiecare w:p devine o inregistrare, cu ID-ul paragrafului in partea respectiva.
ODT: text:p si text:h din content.xml.
Tintele hyperlinkurilor (din *.rels la DOCX, xlink:href la ODT) sunt puse inline
ca "text (tinta)". Paragrafele goale sunt ignorate.
"""

import json
import sys
import zipfile
from pathlib import Path, PurePosixPath
from xml.etree import ElementTree

BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent
DOCS_DIR = PROJECT_DIR / "docs"
OUTPUT_FILE = BASE_DIR / "docs-extracted.json"

REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
R_ID_ATTR = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
XLINK_HREF_ATTR = "{http://www.w3.org/1999/xlink}href"

ODT_TEXT_NS = "urn:oasis:names:tc:opendocument:xmlns:text:1.0"
ODT_P_TAG = "{%s}p" % ODT_TEXT_NS
ODT_H_TAG = "{%s}h" % ODT_TEXT_NS
ODT_A_TAG = "{%s}a" % ODT_TEXT_NS
ODT_S_TAG = "{%s}s" % ODT_TEXT_NS
ODT_TAB_TAG = "{%s}tab" % ODT_TEXT_NS
ODT_LINE_BREAK_TAG = "{%s}line-break" % ODT_TEXT_NS
ODT_SPACE_COUNT_ATTR = "{%s}c" % ODT_TEXT_NS

DOCX_HEAD = "word/document.xml"
DOCX_TAIL = "word/footnotes.xml"


def configure_stdout():
    """Evita erorile de codare la consola Windows pe nume de fisiere non-ASCII."""
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is None:
            continue
        try:
            reconfigure(encoding="utf-8", errors="replace")
        except (ValueError, OSError):
            pass


def source_label(path):
    """Calea relativa la proiect, cu separator '/' (stabila pe Windows)."""
    try:
        return path.relative_to(PROJECT_DIR).as_posix()
    except ValueError:
        return path.name


def namespace_of(tag):
    if tag.startswith("{"):
        return tag[1:tag.index("}")]
    return ""


def read_xml(archive, name):
    try:
        payload = archive.read(name)
    except KeyError:
        return None
    return ElementTree.fromstring(payload)


def load_relationships(archive, part):
    """Harta rId -> Target din <parte>/_rels/<fisier>.rels."""
    part_path = PurePosixPath(part)
    rels_name = str(part_path.parent / "_rels" / (part_path.name + ".rels"))
    root = read_xml(archive, rels_name)
    if root is None:
        return {}
    targets = {}
    for relation in root.iter("{%s}Relationship" % REL_NS):
        rel_id = relation.get("Id")
        target = relation.get("Target")
        if rel_id and target:
            targets[rel_id] = target
    return targets


def walk_word(element, w_ns, rel_targets, chunks):
    """Concateneaza w:t din paragraf; hyperlinkurile devin 'text (tinta)'."""
    for child in element:
        tag = child.tag
        if tag == "{%s}t" % w_ns:
            chunks.append(child.text or "")
        elif tag == "{%s}tab" % w_ns:
            chunks.append("\t")
        elif tag in ("{%s}br" % w_ns, "{%s}cr" % w_ns):
            chunks.append("\n")
        elif tag == "{%s}hyperlink" % w_ns:
            inner = []
            walk_word(child, w_ns, rel_targets, inner)
            text = "".join(inner)
            target = rel_targets.get(child.get(R_ID_ATTR))
            if target:
                chunks.append(text + " (" + target + ")" if text else target)
            else:
                chunks.append(text)
        elif tag in ("{%s}p" % w_ns, "{%s}tbl" % w_ns):
            # paragrafele/tabelele imbricate sunt inregistrate separat de catre apelant
            continue
        else:
            walk_word(child, w_ns, rel_targets, chunks)


def docx_paragraph_text(element, w_ns, rel_targets):
    chunks = []
    walk_word(element, w_ns, rel_targets, chunks)
    return "".join(chunks)


def docx_parts(names):
    """Ordinea partilor: document.xml, headere, footere, footnotes.xml."""
    parts = []
    if DOCX_HEAD in names:
        parts.append(DOCX_HEAD)
    for prefix in ("word/header", "word/footer"):
        parts.extend(
            sorted(
                name
                for name in names
                if name.startswith(prefix)
                and name.endswith(".xml")
                and "/" not in name[len("word/"):]
            )
        )
    if DOCX_TAIL in names:
        parts.append(DOCX_TAIL)
    return parts


def extract_docx(path):
    records = []
    source = source_label(path)
    with zipfile.ZipFile(path) as archive:
        names = set(archive.namelist())
        for part in docx_parts(names):
            root = read_xml(archive, part)
            if root is None:
                continue
            w_ns = namespace_of(root.tag)
            rel_targets = load_relationships(archive, part)
            for number, element in enumerate(root.iter("{%s}p" % w_ns), 1):
                text = docx_paragraph_text(element, w_ns, rel_targets).strip()
                if not text:
                    continue
                records.append(
                    {
                        "source": source,
                        "part": part,
                        "paragraph": number,
                        "text": text,
                    }
                )
    return records


def odt_chunks(element, chunks=None):
    """Aduna textul unui text:p / text:h; hyperlinkurile devin 'text (tinta)'."""
    if chunks is None:
        chunks = []
    if element.text:
        chunks.append(element.text)
    for child in element:
        tag = child.tag
        if tag in (ODT_P_TAG, ODT_H_TAG):
            # paragraf imbricat (note, cadre) -> inregistrare separata
            pass
        elif tag == ODT_A_TAG:
            inner = []
            odt_chunks(child, inner)
            text = "".join(inner)
            href = child.get(XLINK_HREF_ATTR)
            if href:
                chunks.append(text + " (" + href + ")" if text else href)
            else:
                chunks.append(text)
        elif tag == ODT_S_TAG:
            count = child.get(ODT_SPACE_COUNT_ATTR)
            chunks.append(" " * int(count) if count and count.isdigit() else " ")
        elif tag == ODT_TAB_TAG:
            chunks.append("\t")
        elif tag == ODT_LINE_BREAK_TAG:
            chunks.append("\n")
        else:
            odt_chunks(child, chunks)
        if child.tail:
            chunks.append(child.tail)
    return chunks


def extract_odt(path):
    records = []
    source = source_label(path)
    with zipfile.ZipFile(path) as archive:
        root = read_xml(archive, "content.xml")
        if root is None:
            return records
        number = 0
        for element in root.iter():
            if element.tag not in (ODT_P_TAG, ODT_H_TAG):
                continue
            number += 1
            text = "".join(odt_chunks(element)).strip()
            if not text:
                continue
            records.append(
                {
                    "source": source,
                    "part": "content.xml",
                    "paragraph": number,
                    "text": text,
                }
            )
    return records


def main():
    configure_stdout()
    if not DOCS_DIR.is_dir():
        print("Folderul docs nu exista: %s" % DOCS_DIR, file=sys.stderr)
        return 1

    documents = sorted(
        path
        for path in DOCS_DIR.iterdir()
        if path.is_file() and path.suffix.lower() in (".docx", ".odt")
    )
    if not documents:
        print("Niciun fisier .docx/.odt in %s" % DOCS_DIR, file=sys.stderr)
        return 1

    all_records = []
    total_paragraphs = 0
    total_chars = 0
    failures = 0

    for path in documents:
        try:
            if path.suffix.lower() == ".docx":
                records = extract_docx(path)
            else:
                records = extract_odt(path)
        except (zipfile.BadZipFile, ElementTree.ParseError) as error:
            print("%s: eroare (%s)" % (source_label(path), error), file=sys.stderr)
            failures += 1
            continue

        chars = sum(len(record["text"]) for record in records)
        total_paragraphs += len(records)
        total_chars += chars
        all_records.extend(records)
        print(
            "%s: %d paragrafe, %d caractere"
            % (source_label(path), len(records), chars)
        )

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_FILE.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(all_records, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    print(
        "TOTAL: %d fisiere, %d paragrafe, %d caractere"
        % (len(documents) - failures, total_paragraphs, total_chars)
    )
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
