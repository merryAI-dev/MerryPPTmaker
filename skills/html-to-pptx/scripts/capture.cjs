const { chromium } = require('playwright');
const { readFile, writeFile } = require('node:fs/promises');
const { pathToFileURL } = require('node:url');

async function capture(input, work, config) {
  const { width, height, selector, chrome, fonts = [] } = config;
  const browser = await chromium.launch(chrome ? { executablePath: chrome } : {});
  try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(input).href, { waitUntil: 'load' });
    for (const font of fonts) {
      const bytes = await readFile(font.file);
      await page.addStyleTag({ content: `@font-face{font-family:${JSON.stringify(font.family)};font-weight:${font.weight};src:url(data:font/ttf;base64,${bytes.toString('base64')})}` });
    }
    if (config.css) await page.addStyleTag({ content: config.css });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images, img => img.decode().catch(() => {})));
    });
    if (config.readySelector) await page.locator(config.readySelector).first().waitFor({ state: 'attached' });
    if (config.settleMs) await page.waitForTimeout(config.settleMs);
    const slides = page.locator(selector);
    const count = await slides.count();
    if (!count) throw new Error(`No slides matched ${selector}`);
    const boxes = [];
    for (let index = 0; index < count; index++) {
      const slide = slides.nth(index);
      await slide.scrollIntoViewIfNeeded();
      const bounds = await slide.boundingBox();
      if (!bounds || Math.abs(bounds.width - width) > 1 || Math.abs(bounds.height - height) > 1) {
        throw new Error(`Slide ${index + 1} does not fit the ${width}×${height} viewport. Set dimensions or add layout CSS.`);
      }
      await slide.screenshot({ path: `${work}/source-${index + 1}.png`, animations: 'disabled' });
      boxes.push(await slide.evaluate(extractText));
    }
    await writeFile(`${work}/text.json`, JSON.stringify(boxes));
    await page.emulateMedia({ media: 'screen' });
    const inaccessible = await page.evaluate(({ width, height }) => {
      // Resolve viewport-relative units and media predicates while the screen viewport is active.
      const fix = css => css.replace(/url\([^)]*\)|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|(-?(?:\d*\.)?\d+)(vw|vh|vmin|vmax)\b/g, (match, n, unit) =>
        unit === undefined ? match : Number(n) * ({ vw: width, vh: height, vmin: Math.min(width, height), vmax: Math.max(width, height) }[unit]) / 100 + 'px');
      function freeze(rules) {
        for (const rule of rules) {
          if (rule instanceof CSSMediaRule) rule.media.mediaText = matchMedia(rule.conditionText).matches ? 'all' : 'not all';
          if (rule.style) {
            for (const name of [...rule.style]) {
              const old = rule.style.getPropertyValue(name);
              const next = fix(old);
              if (old !== next) rule.style.setProperty(name, next, rule.style.getPropertyPriority(name));
            }
          }
          if (rule.cssRules) freeze(rule.cssRules);
        }
      }
      let unavailable = 0;
      for (const sheet of document.styleSheets) {
        try { freeze(sheet.cssRules); } catch (error) {
          if (error.name !== 'SecurityError') throw error;
          unavailable++;
        }
      }
      for (const element of document.querySelectorAll('[style]')) element.setAttribute('style', fix(element.getAttribute('style')));
      return unavailable;
    }, { width, height });
    if (inaccessible) console.warn(`${inaccessible} cross-origin stylesheet(s) could not be normalized for printing. Review render comparison.`);
    const suppressed = `${selector}, :is(${selector}) *{-webkit-text-fill-color:transparent!important;text-shadow:none!important} :is(${selector}) svg text{visibility:hidden!important}`;
    await page.addStyleTag({ content: `@page{size:${width + 4}px ${height + 4}px;margin:0}
      html,body{overflow:visible!important;height:auto!important;scroll-snap-type:none!important}
      :is(${selector}){break-after:page!important;break-inside:avoid!important;margin-inline:0!important}
      ${suppressed}` });
    await page.pdf({ path: `${work}/graphics.pdf`, preferCSSPageSize: true, printBackground: true });
    return count;
  } finally {
    await browser.close();
  }
}

