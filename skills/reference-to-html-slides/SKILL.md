---
name: reference-to-html-slides
description: Build HTML slides from a reference HTML, deck, PDF, or screenshot. Match the layout and vector artwork, then compare source and candidate at pixel level.
---

# Reference to HTML slides

Use this skill to apply a reference's visual system to supplied presentation content or to reconstruct a reference deck in HTML. Read [reference inspection and comparison](references/workflow.md).

1. Confirm which input supplies the design and which supplies the content. Identify cover, divider, body, diagram, table, and closing layouts as applicable. Record actual viewport, grids, text hierarchy, colors, logos, margins, page numbers, and assets.
2. For HTML references, render the relevant state and inspect DOM geometry, computed styles, actual fonts, and SVG coordinates. Reuse source markup, CSS, and vector assets when available and authorized. For decks, render representative layouts and inspect slide/master geometry and media. Use the evidence that is available for each reference.
3. Build HTML with live text, reusable layout CSS, and actual SVG artwork for diagrams and arrows. Preserve source viewBox, markers, stroke joins and caps, transforms, opacity, and clipping wherever available. Measure ambiguous shapes against the reference. Use authentic raster assets at their native resolution when supplied.
4. If the reference uses page leads or the user requests them, write one for each page. State what to look for or the conclusion supported by the page. Match the reference’s placement and typographic hierarchy. Keep numbers and claims grounded in the supplied content.
5. Compare at the same viewport, scale, browser, and state. For a reconstruction, compare corresponding slides and inspect pixel diffs. With different content, compare the reusable layout and unchanged visual regions, then verify every slide's new content fits. Report pixel equality only for comparisons that actually return zero changed pixels.
6. Deliver HTML and its necessary assets. If PPTX is requested, pass the canvas dimensions and slide selector to `html-to-pptx` when available and run its independent output checks.

Example request: “Use this HTML deck as a visual reference. Apply its cover, dividers and diagrams to my outline, then compare the rendered pages.”
