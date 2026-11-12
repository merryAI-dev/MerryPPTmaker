const { chromium } = require('playwright');
const PptxGenJS = require('pptxgenjs');
const sharp = require('sharp');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { capture } = require('./capture.cjs');

const configDefaults = { selector: '.slide', width: 1600, height: 900, baseline: 1, fallbackScale: 2 };

async function main() {
  const [input, output, settings, requestedWork] = process.argv.slice(2);
  if (!input || !output) throw new Error('Usage: node convert.cjs input.html output.pptx [config.json] [new-work-directory]');
  const config = { ...configDefaults, ...(settings ? JSON.parse(await fs.readFile(settings, 'utf8')) : {}) };
  if (![config.width, config.height].every(n => Number.isInteger(n) && n >= 100)) throw new Error('Width and height must be integer CSS pixels of at least 100.');
  if (settings) {
    for (const font of config.fonts || []) font.file = path.resolve(path.dirname(settings), font.file);
  }
  const work = requestedWork ? path.resolve(requestedWork) : await fs.mkdtemp(path.join(os.tmpdir(), 'html-to-pptx-'));
  if (requestedWork) await fs.mkdir(work, { recursive: false });
  await fs.access(path.resolve(input));
  try {
    const count = await capture(path.resolve(input), work, config);
    const info = execFileSync('pdfinfo', [path.join(work, 'graphics.pdf')], { encoding: 'utf8' });
    const printed = Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
    if (printed !== count) throw new Error(`Chromium printed ${printed} pages for ${count} slides. Check layout, margins and page breaks.`);
    await compose(work, config, count);
    await fs.writeFile(path.join(work, 'config.json'), JSON.stringify(config));
    execFileSync('python3', [path.join(__dirname, 'package_pptx.py'), work, path.resolve(output)], { stdio: 'inherit' });
    console.log(`PPTX: ${path.resolve(output)}\nVerification input: ${work}`);
  } catch (error) {
    console.error(`Intermediate files: ${work}`);
    throw error;
  }
}

