#!/usr/bin/env node
/**
 * slide_plan.json을 한 장씩 넘기며 확정하는 구성 검토 화면으로 만든다.
 *
 * CP3(스토리와 장수) 체크포인트용이다. 와이어프레임이 아니라 실제 텍스트를
 * 넣어 디자인 토큰 그대로 렌더하므로, 사용자는 최종 슬라이드에 가까운 모습을
 * 보면서 형식과 문구와 순서를 확정한다.
 *
 * 확정 JSON을 Stage 4A 빌더에 넘기면 그대로 PPTX가 된다. 채팅으로
 * "3번은 2단, 7번은 표" 하고 주고받지 않으므로 왕복과 토큰이 줄고
 * 구성이 파일로 확정되어 모호함이 없다.
 *
 *   node scripts/preview-composition.mjs --plan slide_plan.json --out preview.html
 *
 * 형식별 content 구조는 references/composition-format.md 참고.
 * 사용자에게는 그림과 한글 이름만 보여주고 내부 키를 노출하지 않는다.
 */
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_OUT = 'slide-composition-preview.html';

/** 장표 형식. MYSC 레퍼런스 덱 32장을 분류해서 나온 유형이다. */
const FORMATS = [
  { name: '표지', desc: '덱의 첫 장. 제목과 발행 주체' },
  { name: '목차', desc: '전체 장 구성을 한눈에' },
  { name: '간지', desc: '장이 바뀌는 구분 슬라이드' },
  { name: '좌우 2단', desc: '두 내용을 나란히 비교하거나 이어서' },
  { name: '표 중심', desc: '수치나 항목을 표로 정리' },
  { name: '전폭 도식', desc: '구조나 흐름을 한 폭으로 크게' },
  { name: '숫자 강조', desc: '핵심 수치 여러 개를 나열' },
  { name: '단계 흐름', desc: '순서나 과정을 단계로 표현' },
];

function usage() {
  console.log(`사용법:
  node preview-composition.mjs --plan slide_plan.json --out preview.html

옵션:
  --plan   slide_plan.json 경로. 기본값은 slide_plan.json입니다.
  --out    출력 HTML 경로. 기본값은 ${DEFAULT_OUT}입니다.
  --title  검토 화면 제목입니다.

장표 형식: ${FORMATS.map((f) => f.name).join(', ')}
`);
}

function parseArgs(argv) {
  const args = { plan: 'slide_plan.json', out: DEFAULT_OUT, title: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === '--help' || key === '-h') {
      args.help = true;
    } else if (key === '--plan') {
      args.plan = value || args.plan; i += 1;
    } else if (key === '--out') {
      args.out = value || args.out; i += 1;
    } else if (key === '--title') {
      args.title = value || args.title; i += 1;
    } else {
      throw new Error(`알 수 없는 인자입니다: ${key}`);
    }
  }
  return args;
}

