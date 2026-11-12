"""Verify editable text and SVG-to-PNG relationships, then make a PNG-only test copy."""

from collections import Counter
import json
from pathlib import Path, PurePosixPath
import posixpath
import re
import struct
import sys
from xml.etree import ElementTree as ET
from zipfile import ZIP_DEFLATED, ZipFile

from package_pptx import A, P, PR, R, SVG, q, xml


def inspect(pptx, compatibility_copy):
    totals = Counter()
    slides = []
    with ZipFile(pptx) as source:
        names = set(source.namelist())
        corrupt = source.testzip()
        if corrupt:
            raise ValueError(f"Corrupt ZIP entry: {corrupt}")
        patches = {}
        slide_paths = sorted((n for n in names if re.fullmatch(r"ppt/slides/slide\d+\.xml", n)),
                             key=lambda n: int(re.search(r"(\d+)\.xml", n)[1]))
        for name in slide_paths:
            stats = Counter()
            path = PurePosixPath(name)
            rel_path = str(path.parent / "_rels" / (path.name + ".rels"))
            rels = ET.fromstring(source.read(rel_path))
            targets = {r.get("Id"): posixpath.normpath(posixpath.join(str(path.parent), r.get("Target").lstrip("/")))
                       if not r.get("Target").startswith("/") else r.get("Target").lstrip("/") for r in rels}
            root = ET.fromstring(source.read(name))
            stats["editableTextBoxes"] = len(list(root.iter(q(P, "txBody"))))
            stats["editableTextRuns"] = sum(bool(t.text and t.text.strip()) for t in root.iter(q(A, "t")))
            for blip in root.iter(q(A, "blip")):
                for ext_list in blip.findall(q(A, "extLst")):
                    for ext in list(ext_list):
                        svg = ext.find(q(SVG, "svgBlip"))
                        if svg is None:
                            continue
                        vector = targets[svg.get(q(R, "embed"))]
                        fallback = targets[blip.get(q(R, "embed"))]
                        svg_root = ET.fromstring(source.read(vector))
                        png = source.read(fallback)
                        if png[:8] != b"\x89PNG\r\n\x1a\n" or len(png) < 24:
                            raise ValueError(f"Missing PNG fallback for {vector}")
                        width, height = struct.unpack_from(">II", png, 16)
                        if width <= 1 or height <= 1:
                            raise ValueError(f"Placeholder PNG fallback for {vector}")
                        stats["svgPictures"] += 1
                        stats["svgWithVectorGeometry"] += int(any(e.tag.split("}")[-1] in
                            {"path", "line", "rect", "circle", "polygon", "polyline", "ellipse"} for e in svg_root.iter()))
                        stats["svgWithEmbeddedRaster"] += int(any(e.tag.split("}")[-1] == "image" for e in svg_root.iter()))
                        ext_list.remove(ext)
                    if not len(ext_list):
                        blip.remove(ext_list)
            totals.update(stats)
            slides.append(dict(stats))
            patches[name] = xml(root)
        with ZipFile(compatibility_copy, "w", ZIP_DEFLATED) as result:
            for name in source.namelist():
                result.writestr(name, patches[name] if name in patches else source.read(name))
    return {"slideCount": len(slides), "totals": dict(totals), "slides": slides}


if __name__ == "__main__":
    print(json.dumps(inspect(Path(sys.argv[1]), Path(sys.argv[2]))))