async function compose(work, config, count) {
  const pptx = new PptxGenJS();
  const { width, height } = config;
  pptx.defineLayout({ name: 'HTML', width: width / 96, height: height / 96 });
  pptx.layout = 'HTML';
  const texts = JSON.parse(await fs.readFile(path.join(work, 'text.json')));
  const browser = await chromium.launch(config.chrome ? { executablePath: config.chrome } : {});
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    const manifest = [];
    for (let index = 1; index <= count; index++) {
      const svg = path.join(work, `printed-${index}.svg`);
      execFileSync('pdftocairo', ['-f', String(index), '-l', String(index), '-svg', path.join(work, 'graphics.pdf'), svg]);
      await page.setContent(await fs.readFile(svg, 'utf8'));
      const parts = await page.evaluate(({ width, height }) => {
        const root = document.querySelector('svg');
        const definitions = new Map(Array.from(root.querySelectorAll(':scope > defs [id]'), node => [node.id, node]));
        function dependencies(element) {
          const found = new Map();
          function visit(node) {
            for (const match of node.outerHTML.matchAll(/(?:url\(#([^)]*)\)|(?:xlink:)?href="#([^"]+)")/g)) {
              const id = match[1] || match[2];
              const target = definitions.get(id);
              if (!target || found.has(id)) continue;
              found.set(id, target);
              visit(target);
            }
          }
          visit(element);
          return Array.from(found.values());
        }
        const view = root.viewBox.baseVal;
        // Cairo may wrap the paint sequence in a group with no styling of its own.
        const roots = Array.from(root.children).filter(e => e.localName !== 'defs');
        const elements = roots.length === 1 && roots[0].localName === 'g' &&
          Array.from(roots[0].attributes).every(a => a.name === 'id') ? Array.from(roots[0].children) : roots;
        return elements.flatMap(element => {
          const box = element.getBoundingClientRect();
          const frame = root.getBoundingClientRect();
          const sx = view.width / frame.width, sy = view.height / frame.height;
          const x = Math.max(0, Math.floor((box.left - frame.left) * sx / 0.75 - 4));
          const y = Math.max(0, Math.floor((box.top - frame.top) * sy / 0.75 - 4));
          const right = Math.min(width, Math.ceil((box.right - frame.left) * sx / 0.75 + 4));
          const bottom = Math.min(height, Math.ceil((box.bottom - frame.top) * sy / 0.75 + 4));
          if (right <= x || bottom <= y) return [];
          const w = right - x, h = bottom - y;
          const vb = [x * 0.75, y * 0.75, w * 0.75, h * 0.75].join(' ');
          const deps = dependencies(element);
          const raster = [element, ...deps].some(e => e.localName === 'image' || e.querySelector('image'));
          const defs = deps.map(e => e.outerHTML).join('');
          return [{ x, y, w, h, raster, svg: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="${vb}"><defs>${defs}</defs>${element.outerHTML}</svg>` }];
        });
      }, { width, height });
      const slide = pptx.addSlide();
      const corner = await sharp(path.join(work, `source-${index}.png`)).extract({ left: 0, top: 0, width: 1, height: 1 })
        .flatten({ background: 'white' }).toColourspace('srgb').raw().toBuffer();
      slide.background = { color: corner.toString('hex') };
      const files = [];
      for (const [number, part] of parts.entries()) {
        const svgName = `graphic-${index}-${number + 1}.svg`;
        const pixels = sharp(Buffer.from(part.svg), { density: 72 * config.fallbackScale, limitInputPixels: 40000000 });
        const png = await pixels.png().toBuffer();
        const stats = await sharp(png).stats();
        if (stats.channels.length === 4 && stats.channels[3].max === 0) continue;
        if (!part.raster) await fs.writeFile(path.join(work, svgName), part.svg);
        slide.addImage({ data: 'image/png;base64,' + png.toString('base64'), x: part.x / 96, y: part.y / 96,
          w: part.w / 96, h: part.h / 96, altText: 'Browser-rendered graphics' });
        files.push(part.raster ? null : svgName);
      }
      manifest.push(files);
      for (const line of mergeRuns(texts[index - 1])) addLine(slide, line, config);
    }
    await fs.writeFile(path.join(work, 'graphics.json'), JSON.stringify(manifest));
    await pptx.writeFile({ fileName: path.join(work, 'draft.pptx') });
  } finally {
    await browser.close();
  }
}

function mergeRuns(boxes) {
  const lines = [];
  for (const box of boxes) {
    const line = lines.at(-1);
    const prev = line?.at(-1);
    if (prev && box.block === prev.block && Math.abs(box.baseline - prev.baseline) < 2 &&
      Math.abs(box.x - prev.right) < 4 && !box.rotation) line.push(box);
    else lines.push([box]);
  }
  return lines;
}

function addLine(slide, line, config) {
  const size = Math.max(...line.map(run => run.size));
  const x = Math.min(...line.map(run => run.x));
  const y = Math.max(...line.map(run => run.baseline)) - size * config.baseline;
  const right = Math.max(...line.map(run => run.right));
  if (right < 0 || x > config.width || y > config.height || y + size < 0) return;
  const runs = line.map(run => {
    const font = config.fonts?.find(f => f.family === run.family && f.weight === run.weight && !!f.italic === run.italic);
    const fontFace = font?.officeFamily || config.fontMap?.[run.family] || run.family;
    return { text: run.value, options: {
      fontFace, fontSize: Math.max(1, run.size * .75), bold: font ? /bold/i.test(font.variant || '') : run.weight >= 600,
      italic: run.italic, color: run.color, transparency: Math.round((1 - run.alpha) * 100), charSpacing: run.spacing * .75
    } };
  });
  slide.addText(runs, { x: x / 96, y: y / 96, w: Math.max(size, right - x + size * .8) / 96,
    h: size * 1.34 / 96, margin: 0, wrap: false, valign: 'top',
    rotate: ((line[0].rotation || 0) + 360) % 360 });
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
