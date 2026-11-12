const sharp = require('sharp');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

async function main() {
  const [pptx, workArg, googlePdf] = process.argv.slice(2);
  if (!pptx || !workArg) throw new Error('Usage: node verify.cjs output.pptx work-directory [google-slides-export.pdf]');
  const work = path.resolve(workArg);
  const render = await fs.mkdtemp(path.join(work, 'verification-'));
  const config = JSON.parse(await fs.readFile(path.join(work, 'config.json')));
  const extracted = JSON.parse(await fs.readFile(path.join(work, 'text.json')));
  const compat = path.join(render, 'png-fallback-check.pptx');
  const structure = JSON.parse(execFileSync('python3', [path.join(__dirname, 'check_package.py'), pptx, compat], { encoding: 'utf8' }));
  if (structure.slideCount !== extracted.length) throw new Error('PPTX and source slide counts differ');
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'html-pptx-office-'));
  const failures = [];
  for (const [i, runs] of extracted.entries()) {
    if (runs.length && !structure.slides[i].editableTextRuns) failures.push(`Slide ${i + 1} lost editable text`);
  }
  try {
    for (const input of [pptx, compat]) {
      execFileSync(config.soffice || 'soffice', [`-env:UserInstallation=file://${profile}`, '--headless', '--convert-to',
        'pdf', '--outdir', render, path.resolve(input)], { stdio: 'pipe' });
    }
  } finally {
    await fs.rm(profile, { recursive: true, force: true });
  }
  const normal = path.join(render, path.basename(pptx, path.extname(pptx)) + '.pdf');
  const pngOnly = path.join(render, 'png-fallback-check.pdf');
  const report = { structure,
    pptx: await compare(normal, 'pptx', work, render, config, extracted, failures),
    pngFallback: await compare(pngOnly, 'png', work, render, config, extracted, failures),
    googleSlides: googlePdf
      ? await compare(googlePdf, 'google', work, render, config, extracted, failures)
      : { status: 'not-verified', reason: 'No PDF exported from the imported Google Slides deck was supplied.' },
    failures };
  const reportPath = path.join(render, 'report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(reportPath);
  if (failures.length) throw new Error(failures.join('\n'));
}

async function compare(pdf, key, work, render, config, extracted, failures) {
  const { width, height } = config;
  const count = extracted.length;
  const info = execFileSync('pdfinfo', [pdf], { encoding: 'utf8' });
  if (Number(info.match(/^Pages:\s+(\d+)/m)?.[1]) !== count) {
    failures.push(`${key}: wrong slide count`);
    return { status: 'failed' };
  }
  const prefix = path.join(render, key);
  execFileSync('pdftoppm', ['-scale-to-x', String(width), '-scale-to-y', String(height), '-png', pdf, prefix]);
  const pad = String(count).length;
  const slides = [];
  for (let number = 1; number <= count; number++) {
    const source = path.join(work, `source-${number}.png`);
    const rendered = `${prefix}-${String(number).padStart(pad, '0')}.png`;
    const raw = p => sharp(p).resize(width, height, { fit: 'fill' }).flatten({ background: 'white' }).toColourspace('srgb').raw().toBuffer();
    const [a, b] = await Promise.all([raw(source), raw(rendered)]);
    let changed = 0, error = 0, sourceBright = 0, renderedBright = 0;
    for (let i = 0; i < a.length; i += 3) {
      const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
      changed += Number(d > 0);
      error += d;
      sourceBright += Number(Math.max(a[i], a[i + 1], a[i + 2]) > 24);
      renderedBright += Number(Math.max(b[i], b[i + 1], b[i + 2]) > 24);
    }
    const pixels = width * height;
    const blackScreen = sourceBright > 0 && renderedBright <= sourceBright * .02;
    const meanMaxChannelError = error / pixels;
    if (blackScreen) failures.push(`${key}: possible black screen on slide ${number}`);
    if (config.maxMeanError !== undefined && meanMaxChannelError > config.maxMeanError) {
      failures.push(`${key}: slide ${number} exceeds maxMeanError (${meanMaxChannelError.toFixed(2)})`);
    }
    const changedPixelFraction = changed / pixels;
    if (config.maxChangedFraction !== undefined && changedPixelFraction > config.maxChangedFraction) {
      failures.push(`${key}: slide ${number} exceeds maxChangedFraction (${changedPixelFraction.toFixed(4)})`);
    }
    slides.push({ number, source, rendered, blackScreen, changedPixelFraction, meanMaxChannelError });
  }
  return { status: slides.some(s => s.blackScreen || s.meanMaxChannelError > (config.maxMeanError ?? Infinity) || s.changedPixelFraction > (config.maxChangedFraction ?? Infinity)) ? 'failed' : 'rendered', slides };
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
