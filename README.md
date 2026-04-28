# MerryPPTmaker

MerryPPTmaker는 Codex에서 발표자료를 단계적으로 만드는 Merry AI 내부용 스킬 번들입니다.

핵심 목표는 “한 번에 예쁜 슬라이드를 만들어 달라”가 아니라, 레퍼런스 디자인과 사용자 자료를 분리해서 읽고, 중간 산출물을 남기며, 품질이 흔들리는 지점으로 되돌아갈 수 있는 슬라이드 제작 파이프라인을 제공하는 것입니다.

## 왜 만들었나

일반적인 AI 슬라이드 생성은 실패 패턴이 명확합니다.

- 레퍼런스의 시각 문법을 보지 않고 generic 템플릿으로 수렴합니다.
- 보고서형 표/차트를 임의의 KPI 카드나 dashboard widget으로 바꿉니다.
- 폰트, 본문 크기, 모델 선택 같은 중요한 기본값을 사용자에게 묻지 않고 가정합니다.
- 디자인 추출, 스토리 설계, 페이지 프롬프트, 이미지 렌더가 한 덩어리로 섞입니다.
- 결과가 마음에 들지 않을 때 어느 단계가 문제인지 되돌아가기 어렵습니다.

MerryPPTmaker는 이 문제를 stage 기반으로 분해합니다.

```text
intake -> design -> plan -> prompts -> render -> package
```

## 핵심 원칙

### 레퍼런스는 디자인 권위입니다

레퍼런스 PDF, 이미지, 덱, 스크린샷은 콘텐츠를 베끼기 위한 자료가 아닙니다. 시각 언어, 여백, 표 밀도, 차트 스타일, 헤더/푸터 구조, 색상, 컴포넌트 규칙을 추출하기 위한 디자인 권위입니다.

레퍼런스는 “깔끔한 보고서 톤”처럼 요약하지 않습니다. 실제 반복되는 작은 시각 토큰까지 기록해야 합니다. 다만 특정 레퍼런스의 고유 요소를 모든 덱의 기본값으로 승격하지 않습니다.

- header rule, side rail, section marker, divider 같은 구조 요소가 반복되는지
- 반복 구조가 색상, 두께, 위치, 비율을 갖는지
- 표 header, row fill, border, grid가 어떤 색상 역할을 갖는지
- 차트 grid, axis, label, primary series, secondary series가 어떤 색상 역할을 갖는지
- footer/source/page number가 어떤 선, 크기, 위치 규칙을 갖는지

### 사용자 자료는 콘텐츠 권위입니다

사용자 메모, 원본 PDF, Markdown, 스프레드시트, 코드 변경 내역은 사실관계와 메시지를 결정합니다.

### 애매하면 질문합니다

특히 아래 항목은 레퍼런스나 사용자 요청에서 명확하지 않으면 Stage 0에서 확인합니다.

- 폰트: 기본 제안은 `Pretendard`
- 본문 최소 크기: 기본 제안은 `12pt 이상`
- 최종 산출물: `raster PPTX` 또는 `native editable PPTX`
- 렌더 모델: 기본 제안은 `gpt-image-2`
- 레퍼런스 충실도: “거의 동일한 보고서 톤” 또는 “참고만 한 새 톤”

### 조용히 downgrade하지 않습니다

렌더 기본 모델은 `gpt-image-2`입니다. 재현성이 더 중요하면 snapshot `gpt-image-2-2026-04-21`을 기록합니다. `gpt-image-1`, `gpt-image-1.5`, DALL-E 계열 또는 다른 모델로 조용히 낮추지 않습니다. fallback이 필요하면 먼저 사용자에게 알립니다.

## Stage Workflow

| Stage | 이름 | 입력 | 출력 | 완료 기준 |
| --- | --- | --- | --- | --- |
| 0 | Intake | 사용자 요청, 링크, 파일, 레퍼런스 | `merry_slide_brief.md` 또는 짧은 brief | 목표, 청중, 소스, 폰트, 본문 크기, 모델, 편집성이 명확함 |
| 1 | Design | 레퍼런스 PDF/이미지/링크 | `DESIGN.md` | observed/inferred 규칙, 폰트, role-based token table, 금지 패턴이 정리됨 |
| 2 | Plan | `DESIGN.md`, 사용자 자료 | `slide_plan.json` | 설득 흐름, 페이지 역할, token reuse가 타당함 |
| 3 | Prompt | `DESIGN.md`, `slide_plan.json` | `slide_prompts.json` | 페이지별 프롬프트, token 이름, anti-generic ban이 있음 |
| 4 | Render | `slide_prompts.json` | `page_<n>.png` | `gpt-image-2` 기준으로 한 장씩 생성되고 핵심 token이 검수됨 |
| 5 | Package | 승인된 이미지 또는 native 요소 | `.pptx` | 슬라이드 수, 배치, 편집성 조건이 확인됨 |

