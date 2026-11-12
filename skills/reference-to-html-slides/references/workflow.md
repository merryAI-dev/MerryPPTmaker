# Reference inspection and comparison

For HTML, start with the source file or the supplied page in an authorized browser. Record the route or local file, viewport, color scheme, selected tabs or diagram states, loaded fonts, and page-level UI exclusions. Use computed styles and DOM or SVG bounds to recover positions. Preserve original vector paths, viewBox, marker units, stroke width, dash pattern, transforms, clip paths, and opacity. Copy supplied font and graphic assets where reuse is authorized. Keep logos as source assets and avoid redrawing them from screenshots.

If an authorized rendered site is available but the original source or component structure is unclear, use browser inspection first. [REA](https://github.com/morluto/rea) is an optional investigation tool when installed and when inspecting web runtime structure or behavior would resolve a concrete gap. Keep its use scoped to the supplied reference. The HTML build and visual tests use browser geometry and do not depend on REA.

For PPTX, inspect slide size, theme, master/layout inheritance, shapes, relationships, media, and font assignments. Render the reference to locate the actual slide-role patterns before selecting representative pages. For PDF, extract available vector art and text coordinates, and compare to rendered pages. For screenshots, measure bounds and colors at the supplied resolution. Exact paths and font metrics may be unavailable from raster input, so distinguish traced or inferred details in the handoff.

Use semantic markup for editable content, CSS variables for observed tokens, and one stable slide root per slide. Keep text and artwork independently addressable. Test heading wraps, table overflow, diagram labels, content fit, and alternate reference states that the deliverable is expected to preserve.

## Compare two local HTML files

The comparison script uses Node 20+, Playwright and Sharp. Use bundled dependencies when available, or run `npm install` and `npx playwright install chromium` inside `scripts`.

```sh
node scripts/compare.cjs reference.html candidate.html comparison.json /path/to/new-comparison-directory
```

```json
{
  "width": 1280,
  "height": 720,
  "source": {"selector": ".slide"},
  "candidate": {"selector": "article[data-page]"},
  "settleMs": 300,
  "maxChangedFraction": 0
}
```

Set `chrome` to an installed Chromium executable when needed. Each side accepts `css` for temporary capture adjustments and `readySelector` for late-rendered content. Omit `maxChangedFraction` if the content differs and the report is being used as a diagnostic. The script saves paired renders, red diff images, and per-slide changed pixel counts. For a reference image or deck render, align the corresponding canvas before comparing. When applying a style to new content, use unchanged region comparisons and inspect differences in layout and typography directly.
