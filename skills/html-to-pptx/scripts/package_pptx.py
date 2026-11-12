"""Attach SVGs to real PNG picture fallbacks and optionally embed editable fonts."""

import json
from pathlib import Path
import sys
from zipfile import ZIP_DEFLATED, ZipFile
from xml.etree import ElementTree as ET

from font_embedding import pack_font

P = "http://schemas.openxmlformats.org/presentationml/2006/main"
A = "http://schemas.openxmlformats.org/drawingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PR = "http://schemas.openxmlformats.org/package/2006/relationships"
CT = "http://schemas.openxmlformats.org/package/2006/content-types"
SVG = "http://schemas.microsoft.com/office/drawing/2016/SVG/main"
EXTENSION = "{96DAC541-7B7A-43D3-8B79-37D633B846F1}"
for prefix, uri in (("p", P), ("a", A), ("r", R), ("asvg", SVG)):
    ET.register_namespace(prefix, uri)


def q(ns, name):
    return f"{{{ns}}}{name}"


def add(root, ns, tag, **attrs):
    return ET.SubElement(root, q(ns, tag), attrs)


def xml(root, default=None):
    if default:
        ET.register_namespace("", default)
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def read_xml(archive, name):
    return ET.fromstring(archive.read(name))


def add_fonts(source, edits, types, fonts):
    groups = {}
    for font in fonts:
        if not font.get("embed"):
            continue
        family = font.get("officeFamily", font["family"])
        variant = font.get("variant", "regular")
        if variant not in {"regular", "bold", "italic", "boldItalic"}:
            raise ValueError(f"Invalid embedded font variant: {variant}")
        slots = groups.setdefault(family, {})
        if variant in slots:
            raise ValueError(f"Duplicate {family} {variant}")
        slots[variant] = Path(font["file"])
    if not groups:
        return
    name = "ppt/presentation.xml"
    rel_name = "ppt/_rels/presentation.xml.rels"
    root = read_xml(source, name)
    rels = read_xml(source, rel_name)
    root.set("embedTrueTypeFonts", "1")
    root.set("saveSubsetFonts", "0")
    fonts_node = ET.Element(q(P, "embeddedFontLst"))
    insertion = {"custShowLst", "photoAlbum", "custDataLst", "defaultTextStyle", "modifyVerifier", "extLst"}
    index = next((i for i, e in enumerate(root) if e.tag.split("}")[-1] in insertion), len(root))
    root.insert(index, fonts_node)
    counter = 0
    for family, slots in groups.items():
        group = add(fonts_node, P, "embeddedFont")
        add(group, P, "font", typeface=family)
        for variant in ("regular", "bold", "italic", "boldItalic"):
            if variant not in slots:
                continue
            counter += 1
            path = f"fonts/font{counter}.fntdata"
            rid = f"rIdEmbeddedFont{counter}"
            add(group, P, variant).set(q(R, "id"), rid)
            add(rels, PR, "Relationship", Id=rid, Type=R + "/font", Target=path)
            edits["ppt/" + path] = pack_font(slots[variant].read_bytes())
    add(types, CT, "Default", Extension="fntdata", ContentType="application/x-fontdata")
    edits[name] = xml(root)
    edits[rel_name] = xml(rels, PR)


def package(work, output):
    manifest = json.loads((work / "graphics.json").read_text())
    config = json.loads((work / "config.json").read_text())
    edits = {}
    with ZipFile(work / "draft.pptx") as source:
        types = read_xml(source, "[Content_Types].xml")
        if any(graphic for slide in manifest for graphic in slide):
            add(types, CT, "Default", Extension="svg", ContentType="image/svg+xml")
        for number, graphics in enumerate(manifest, 1):
            name = f"ppt/slides/slide{number}.xml"
            rel_name = f"ppt/slides/_rels/slide{number}.xml.rels"
            root = read_xml(source, name)
            rels = read_xml(source, rel_name)
            pictures = list(root.iter(q(P, "pic")))
            if len(pictures) != len(graphics):
                raise ValueError(f"Picture count mismatch on slide {number}")
            for index, (picture, graphic) in enumerate(zip(pictures, graphics), 1):
                if graphic is None:
                    continue
                blip = next(picture.iter(q(A, "blip")))
                rid = f"rIdBrowserSvg{index}"
                extension = add(add(blip, A, "extLst"), A, "ext", uri=EXTENSION)
                add(extension, SVG, "svgBlip").set(q(R, "embed"), rid)
                add(rels, PR, "Relationship", Id=rid, Type=R + "/image", Target=f"../media/{graphic}")
                edits[f"ppt/media/{graphic}"] = (work / graphic).read_bytes()
            known = {font.get("officeFamily", font["family"]) for font in config.get("fonts", [])}
            for run in root.iter(q(A, "rPr")):
                latin = run.find(q(A, "latin"))
                if latin is None:
                    continue
                face = latin.get("typeface")
                east_asian = face if face in known else config.get("eastAsianFont")
                if not east_asian:
                    continue
                existing = run.find(q(A, "ea"))
                if existing is not None:
                    existing.attrib.clear()
                    existing.set("typeface", east_asian)
                else:
                    element = ET.Element(q(A, "ea"), {"typeface": east_asian})
                    run.insert(list(run).index(latin) + 1, element)
            edits[name] = xml(root)
            edits[rel_name] = xml(rels, PR)
        add_fonts(source, edits, types, config.get("fonts", []))
        edits["[Content_Types].xml"] = xml(types, CT)
        with ZipFile(output, "w", ZIP_DEFLATED) as result:
            for name in source.namelist():
                result.writestr(name, edits.pop(name) if name in edits else source.read(name))
            for name, data in edits.items():
                result.writestr(name, data)


if __name__ == "__main__":
    package(Path(sys.argv[1]), Path(sys.argv[2]))