function buildHtml(plan, args) {
  const slides = plan.slides || [];
  const deckTitle = args.title || plan.title || '슬라이드 구성 검토';

  return `<!doctype html>
<meta charset="utf-8">
<title>${String(deckTitle).replace(/[<&]/g, '')}</title>
<style>
  :root { --navy:#0C2044; --navy-deep:#001D45; --navy-mid:#01397E; --cyan:#59C2E2;
          --cyan-label:#5BBEDE; --tint:#BAE8FB; --tint-strong:#BEE6FB; --rule:#001521;
          --line:#dbe1ea; --ink:#1a2233; --mute:#6b7688; }
  * { box-sizing:border-box; }
  body { margin:0; padding:20px 24px 28px; background:#eef1f6; color:var(--ink);
         font-family:Pretendard,"Apple SD Gothic Neo",system-ui,sans-serif; }
  h1 { font-size:16px; margin:0 0 3px; }
  .sub { color:var(--mute); font-size:12.5px; margin:0 0 12px; }
  .prog { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
  .prog .bar { flex:1; height:5px; background:#dde3ec; border-radius:99px; overflow:hidden; }
  .prog .bar i { display:block; height:100%; background:var(--cyan); transition:width .18s; }
  .prog .pos { font-size:13px; font-weight:700; white-space:nowrap; }

  .main { display:grid; grid-template-columns:1fr 268px; gap:16px; align-items:start; }
  .panel { background:#fff; border:1px solid var(--line); border-radius:11px; padding:14px; }
  .stage { background:#fff; border:1px solid var(--line); border-radius:11px; padding:12px;
           overflow:hidden; }
  .holder { position:relative; width:100%; overflow:hidden; }

  /* ── 실제 슬라이드: A4 가로 11.693 x 8.267in, 96dpi 기준. pt/in 단위 그대로 사용 ── */
  .slide { position:absolute; top:0; left:0; width:11.693in; height:8.267in; background:#fff;
           transform-origin:top left; font-family:Pretendard,"Apple SD Gothic Neo",sans-serif;
           overflow:hidden; box-shadow:0 1px 4px #0002; }
  .slide .band { position:absolute; inset:0 0 auto 0; height:.794in;
                 background:linear-gradient(90deg,#091823,var(--navy)); }
  .slide .sec  { position:absolute; left:.657in; top:.42in; width:2.2in; height:.328in;
                 color:#fff; font-size:15pt; font-weight:700; display:flex; align-items:center; }
  .slide .subl { position:absolute; left:2.928in; top:.456in; width:5.431in; height:.336in;
                 color:#fff; font-size:14.5pt; font-weight:700; display:flex; align-items:center; }
  .slide .badge{ position:absolute; left:9.9in; top:.505in; width:1.18in; height:.26in;
                 color:#fff; font-size:10pt; font-weight:700;
                 display:flex; align-items:center; justify-content:flex-end; }
  .slide .lead { position:absolute; left:.55in; top:.9in; width:10.45in; height:.42in;
                 font-size:14.5pt; font-weight:700; display:flex; align-items:center; }
  .slide .lead .lb { color:var(--cyan-label); white-space:nowrap; }
  .slide .lead .sp { color:var(--navy-mid); margin:0 .07in; }
  .slide .lead .cl { color:var(--navy); }
  .slide .rule { position:absolute; left:.649in; top:1.343in; width:10.37in;
                 border-top:.5pt solid var(--rule); }

  .slide .pill { position:absolute; height:.283in; background:var(--navy); border-radius:.1415in;
                 color:#fff; font-size:12pt; display:flex; align-items:center;
                 justify-content:center; padding:0 .12in; }
  .slide ul { margin:0; padding:0; list-style:none; }
  .slide li { font-size:12pt; line-height:1.5; color:#1a2233; margin-bottom:.11in;
              padding-left:.19in; position:relative; }
  .slide li::before { content:''; position:absolute; left:0; top:.085in;
                      border-left:.11in solid var(--navy-mid);
                      border-top:.047in solid transparent; border-bottom:.047in solid transparent; }

  .slide table { border-collapse:collapse; font-size:9.7pt; width:100%; }
  .slide th, .slide td { border:.5pt solid #D9D9D9; padding:.055in .08in; }
  .slide th { background:var(--tint); color:var(--navy); font-weight:700; text-align:center; }
  .slide td:first-child { font-weight:600; background:#f7fbfe; white-space:nowrap; }

  /* 본문 리드 문단: 레퍼런스 21개 본문 슬라이드 전부에 있는 y=1.503 / 12pt / 10.336in 문단 */
  .slide .intro { position:absolute; left:.669in; top:1.46in; width:10.336in; font-size:12pt;
                  line-height:1.6; color:#1a2233; }
  .slide .note { position:absolute; left:.649in; width:10.37in; font-size:10pt; color:#5b6678;
                 line-height:1.55; }
  .slide .fig { position:absolute; border:1pt dashed #9fb4cc; border-radius:.06in;
                background:repeating-linear-gradient(135deg,#f4f8fc 0 9px,#eaf1f8 9px 18px);
                display:flex; flex-direction:column; align-items:center; justify-content:center;
                gap:.06in; color:#5b7a99; text-align:center; padding:.1in; }
  .slide .fig b { font-size:10.5pt; }
  .slide .fig span { font-size:9.5pt; color:#7b8ea3; }
  .slide .flow { position:absolute; display:flex; align-items:stretch; gap:.16in; }
  .slide .fbox { flex:1; border:1pt solid #cfd8e5; border-radius:.06in; padding:.13in;
                 display:flex; flex-direction:column; gap:.07in; background:#fbfdff; }
  .slide .fbox b { font-size:10.5pt; color:var(--navy); }
  .slide .fbox p { margin:0; font-size:11pt; line-height:1.45; white-space:pre-line; color:#28313f; }
  .slide .farrow { align-self:center; color:var(--cyan); font-size:18pt; font-weight:700; }
  .slide .step { flex:1; background:var(--cyan); color:var(--navy); font-size:10.5pt;
                 font-weight:700; line-height:1.4; white-space:pre-line; padding:.13in .1in;
                 display:flex; align-items:center; justify-content:center; text-align:center;
                 clip-path:polygon(0 0, calc(100% - .13in) 0, 100% 50%, calc(100% - .13in) 100%, 0 100%); }
  .slide .stat { position:absolute; }
  .slide .stat .sl { font-size:10.8pt; color:#000; margin-bottom:.05in; }
  .slide .sv { font-size:30.2pt; font-weight:700; color:#000; line-height:1; }
  .slide .su { font-size:10.8pt; font-weight:400; }
  .slide .sn { font-size:8.6pt; color:#5b6678; display:block; margin-top:.05in; }

  .slide.cover { background:var(--navy); }
  .slide.cover .cbg { position:absolute; inset:0;
      background:linear-gradient(160deg,#071426 0%,#0d2f5e 30%,#1e7fa8 62%,#bfe6ef 88%,#eaf6f8 100%); }
  .slide.cover h2 { position:absolute; left:.578in; top:.5in; width:7in; margin:0;
                    font-size:34pt; font-weight:700; color:#fff; line-height:1.28; }
  .slide.cover .csub { position:absolute; left:7.3in; top:.55in; width:3.8in; color:#fff;
                       font-size:13pt; line-height:1.6; text-align:right; white-space:pre-line; }
  .slide.cover .cent { position:absolute; left:.578in; top:7.245in; font-size:14pt;
                       font-weight:700; color:var(--navy); }
  .slide.cover .clogo{ position:absolute; left:9.1in; top:7.1in; width:2.1in; height:.58in;
                       background:#fff9; border-radius:.05in; display:flex; align-items:center;
                       justify-content:center; font-size:13pt; font-weight:800; color:var(--navy);
                       letter-spacing:.02in; }
  .slide.divider { background:linear-gradient(160deg,#071426,#0d2f5e 55%,#1a6f96); }
  .slide.divider .num { position:absolute; left:.6in; top:.2in; font-size:150pt; color:#ffffff2e;
                        font-weight:200; line-height:1; }
  .slide.divider h2 { position:absolute; left:5.8in; top:.9in; width:5.4in; margin:0;
                      font-size:40pt; font-weight:700; color:#fff; line-height:1.25; }
  .slide.divider ol { position:absolute; left:5.85in; top:2.6in; margin:0; padding-left:.25in;
                      color:#ffffffdd; font-size:16pt; line-height:2; }
  .slide.toc h2 { position:absolute; left:3.2in; top:.8in; margin:0; font-size:32pt;
                  font-weight:700; color:var(--navy); }
  .slide.toc ol { position:absolute; left:3.2in; top:1.9in; width:6in; margin:0; padding:0;
                  list-style:none; counter-reset:t; }
  .slide.toc li { counter-increment:t; font-size:16pt; font-weight:600; color:var(--navy-deep);
                  padding:.16in 0 .16in .75in; border-bottom:.5pt solid #dbe4ee; position:relative; }
  .slide.toc li::before { content:counter(t); position:absolute; left:.1in; top:.16in;
                          color:var(--cyan); font-size:18pt; font-weight:700; border:none; }

  label { display:block; font-size:11.5px; color:var(--mute); margin:12px 0 5px; font-weight:600; }
  .title-in { width:100%; font:inherit; font-size:13.5px; font-weight:600; line-height:1.45;
              border:1px solid var(--line); border-radius:7px; padding:8px 9px; resize:vertical;
              min-height:48px; color:var(--ink); }
  .title-in:focus { outline:none; border-color:var(--cyan); box-shadow:0 0 0 3px #59c2e233; }

  .picker { display:grid; grid-template-columns:1fr 1fr; gap:7px; }
  .opt { border:1.5px solid var(--line); border-radius:8px; padding:7px 6px; cursor:pointer;
         background:#fff; text-align:center; }
  .opt:hover { border-color:#b9c4d4; }
  .opt.on { border-color:var(--cyan); background:#f2fbff; box-shadow:0 0 0 3px #59c2e233; }
  .opt b { display:block; font-size:12px; font-weight:600; }
  .opt span { display:block; font-size:10px; color:var(--mute); line-height:1.35; margin-top:2px; }

  select { font:inherit; font-size:12.5px; border:1px solid var(--line); border-radius:7px;
           padding:7px 9px; background:#fff; color:var(--ink); cursor:pointer; }
  button { font:inherit; font-size:12.5px; border:1px solid var(--line); background:#fff;
           border-radius:7px; padding:8px 13px; cursor:pointer; color:var(--ink); }
  button:hover:not(:disabled) { background:#eef2f8; }
  button:disabled { opacity:.4; cursor:default; }
  button.primary { background:var(--navy); color:#fff; border-color:var(--navy); font-weight:600; }
  button.primary:hover:not(:disabled) { background:#16305f; }
  button.danger:hover { background:#ffecec; border-color:#f0b8b8; }
  .nav { display:flex; gap:7px; align-items:center; margin-top:12px; flex-wrap:wrap; }
  .nav .spacer { flex:1; }

  .strip { display:flex; gap:5px; flex-wrap:wrap; margin-top:14px; padding-top:12px;
           border-top:1px solid var(--line); }
  .chip { font-size:11px; padding:4px 9px; border-radius:99px; border:1px solid var(--line);
          background:#fff; cursor:pointer; color:var(--mute); }
  .chip.on { background:var(--navy); border-color:var(--navy); color:#fff; font-weight:700; }

  dialog { border:1px solid var(--line); border-radius:12px; padding:18px; max-width:min(720px,92vw); }
  dialog textarea { width:100%; height:42vh; font-family:ui-monospace,monospace; font-size:11.5px;
                    border:1px solid var(--line); border-radius:8px; padding:10px; }
  .hint { font-size:12px; color:var(--mute); margin:0 0 10px; }
</style>

<h1>${String(deckTitle).replace(/[<&]/g, '')}</h1>
<p class="sub">실제 문구를 넣은 미리보기입니다. 한 장씩 형식과 제목을 확정한 뒤 <b>확정 저장</b>을 누르세요. ← → 키로 이동합니다.</p>

<div class="prog">
  <span class="pos" id="pos"></span>
  <span class="bar"><i id="fill"></i></span>
</div>

<div class="main">
  <div class="stage">
    <div class="holder" id="holder"><div class="slide" id="slide"></div></div>
  </div>

  <div class="panel">
    <label style="margin-top:0">장표 형식</label>
    <div class="picker" id="picker"></div>
    <label>제목</label>
    <textarea class="title-in" id="title"></textarea>
    <div class="nav">
      <button id="prev">←</button>
      <button id="next">→</button>
      <select id="move"></select>
    </div>
    <div class="nav">
      <button id="add">+ 장 추가</button>
      <button id="dup">복제</button>
      <button class="danger" id="del">삭제</button>
    </div>
    <div class="nav">
      <button class="primary" id="confirm" style="width:100%">확정 저장</button>
    </div>
  </div>
</div>

<div class="strip" id="strip"></div>

<dialog id="out">
  <p class="hint">확정된 구성을 <code>slide_plan.confirmed.json</code>으로 저장했습니다. 저장이 안 되면 복사해서 전달하세요.</p>
  <textarea id="json" readonly></textarea>
  <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">
    <button id="copy">복사</button>
    <button class="primary" id="close">닫기</button>
  </div>
</dialog>

<script>
const FORMATS = ${JSON.stringify(FORMATS)};
let slides = ${JSON.stringify(slides)};
let cur = 0;

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const lines = s => esc(s).replace(/\\n/g, '<br>');

/* 본문형 공통 크롬: 헤더 밴드 + 대분류/소분류/쪽수 + 리드문 + 구분선 */
function chrome(s, i) {
  const c = s.content || {};
  const sec = c.section || '';
  const lead = c.label
    ? '<span class="lb">' + esc(c.label) + '</span><span class="sp">｜</span><span class="cl">' + esc(s.title || '') + '</span>'
    : '<span class="cl">' + esc(s.title || '') + '</span>';
  return '<i class="band"></i>' +
    '<div class="sec">' + esc(sec) + '</div>' +
    '<div class="badge">' + String(i + 1).padStart(2, '0') + ' 쪽</div>' +
    '<div class="lead">' + lead + '</div>' +
    '<i class="rule"></i>';
}

const bullets = arr => '<ul>' + (arr || []).map(t => '<li>' + lines(t) + '</li>').join('') + '</ul>';

/* 이미지가 들어갈 자리. 빈 공간을 남기지 않고 무엇이 올지 명시한다. */
const figure = (fig, style) => !fig ? '' :
  '<div class="fig" style="' + style + '"><b>' + esc(fig.caption || '이미지') + '</b>' +
  (fig.hint ? '<span>' + esc(fig.hint) + '</span>' : '') + '</div>';

function renderSlide(s, i) {
  const c = s.content || {};
  const f = s.layout;

  if (f === '표지') {
    return '<i class="cbg"></i>' +
      '<h2>' + lines(s.title) + '</h2>' +
      '<div class="csub">' + lines(c.subtitle) + '</div>' +
      '<div class="cent">' + esc(c.entity || '') + '</div>' +
      '<div class="clogo">MYSC</div>';
  }
  if (f === '목차') {
    return '<h2>' + esc(s.title || '목차') + '</h2>' +
      '<ol>' + (c.items || []).map(t => '<li>' + esc(t) + '</li>').join('') + '</ol>';
  }
  if (f === '간지') {
    return '<div class="num">' + esc(c.numeral || '') + '</div>' +
      '<h2>' + lines(s.title) + '</h2>' +
      '<ol>' + (c.items || []).map(t => '<li>' + esc(t) + '</li>').join('') + '</ol>';
  }

  /* 본문 슬라이드: 크롬 + 리드 문단. 콘텐츠는 2.18in부터 7.62in까지 채운다. */
  let inner = chrome(s, i) +
    (c.intro ? '<div class="intro">' + lines(c.intro) + '</div>' : '');
  const PT = c.intro ? 2.18 : 1.72;   // pill top
  const CT = PT + 0.44;               // content top
  const BOT = 7.62;                   // 콘텐츠 하단 한계

  if (f === '좌우 2단') {
    const L = c.left || {}, R = c.right || {};
    const half = (side, x) => {
      const hasFig = !!side.figure;
      const bodyH = hasFig ? 2.1 : (BOT - CT);
      return '<div class="pill" style="left:' + x + 'in;top:' + PT + 'in;width:5.095in">' + esc(side.pill || '') + '</div>' +
        '<div style="position:absolute;left:' + x + 'in;top:' + CT + 'in;width:5.095in;height:' + bodyH + 'in">' +
          bullets(side.body) + '</div>' +
        figure(side.figure, 'left:' + x + 'in;top:' + (CT + bodyH + 0.12) + 'in;width:5.095in;height:' +
          (BOT - CT - bodyH - 0.12) + 'in');
    };
    inner += half(L, 0.649) + half(R, 5.954);
  } else if (f === '표 중심') {
    const t = c.table || { headers: [], rows: [] };
    const tw = c.figure ? 6.9 : 10.37;
    // 표가 남는 세로 공간을 채우도록 높이를 명시한다. 행은 균등 분배된다.
    const th = BOT - CT - (c.note ? 0.62 : 0);
    inner += '<div class="pill" style="left:.649in;top:' + PT + 'in;width:' + tw + 'in">' + esc(c.pill || '') + '</div>' +
      '<div style="position:absolute;left:.649in;top:' + CT + 'in;width:' + tw + 'in;height:' + th + 'in">' +
        '<table style="height:100%"><tr>' +
        (t.headers || []).map(h => '<th>' + esc(h) + '</th>').join('') + '</tr>' +
        (t.rows || []).map(r => '<tr>' + r.map(x => '<td>' + esc(x) + '</td>').join('') + '</tr>').join('') +
        '</table></div>' +
      figure(c.figure, 'left:7.75in;top:' + CT + 'in;width:3.27in;height:' + th + 'in') +
      (c.note ? '<div class="note" style="top:' + (BOT - 0.5) + 'in">' + esc(c.note) + '</div>' : '');
  } else if (f === '전폭 도식') {
    const fl = c.flow || [];
    const boxes = fl.map((b, k) =>
      (k ? '<span class="farrow">›</span>' : '') +
      '<div class="fbox"><b>' + esc(b.head) + '</b><p>' + lines(b.body) + '</p></div>').join('');
    const flowH = c.figure ? 2.3 : (BOT - CT - (c.note ? 0.9 : 0));
    inner += '<div class="pill" style="left:.649in;top:' + PT + 'in;width:10.37in">' + esc(c.pill || '') + '</div>' +
      '<div class="flow" style="left:.649in;top:' + CT + 'in;width:10.37in;height:' + flowH + 'in">' + boxes + '</div>' +
      figure(c.figure, 'left:.649in;top:' + (CT + flowH + 0.16) + 'in;width:10.37in;height:' +
        (BOT - CT - flowH - 0.16 - (c.note ? 0.75 : 0)) + 'in') +
      (c.note ? '<div class="note" style="top:' + (BOT - 0.6) + 'in">' + esc(c.note) + '</div>' : '');
  } else if (f === '단계 흐름') {
    const st = c.steps || [];
    const steps = st.map(t => '<div class="step">' + lines(t) + '</div>').join('');
    inner += '<div class="pill" style="left:.649in;top:' + PT + 'in;width:10.37in">' + esc(c.pill || '') + '</div>' +
      '<div class="flow" style="left:.649in;top:' + CT + 'in;width:10.37in;height:1.5in;gap:.07in">' + steps + '</div>' +
      figure(c.figure, 'left:.649in;top:' + (CT + 1.66) + 'in;width:10.37in;height:' +
        (BOT - CT - 1.66 - (c.note ? 0.85 : 0)) + 'in') +
      (c.note ? '<div class="note" style="top:' + (BOT - 0.7) + 'in">' + esc(c.note) + '</div>' : '');
  } else if (f === '숫자 강조') {
    const arr = c.stats || [];
    const gap = 10.37 / Math.max(arr.length, 1);
    const sts = arr.map((x, k) =>
      '<div class="stat" style="left:' + (0.649 + k * gap) + 'in;top:' + CT + 'in;width:' + (gap - 0.2) + 'in">' +
        '<div class="sl">' + esc(x.label) + '</div>' +
        '<div><span class="sv">' + esc(x.value) + '</span><span class="su"> ' + esc(x.unit || '') + '</span>' +
        (x.note ? '<span class="sn">(' + esc(x.note) + ')</span>' : '') + '</div></div>').join('');
    inner += '<div class="pill" style="left:.649in;top:' + PT + 'in;width:10.37in">' + esc(c.pill || '') + '</div>' +
      sts +
      figure(c.figure, 'left:.649in;top:' + (CT + 1.35) + 'in;width:10.37in;height:' +
        (BOT - CT - 1.35 - (c.note ? 0.85 : 0)) + 'in') +
      (c.note ? '<div class="note" style="top:' + (BOT - 0.7) + 'in">' + esc(c.note) + '</div>' : '');
  } else {
    inner += '<div class="note" style="top:2.2in">이 형식의 미리보기는 아직 없습니다.</div>';
  }
  return inner;
}

function fit() {
  const holder = $('holder'), slide = $('slide');
  const w = holder.clientWidth;
  const scale = w / (11.693 * 96);
  slide.style.transform = 'scale(' + scale + ')';
  holder.style.height = (8.267 * 96 * scale) + 'px';
}

function render() {
  if (!slides.length) slides = [{ layout: '좌우 2단', title: '', content: {} }];
  cur = Math.max(0, Math.min(cur, slides.length - 1));
  const s = slides[cur];

  $('pos').textContent = (cur + 1) + ' / ' + slides.length + '장';
  $('fill').style.width = ((cur + 1) / slides.length * 100) + '%';

  const el = $('slide');
  el.className = 'slide' + (s.layout === '표지' ? ' cover' : s.layout === '간지' ? ' divider'
                          : s.layout === '목차' ? ' toc' : '');
  el.innerHTML = renderSlide(s, cur);
  fit();

  $('title').value = s.title || '';
  $('picker').innerHTML = FORMATS.map(f =>
    '<button class="opt' + (f.name === s.layout ? ' on' : '') + '" data-name="' + esc(f.name) + '">' +
      '<b>' + esc(f.name) + '</b><span>' + esc(f.desc) + '</span></button>').join('');
  $('move').innerHTML = slides.map((_, i) =>
    '<option value="' + i + '"' + (i === cur ? ' selected' : '') + '>' + (i + 1) + '번째로</option>').join('');
  $('strip').innerHTML = slides.map((sl, i) =>
    '<button class="chip' + (i === cur ? ' on' : '') + '" data-i="' + i + '">' +
      (i + 1) + '. ' + esc((sl.title || '제목 없음').slice(0, 12)) + '</button>').join('');

  $('prev').disabled = cur === 0;
  $('next').disabled = cur === slides.length - 1;
  $('del').disabled = slides.length <= 1;
}

$('picker').addEventListener('click', e => {
  const b = e.target.closest('[data-name]'); if (!b) return;
  slides[cur].layout = b.dataset.name; render();
});
$('strip').addEventListener('click', e => {
  const b = e.target.closest('[data-i]'); if (!b) return;
  cur = +b.dataset.i; render();
});
$('title').addEventListener('input', e => {
  slides[cur].title = e.target.value;
  const el = $('slide'); el.innerHTML = renderSlide(slides[cur], cur); fit();
});
$('prev').onclick = () => { cur -= 1; render(); };
$('next').onclick = () => { cur += 1; render(); };
$('move').onchange = e => {
  const to = +e.target.value;
  const [s] = slides.splice(cur, 1); slides.splice(to, 0, s); cur = to; render();
};
$('dup').onclick = () => {
  slides.splice(cur + 1, 0, JSON.parse(JSON.stringify(slides[cur]))); cur += 1; render();
};
$('del').onclick = () => { slides.splice(cur, 1); render(); };
$('add').onclick = () => {
  slides.splice(cur + 1, 0, { layout: '좌우 2단', title: '', content: {} }); cur += 1; render();
};
$('confirm').onclick = () => {
  const out = { title: ${JSON.stringify(deckTitle)}, slides: slides.map((s, i) => ({ ...s, number: i + 1 })) };
  const text = JSON.stringify(out, null, 2);
  $('json').value = text;
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'slide_plan.confirmed.json'; a.click();
  URL.revokeObjectURL(a.href);
  $('out').showModal();
};
$('copy').onclick = () => navigator.clipboard.writeText($('json').value);
$('close').onclick = () => $('out').close();
addEventListener('resize', fit);
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  if (e.key === 'ArrowLeft' && cur > 0) { cur -= 1; render(); }
  if (e.key === 'ArrowRight' && cur < slides.length - 1) { cur += 1; render(); }
});

render();
</script>
`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  if (!fs.existsSync(args.plan)) {
    throw new Error(`slide_plan.json을 찾을 수 없습니다: ${args.plan}`);
  }

  let plan;
  try {
    plan = JSON.parse(fs.readFileSync(args.plan, 'utf8'));
  } catch (error) {
    throw new Error(`slide_plan.json 파싱에 실패했습니다: ${error.message}`);
  }
  if (!Array.isArray(plan.slides) || !plan.slides.length) {
    throw new Error('slide_plan.json에 slides 배열이 없습니다.');
  }

  const known = new Set(FORMATS.map((f) => f.name));
  const unknown = [...new Set(plan.slides.map((s) => s.layout).filter((l) => l && !known.has(l)))];

  const outPath = path.resolve(args.out);
  fs.writeFileSync(outPath, buildHtml(plan, args), 'utf8');

  console.log(JSON.stringify({
    output: outPath,
    slides: plan.slides.length,
    unknown_formats: unknown,
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`preview-composition.mjs: ${error.message}`);
  process.exit(1);
}