## 산출물

일반적인 전체 실행은 다음 파일을 만듭니다.

```text
merry_slide_brief.md
DESIGN.md
slide_plan.json
slide_prompts.json
page_1.png
page_2.png
...
merry-slide-deck.pptx
```

사용자가 수정 가능한 PowerPoint를 요구하면 `slides` 스킬과 PptxGenJS 기반 native object 제작으로 전환합니다. 이 경우 표, 텍스트, 단순 차트는 PowerPoint에서 직접 수정 가능한 객체로 남기는 것이 목표입니다.

## 디자인 품질 게이트

`references/design-quality-gate.md`는 이 번들의 핵심 안전장치입니다. 레퍼런스가 있는 덱은 반드시 이 파일의 기준을 통과해야 합니다.

기본 기준:

- 한국어 덱 폰트는 사용자 확인 후 `Pretendard`를 기본으로 사용합니다.
- 본문, 표 본문, 차트 라벨, 도식 설명은 `12pt 이상`입니다.
- footer, 출처, 페이지 번호 같은 보조 메타데이터만 8-10pt를 허용합니다.
- 팔레트는 레퍼런스에서 관찰한 dominant/neutral/accent 중심으로 유지합니다.
- 의미상 꼭 필요한 경우에도 accent는 1-2개까지만 사용합니다.
- 공간이 부족하면 글씨를 줄이지 않고 내용을 줄이거나 슬라이드를 나눕니다.

금지 패턴:

- 레퍼런스에 없는 다색 KPI 카드
- badge spam
- 두꺼운 윤곽선 카드
- 그림자 카드
- generic dashboard widget
- 장식용 icon chip
- 보고서형 표/차트를 decorative card로 대체하는 행위
- 모델 fallback을 사용자 승인 없이 수행하는 행위

## 관찰 기반 디자인 토큰 추출

`references/design-token-extraction.md`는 Stage 1에서 반드시 적용하는 토큰 추출 계약입니다. 이 문서는 레퍼런스의 작은 반복 요소를 토큰으로 고정합니다.

Stage 1의 `DESIGN.md`에는 반드시 아래 형태의 token table이 들어가야 합니다.

| token | observed_value | evidence | reuse_rule | confidence |
| --- | --- | --- | --- | --- |
| `header.rule.primary_segment` | observed accent segment, approx ratio if split | body page header | split rule이 관찰된 경우에만 사용 | medium |
| `header.rule.secondary_segment` | observed secondary/neutral segment | body page header | split rule의 보조 구간으로만 사용 | medium |
| `table.border` | observed thin grid treatment | body table | 모든 표 border 후보 | high |
| `chart.primary_series` | observed main line/bar treatment | body chart | primary metric에만 사용 | medium |

필수 token group:

- Canvas: background, aspect ratio, outer margin, safe area
- Header: title position, section label, rule treatment if observed, spacing
- Layout primitives: rail/marker/frame/divider if observed, position, width, relationship to content
- Typography: title/body/caption size and weight
- Palette: primary accent, neutral dark/mid/light, border/grid color
- Table: header fill, row fill, alternating row, border color, border weight
- Chart: grid color, axis color, label color, primary/secondary series, marker style
- Diagram: connector color/weight, box fill/border, label treatment
- Footer: footer rule, source note, page number
- Forbidden: reference에 없는 cards, shadows, icons, colors

토큰 추출 규칙:

- 토큰을 많이 써도 됩니다. 보고서형 레퍼런스는 오히려 토큰을 적게 쓰면 실패입니다.
- 색상은 역할별로 분리합니다. `table.header.fill`과 `chart.primary_series`가 비슷한 색이어도 별도 token입니다.
- split line, side rail, alternating row, chart grid처럼 반복되는 요소는 관찰된 경우 반드시 token으로 기록합니다.
- exact hex를 모르면 approximate hex와 confidence를 기록합니다.
- “reference colors” 같은 문구로 넘기지 않고 prompt 단계에서 token 이름을 직접 사용합니다.

