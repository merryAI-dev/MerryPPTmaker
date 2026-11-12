# Conversion and verification

Run the scripts from any working directory using their paths under this skill. The converter needs Node 20+, Python 3, Poppler (`pdfinfo`, `pdftocairo`, `pdftoppm`), and Chromium. Local rendering also needs LibreOffice (`soffice`). Use the environment's bundled dependencies if available. For a standalone runtime, run `npm install` inside `scripts`, then `npx playwright install chromium`. Set `chrome` in the JSON to use an existing Chromium executable. A hosted agent without these executables needs a machine that can run the scripts.

```sh
node scripts/convert.cjs input.html output.pptx config.json /path/to/new-work-directory
node scripts/verify.cjs output.pptx /path/to/new-work-directory
node scripts/verify.cjs output.pptx /path/to/new-work-directory imported-google-slides.pdf
```

The work directory must be new. It stores the Chromium source PNGs and intermediate files. Each verification run writes a separate directory with slide renders and `report.json`.

Example configuration for a different deck:

```json
{
  "selector": "article[data-page]",
  "width": 1280,
  "height": 720,
  "readySelector": "[data-diagram-ready]",
  "css": "body{margin:0}.presentation-controls{display:none}",
  "fontMap": {"system-ui": "Arial"},
  "eastAsianFont": "Noto Sans CJK KR",
  "baseline": 1,
  "fallbackScale": 2
}
```

The default selector is `.slide` and the default canvas is 1600×900 CSS pixels. Set `settleMs` for state transitions with no readiness marker. Use `soffice` to override the rendering binary. `maxMeanError` optionally limits the mean of each pixel's largest RGB channel difference on a 0–255 scale. Set `maxChangedFraction` to `0` when the user requests pixel-zero verification. Review mean channel error as well to distinguish broad subtle color shifts from large local mismatches.

Set `fonts` when the original font files are available. Each entry accepts `family`, CSS `weight`, a local TTF `file` relative to the config, optional `italic`, and optional `officeFamily`. Use `embed: true` only for fonts with editable embedding rights, with an optional Office `variant` of `regular`, `bold`, `italic`, or `boldItalic`. Supply one face per Office family and variant. Map intermediate weights to their named Office families if needed. Confirm font appearance after import because font availability differs by renderer. Inspect the glyphs visually even when extracted PDF text contains the expected Unicode. Set `eastAsianFont` to an available font or embed the corresponding TTF when a Latin-first CSS stack otherwise relies on platform fallback.

For Google Slides, import in the account and location the user can access. Export via the connected Slides/Drive tool or **File → Download → PDF document**, then verify that PDF with the third command argument. Open at least the cover, a diagram page, and a dense text page in Slides. Check that text is selectable and editable, preferably with an edit on a disposable copy. A black-screen failure means the output has lost almost all bright pixels where the source had visible content. Use rendered images to catch partial failures such as missing dark graphics, missing glyphs, or broken clipping. The local fallback-only test removes SVG references to exercise the same PNG payloads without relying on Google Slides.

The converter assumes slide boxes share a fixed canvas and can print one per page. Use a stable state for interactive diagrams. Check computed CSS and browser resources if layouts differ between screen and print. Cross-origin stylesheets, fixed UI, canvas content, text on paths, clipped or transformed text, CSS-generated text, and stacking that places graphics above text may need a targeted adaptation. Text is stored by rendered line, and SVG pictures preserve graphic geometry at drawing layer granularity. Existing raster imagery is packaged as PNG, while independently emitted vector geometry remains SVG. A Google Slides import can use the PNG fallback for SVG graphics while retaining native text.

Technical references: [DOM range geometry](https://developer.mozilla.org/en-US/docs/Web/API/Range/getClientRects), [PresentationML text bodies](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.presentation.textbody), [EOT font format](https://www.w3.org/submissions/EOT/).

## Google font substitution and line overflow

Google Slides may discard embedded desktop fonts and substitute Arial, including for Korean. `wrap: false` in PPTX does not guarantee that the imported line stays on one line. A populated PNG fallback prevents missing graphics but does not validate text layout.

When actual Google rendering shows reflow, create a separate compatibility copy with an explicitly supported font and measured line slack, then import that exact copy again:

```sh
python3 scripts/google_compat.py input.pptx google-compatible.pptx --font 'Noto Sans KR' --width-factor 1.2
```

This is an opt-in repair, not a fidelity guarantee or universal default. Choose the font for the actual script and reference, inspect new collisions and slide-edge overflow, and adjust the factor per deck. Retain the original typography version. Google compatibility can change typography; report that change. The script preserves text editability, image payloads, and SVG assets in PPTX, but Google can rasterize SVG fallbacks during import.

If PDF export yields only an unmaterialized file reference, retry explicit inline export if supported. If that fails, retrieve LARGE thumbnails of every imported slide, save and compare them at the source canvas size, and explicitly report the thumbnail fallback. Do not report a local LibreOffice render as a Google render. Record source/output file hashes, presentation ID, slide IDs, render date, and per-slide metrics. A pixel-zero requirement fails whenever changed pixels are nonzero, even if there is no black screen.

For actual edit validation, insert a short marker into an existing text box, read back and render it, remove just the inserted range, and read back the original. Test a title, body text, and diagram label. An edit proving writability does not prove the surrounding layout remains unchanged. If the browser account cannot access the connector-created deck, disclose it; do not silently grant sharing permissions.

If Unicode Roman numerals lose strokes after import, add `--normalize-roman` to convert only those numeral characters to ASCII equivalents with Times New Roman. This is opt-in and must be checked against the reference; font changes alone can alter glyph meaning.

For actual Google thumbnail fallback, use `scripts/compare_rendered.cjs manifest.json report.json`. The manifest has `renderer`, `presentationId`, `capturedAt`, optional `maxChangedFraction`/`maxMeanError`, and ordered `slides` entries with `slideId`, `source`, `rendered` file paths relative to the manifest. Include every page; confirm the count against the live deck. The script checks aspect ratio, black screens and pixel differences, records image hashes and exits nonzero on explicit tolerance failures. `rendered` means the automated checks ran, not that visual fidelity passed. Inspect every slide and report font changes and graphics rasterization separately.

When replacing a whole Google text range, preserve and reapply the original run color, size, weight, and font. Deleting all text can reset the inserted text to black; verify the restored text visually on dark slides. Prefer inserting/deleting only the test range.