function extractText(slide) {
  const origin = slide.getBoundingClientRect();
  const ctx = document.createElement('canvas').getContext('2d');
  const text = [];
  const ids = new Map();
  const range = document.createRange();
  const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  function styleFor(element, svg) {
    const style = getComputedStyle(element);
    let alpha = 1;
    for (let parent = element; parent && parent !== slide.parentElement; parent = parent.parentElement) {
      const current = getComputedStyle(parent);
      if (current.display === 'none' || current.visibility !== 'visible') return null;
      alpha *= Number(current.opacity);
    }
    if (!alpha) return null;
    const color = svg ? style.fill : style.webkitTextFillColor || style.color;
    ctx.fillStyle = '#000';
    ctx.fillStyle = color;
    const pixel = new Uint8ClampedArray(4);
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillRect(0, 0, 1, 1);
    pixel.set(ctx.getImageData(0, 0, 1, 1).data);
    alpha *= pixel[3] / 255 * (svg ? Number(style.fillOpacity) : 1);
    return { size: parseFloat(style.fontSize), weight: Number(style.fontWeight), italic: style.fontStyle !== 'normal',
      spacing: parseFloat(style.letterSpacing) || 0, family: style.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, ''),
      color: Array.from(pixel.slice(0, 3), n => n.toString(16).padStart(2, '0')).join(''), alpha };
  }
  function blockId(element) {
    while (element !== slide && getComputedStyle(element).display === 'inline') element = element.parentElement;
    if (!ids.has(element)) ids.set(element, ids.size);
    return ids.get(element);
  }
  const walker = document.createTreeWalker(slide, NodeFilter.SHOW_TEXT);
  for (let node; (node = walker.nextNode());) {
    const element = node.parentElement;
    if (element instanceof SVGElement || !node.data.trim() || element.closest('script,style,template')) continue;
    const style = styleFor(element, false);
    if (!style || !style.alpha) continue;
    ctx.font = `${style.italic ? 'italic ' : ''}${style.weight} ${style.size}px ${getComputedStyle(element).fontFamily}`;
    const ascent = ctx.measureText('Ag한').fontBoundingBoxAscent;
    let line;
    for (const { segment, index } of graphemes.segment(node.data)) {
      range.setStart(node, index);
      range.setEnd(node, index + segment.length);
      const rect = range.getBoundingClientRect();
      if (rect.width < 0.01 || rect.height < 0.01) continue;
      const x = rect.left - origin.left;
      const top = rect.top - origin.top;
      if (!line || Math.abs(top - line.top) > 1) {
        line = { ...style, block: blockId(element), x, top, baseline: top + ascent, value: '' };
        text.push(line);
      }
      line.value += segment.replace(/[\r\t\n]/g, ' ');
      line.right = rect.right - origin.left;
    }
  }
  for (const element of slide.querySelectorAll('svg text')) {
    const style = styleFor(element, true);
    const matrix = element.getScreenCTM();
    if (!style || !style.alpha || !matrix || !element.getNumberOfChars()) continue;
    const rect = element.getBoundingClientRect();
    const clip = element.ownerSVGElement.getBoundingClientRect();
    if (rect.left < clip.left - 1 || rect.right > clip.right + 1 || rect.top < clip.top - 1 || rect.bottom > clip.bottom + 1) continue;
    const point = element.getStartPositionOfChar(0).matrixTransform(matrix);
    const scale = Math.hypot(matrix.a, matrix.b);
    text.push({ ...style, block: ids.size + text.length, x: point.x - origin.left, top: rect.top - origin.top,
      right: rect.right - origin.left, baseline: point.y - origin.top, size: style.size * scale, spacing: style.spacing * scale,
      rotation: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI, value: element.textContent });
  }
  return text.filter(line => line.value.trim());
}

module.exports = { capture };