Stage 1 실패 조건:

- `DESIGN.md`에 token table이 없습니다.
- 레퍼런스에 header rule/side rail/표/차트가 보이는데 해당 token이 없습니다.
- palette가 색상명이나 분위기 형용사만으로 요약되어 있습니다.
- Stage 3 prompt가 token 이름 없이 “비슷한 톤”만 지시합니다.

## gpt-image-2 정책

MerryPPTmaker는 이미지 렌더 단계에서 `gpt-image-2`를 기본 모델로 둡니다.

운영 규칙:

- Stage 0 brief에 렌더 모델을 기록합니다.
- 기본값은 `gpt-image-2`입니다.
- 재현성 기준이 중요하면 `gpt-image-2-2026-04-21` snapshot을 기록합니다.
- Codex native image generation이 모델 선택을 직접 노출하지 않는 환경에서도 prompt와 작업 기록에는 `gpt-image-2` 목표를 명시합니다.
- API runner가 있는 환경에서는 `gpt-image-2`를 사용합니다.
- 낮은 모델로 fallback해야 하면 이유와 영향을 사용자에게 먼저 말합니다.

## 설치

이 저장소를 Codex skill 디렉터리에 설치합니다.

```bash
mkdir -p ~/.codex/skills
git clone https://github.com/merryAI-dev/MerryPPTmaker.git ~/.codex/skills/merry-slide
```

이미 설치되어 있다면 업데이트합니다.

```bash
cd ~/.codex/skills/merry-slide
git pull
```

Codex가 새 스킬을 다시 발견하도록 Codex 세션을 재시작합니다.

## 의존성 설치

Stage 5의 raster PPTX 패키징은 `pptxgenjs`를 사용합니다. 스킬 내부 `vendor/`에 의존성을 설치합니다.

```bash
bash scripts/setup-deps.sh
```

설치 후 구조는 다음과 비슷합니다.

```text
vendor/
  node_modules/
  package.json
  package-lock.json
```

`vendor/`와 생성된 덱 파일은 커밋하지 않습니다.

## 사용 예시

### 전체 자동 실행

```text
Merry-slide로 이 PDF와 레퍼런스를 바탕으로 발표자료 만들어줘.
폰트는 Pretendard, 본문은 12pt 이상, gpt-image-2로 렌더해줘.
```

### Stage 1만 실행

```text
Stage 1 Design만 진행해줘.
이 레퍼런스 PDF에서 DESIGN.md를 뽑아줘.
콘텐츠 요약 말고 디자인 시스템만 정리해줘.
```

### Stage 3 재작성

```text
현재 DESIGN.md와 slide_plan.json은 유지하고,
slide_prompts.json만 더 엄격하게 다시 써줘.
레퍼런스에 없는 카드형 레이아웃은 금지해줘.
```

### PPTX 패키징

```bash
node scripts/package-raster-pptx.mjs \
  --dir ./generated-slides \
  --out merry-slide-deck.pptx
```

또는 이미지를 명시합니다.

```bash
node scripts/package-raster-pptx.mjs \
  --images page_1.png,page_2.png,page_3.png \
  --out merry-slide-deck.pptx
```

## 파일 구조

```text
MerryPPTmaker/
  README.md
  SKILL.md
  agents/
    openai.yaml
  references/
    stage-contract.md
    design-quality-gate.md
    design-token-extraction.md
  scripts/
    setup-deps.sh
    package-raster-pptx.mjs
  package.json
```

### `SKILL.md`

Codex가 실제로 읽는 메인 스킬 문서입니다. stage 선택, 입력 처리, 디자인 충실도, gpt-image-2 정책, package 규칙을 정의합니다.

### `references/stage-contract.md`

stage 완료 조건과 재개 규칙입니다. 중간 산출물이 있을 때 어디서부터 이어갈지 판단합니다.

### `references/design-quality-gate.md`

폰트, 본문 크기, 팔레트, 레퍼런스 충실도, 모델 downgrade 금지 기준입니다. 레퍼런스 기반 덱의 품질을 막는 핵심 문서입니다.

### `references/design-token-extraction.md`

