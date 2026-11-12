---
name: html-to-pptx
description: Convert browser-rendered HTML slides to editable PPTX. Keep text editable and graphics vector, compare with the source, and check Google Slides import for black screens.
---

# HTML to editable PPTX

Use this skill for existing HTML slides. Read [conversion and verification](references/workflow.md) for runtime setup, layout options, font mapping, and commands.

1. Inspect the HTML and determine the slide selector, canvas dimensions, desired interactive state, and assets. Capture each slide after fonts and graphics load. Retain the slide order and wording.
2. Run the converter. It measures rendered DOM text and SVG label baselines, writes native PowerPoint text runs, and adds browser-rendered graphics as SVG pictures with populated PNG fallbacks. Keep text live when tuning alignment. Adjust layout, font mapping, letter spacing, or baseline before considering visual tradeoffs.
3. Run verification on the deliverable. Inspect the actual slide renders, especially mixed-font titles, Korean or other non-Latin text, small SVG labels, clipping, overlays, and line endings. Confirm at least one edited text box renders the replacement text on a disposable copy when editability is critical.
4. When Google Slides is a target, import the final PPTX into an authorized Drive location, verify representative text boxes are editable, and export the imported deck to PDF. Pass that PDF to the verifier for every-slide black-screen and fidelity checks. If PDF export fails, use actual Google LARGE thumbnails for all slides and document that fallback. Inspect font substitution and line overflow; use the opt-in compatibility repair only when observed defects justify it. Report Google Slides as unverified when no actual Google render can be obtained. The local PNG fallback test is a separate result.
5. Deliver the PPTX and summarize material differences with renderer names. Apply an explicit pixel tolerance if requested, and report measured failure when the tolerance is missed.

Example request: “Convert this HTML presentation to an editable PPTX, keep the SVG arrows, and verify the Google Slides import.”
