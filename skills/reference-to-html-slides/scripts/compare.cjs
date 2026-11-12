const { chromium } = require('playwright');
const sharp = require('sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function main() {
  const [source, candidate, settings, output] = process.argv.slice(2);
  if (!source || !candidate || !settings || !output) {
    throw new Error('Usage: node compare.cjs source.html candidate.html config.json new-output-directory');
  }
  const config = JSON.parse(await fs.readFile(settings, 'utf8'));
  const { width, height, chrome, maxChangedFraction } = config;
  if (![width, height].every(n => Number.isInteger(n) && n > 0)) throw new Error('Set width and height in CSS pixels.');
  const browser = await chromium.launch(chrome ? { executablePath: chrome } : {});
  try {
    await fs.mkdir(output);
    const a = await capture(browser, source, config.source, config, output, 'source');
    const b = await capture(browser, candidate, config.candidate, config, output, 'candidate');
    if (a.length !== b.length) throw new Error(`Slide count differs: ${a.length} vs ${b.length}`);
    const result = [];
    for (const [index, file] of a.entries()) {
      const read = p => sharp(p).ensureAlpha().toColourspace('srgb').raw().toBuffer();
      const [first, second] = await Promise.all([read(file), read(b[index])]);
      if (first.length !== width * height * 4 || first.length !== second.length) throw new Error('Screenshot dimensions differ from the configured canvas');
      const heat = Buffer.alloc(width * height * 3);
      let changed = 0, total = 0;
      for (let i = 0; i < first.length; i += 4) {
        const delta = Math.max(...[0, 1, 2, 3].map(c => Math.abs(first[i + c] - second[i + c])));
        changed += Number(delta !== 0);
        total += delta;
        heat[i / 4 * 3] = delta ? Math.min(255, 48 + delta * 3) : 0;
      }
      const diff = path.join(output, `diff-${index + 1}.png`);
      await sharp(heat, { raw: { width, height, channels: 3 } }).png().toFile(diff);
      result.push({ slide: index + 1, source: file, candidate: b[index], diff,
        changedPixels: changed, changedFraction: changed / (width * height), meanMaxChannelError: total / (width * height) });
    }
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ width, height, slides: result }, null, 2) + '\n');
    if (maxChangedFraction !== undefined && result.some(s => s.changedFraction > maxChangedFraction)) {
      throw new Error('Pixel difference exceeds maxChangedFraction. Review the report and diff images.');
    }
  } finally {
    await browser.close();
  }
}

async function capture(browser, file, options, config, output, label) {
  const { width, height, settleMs } = config;
  const { selector = '.slide', css, readySelector } = options || {};
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1,
    colorScheme: config.colorScheme || 'light', reducedMotion: 'reduce' });
  try {
    await page.goto(pathToFileURL(path.resolve(file)).href);
    if (css) await page.addStyleTag({ content: css });
    if (readySelector) await page.locator(readySelector).first().waitFor({ state: 'attached' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images, img => img.decode().catch(() => {})));
    });
    if (settleMs) await page.waitForTimeout(settleMs);
    const files = [];
    for (const [index, slide] of (await page.locator(selector).all()).entries()) {
      const file = path.join(output, `${label}-${index + 1}.png`);
      await slide.screenshot({ path: file, animations: 'disabled' });
      const meta = await sharp(file).metadata();
      if (meta.width !== width || meta.height !== height) throw new Error(`${label} slide ${index + 1} is ${meta.width}×${meta.height}`);
      files.push(file);
    }
    if (!files.length) throw new Error(`No ${label} slides matched ${selector}`);
    return files;
  } finally {
    await page.close();
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
