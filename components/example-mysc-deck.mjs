/**
 * mysc-proposal.mjs 컴포넌트 스모크 테스트 겸 사용 예시.
 *
 *   node components/example-mysc-deck.mjs --out /tmp/mysc-sample.pptx
 *
 * 콘텐츠는 전부 더미다. 컴포넌트가 실제로 열리는 PPTX를 만드는지 확인하는 용도.
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import {
  applyLayout, coverSlide, sectionDivider, bodySlide,
  sectionPill, statGrid, dataTable, processChevrons, T,
} from './mysc-proposal.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(HERE, '..');

function loadPptxGenJS() {
  const attempts = [
    () => createRequire(path.join(process.cwd(), 'package.json'))('pptxgenjs'),
    () => createRequire(path.join(SKILL_DIR, 'vendor', 'package.json'))('pptxgenjs'),
    () => createRequire(path.join(SKILL_DIR, 'package.json'))('pptxgenjs'),
  ];
  for (const attempt of attempts) {
    try {
      return attempt();
    } catch {
      /* 다음 후보 */
    }
  }
  throw new Error('pptxgenjs를 찾을 수 없습니다. 먼저 bash scripts/setup-deps.sh를 실행하세요.');
}

const outIdx = process.argv.indexOf('--out');
const OUT = outIdx > -1 ? process.argv[outIdx + 1] : 'mysc-sample.pptx';

const PptxGenJS = loadPptxGenJS();
const pptx = new PptxGenJS();
applyLayout(pptx);

coverSlide(pptx, {
  year: '2026',
  title: 'EMA\n액셀러레이팅 프로그램\n제안서',
  subtitle: 'OOO 전략으로 혁신 스타트업이\n스케일업과 글로벌 확장의 활주로에\n오를 수 있도록 돕겠습니다',
  entity: '주식회사 엠와이소셜컴퍼니',
});

sectionDivider(pptx, {
  numeral: 'Ⅰ',
  title: '제안사 현황',
  items: ['일반 현황', '목표 및 전략'],
});

// 표 + pill 소제목
const s3 = bodySlide(pptx, {
  section: 'Ⅰ. 제안사 현황',
  subsection: '1. 일반현황',
  page: '01',
  lead: { label: '1-1. 기관 개요', claim: '관찰된 리드문 3-세그먼트 패턴을 그대로 재현한다' },
});
sectionPill(pptx, s3, { text: '기관 개요', x: 0.649, y: 2.221, w: 5.095 });
dataTable(pptx, s3, {
  headers: ['구분', '2024년', '2023년', '2022년'],
  rows: [
    ['유동자산', '3,292,422,536', '2,560,094,173', '2,719,023,806'],
    ['비유동자산', '10,582,242,690', '9,388,486,989', '8,063,165,352'],
    ['자산총계', '13,874,665,226', '11,948,580,362', '10,782,388,181'],
  ],
  x: 0.657, y: 2.62, w: 5.03,
});
sectionPill(pptx, s3, { text: '주요 사업영역', x: 5.954, y: 2.221, w: 5.095 });
processChevrons(pptx, s3, ['스타트업 액셀러레이팅', '임팩트 투자', '사회혁신 컨설팅'], {
  x: 5.954, y: 2.7, w: 5.095,
});

// stat 그리드
const s4 = bodySlide(pptx, {
  section: 'Ⅰ. 제안사 현황',
  subsection: '1. 일반현황',
  page: '02',
  lead: { label: '1-3. 핵심성과', claim: '무배경 라벨+큰 숫자 조합, 다색 KPI 카드를 쓰지 않는다' },
});
statGrid(pptx, s4, [
  { label: '연간 육성 기업 수', value: '200', unit: '여건', note: '최근 5년' },
  { label: '초기 창업기업 투자 비율', value: '57', unit: '%', note: '2025.09 기준' },
  { label: '지역소재 기업 투자 비율', value: '46', unit: '%', note: '2025.09 기준' },
  { label: '총 운용자산 (AUM)', value: '990', unit: '억 원', note: '2025.09 기준' },
  { label: '포트폴리오사 총 기업가치', value: '3.1', unit: '조 원', note: '제3자 거래가 반영' },
  { label: '누적 투자 건', value: '251', unit: '건', note: '2025.09 기준' },
]);

await pptx.writeFile({ fileName: path.resolve(OUT) });
console.log(JSON.stringify({ output: path.resolve(OUT), slides: 4, canvas: T.canvas }, null, 2));