레퍼런스의 시각 시스템을 role-based token으로 추출하는 기준입니다. header rule, side rail/marker, 표 grid, 차트 grid/axis/series 같은 작은 반복 요소를 관찰된 경우 반드시 기록하게 만듭니다.

### `agents/openai.yaml`

스킬 UI 메타데이터입니다. 기본 설명과 `default_model: gpt-image-2`를 기록합니다.

### `scripts/setup-deps.sh`

스킬 내부 `vendor/`에 Node 의존성을 설치합니다.

### `scripts/package-raster-pptx.mjs`

`page_<n>.png` 이미지를 full-slide raster PPTX로 조립합니다. 각 슬라이드는 이미지 한 장으로 배치됩니다.

## Raster PPTX와 Native PPTX

MerryPPTmaker의 기본 Stage 5는 raster PPTX입니다.

장점:

- 이미지 렌더 결과를 그대로 보존합니다.
- 슬라이드 간 시각 일관성이 유지됩니다.
- 패키징이 빠르고 실패 지점이 적습니다.

한계:

- 표, 차트, 텍스트를 PowerPoint에서 직접 편집하기 어렵습니다.

사용자가 “수정 가능한 표”, “native chart”, “PowerPoint에서 직접 고치게”를 요구하면 `slides` 스킬로 전환해야 합니다. 이 경우에도 MerryPPTmaker의 디자인 품질 게이트는 유지합니다.

native PPTX 기준:

- theme font는 `Pretendard`
- 본문은 12pt 이상
- 표는 native PowerPoint table
- 단순 막대/선/파이 차트는 native PowerPoint chart
- split rule이 관찰된 경우 하나의 선으로 뭉개지 않고 token에 맞춘 segment로 구현
- 표/차트 색상은 `DESIGN.md`의 table/chart token을 source script 상수로 반영
- 레퍼런스에 없는 카드/장식/색상 추가 금지
- 결과 렌더 또는 썸네일 검수 필수

## 검증 명령

패키징 스크립트 syntax 확인:

```bash
node --check scripts/package-raster-pptx.mjs
```

의존성 설치:

```bash
bash scripts/setup-deps.sh
```

예시 이미지가 있는 경우 패키징:

```bash
node scripts/package-raster-pptx.mjs --dir . --out smoke-test.pptx
```

PPTX 내부 확인 예시:

```bash
unzip -l smoke-test.pptx
```

## Troubleshooting

### `Cannot find module 'pptxgenjs'`

의존성이 설치되지 않은 상태입니다.

```bash
bash scripts/setup-deps.sh
```

그 다음 패키징 명령을 다시 실행합니다.

### 생성 이미지가 `generated-images` 캐시에만 남아 있음

Stage 4가 끝난 것이 아닙니다. 최종 선택 이미지를 workspace에 `page_<n>.png` 이름으로 복사해야 완료입니다.

### 레퍼런스와 다르게 카드형 결과가 나옴

`DESIGN.md` 또는 `slide_prompts.json`의 anti-pattern ban이 약한 상태입니다.

먼저 Stage 1로 돌아가 아래 항목을 채웁니다.

- observed components
- observed palette
- forbidden patterns
- body slide density rule

그 다음 Stage 3 prompt를 다시 작성합니다.

### 본문이 너무 작음

글씨를 줄이지 않습니다. 내용을 줄이거나 slide를 나눕니다. footer/source/page number 외에는 12pt 미만을 쓰지 않습니다.

### `gpt-image-2`를 쓸 수 없는 환경

fallback하지 말고 사용자에게 먼저 알립니다. fallback 모델, 품질 영향, 재시도 방법을 설명한 뒤 승인받습니다.

## 배포 전 체크리스트

- `SKILL.md`가 stage 흐름을 최신 상태로 설명하는가
- `stage-contract.md`가 완료 기준과 재개 기준을 포함하는가
- `design-quality-gate.md`가 폰트, 본문 크기, 팔레트, 모델 정책을 포함하는가
- `design-token-extraction.md`가 role-based token 추출 기준을 포함하는가
- `agents/openai.yaml`에 `gpt-image-2` 정책이 반영되어 있는가
- `node --check scripts/package-raster-pptx.mjs`가 통과하는가
- README가 설치, 사용법, 검증, troubleshooting을 설명하는가
- 생성물, slide images, `vendor/`가 커밋에서 제외되어 있는가

