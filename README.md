# Merry-slide

Merry-slide is an internal Codex skill for staged presentation production.

It turns reference material and source content into:

1. `DESIGN.md`
2. `slide_plan.json`
3. `slide_prompts.json`
4. checked slide images
5. an optional raster `.pptx`

Default production assumptions are intentionally explicit:

- Korean decks should ask or record typography, defaulting to Pretendard.
- Body text should stay at 12pt or above unless the user approves an exception.
- Rendering targets `gpt-image-2`; do not silently fall back to older image models.
- Reference styles are design authority, so generic cards, badge spam, and off-reference palettes are rejected.

## Install Dependencies

Stage 5 packaging uses `pptxgenjs`. Install the bundled tool dependencies with:

```bash
bash scripts/setup-deps.sh
```

Then package generated `page_<n>.png` files:

```bash
node scripts/package-raster-pptx.mjs --dir . --out merry-slide-deck.pptx
```

## Skill Files

- `SKILL.md`: Codex skill instructions
- `agents/openai.yaml`: UI metadata
- `references/stage-contract.md`: stage completion and resume contract
- `references/design-quality-gate.md`: typography, palette, model, and reference-fidelity checks
- `scripts/package-raster-pptx.mjs`: raster image to PPTX packager
- `scripts/setup-deps.sh`: local vendor dependency setup

Do not commit generated decks, slide images, or `vendor/`.
