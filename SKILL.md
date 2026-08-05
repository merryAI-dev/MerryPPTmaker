---
name: merry-slide
description: Use when building a presentation deck in stages from reference links, reference images, PDFs, notes, or source files into DESIGN.md, slide_plan.json, slide_prompts.json, slide images, or a PPTX package. Extracts a design system from reference decks and builds native or raster PowerPoint output. Korean deck workflows and stage-based slide production are supported.
---

# Merry-slide

Merry-slide는 단계형 발표자료 제작 워크플로우다. 레퍼런스 자료와 원본 콘텐츠를 받아 아래 파이프라인으로 처리한다.

`intake -> design -> plan -> build -> package`

Claude와 Codex 양쪽에서 동작한다. 다만 **Stage 4 build에서 두 트랙이 갈린다.**

| 트랙 | Stage 4 방식 | 산출물 | 실행 환경 |
| --- | --- | --- | --- |
| **Native** | `components/`의 PptxGenJS 빌더로 슬라이드를 직접 조립 | 편집 가능한 PPTX | Claude, Codex 모두 |
| **Raster** | 이미지 생성 모델로 페이지를 한 장씩 렌더 | `page_<n>.png` → raster PPTX | 이미지 생성이 가능한 환경 (Codex `gpt-image-2` 등) |

Stage 0~3과 Stage 5는 두 트랙이 공통이며 실행 환경을 가리지 않는다.

**Claude에서 실행 중이면 Native 트랙만 쓴다.** Claude Code에는 이미지 생성 도구가 없다. 사용자가 raster 이미지 덱을 원하면 그 사실을 먼저 알리고, Native 트랙으로 대신할지 묻는다.

HTML/CSS로 슬라이드를 그려 PNG로 렌더하는 우회로를 시도하지 않는다. 산출물이 결국 이미지라서 PowerPoint에서 텍스트 수정, 크기 조절, 배경 정리가 모두 막힌다. Raster의 약점을 그대로 가지면서 Native의 장점은 못 얻는다.

보고서·제안서처럼 표와 수치가 많은 덱은 실행 환경과 무관하게 Native 트랙이 낫다.

- 이미지 생성 모델은 표 정렬, 막대 길이, 날짜 축, 라벨 겹침을 자주 틀린다.
- 발표 직전 숫자나 문구를 고쳐야 하는 일이 흔한데, raster는 통째로 다시 렌더해야 한다.
- Native는 표·텍스트·도형이 PowerPoint 객체로 남아 사용자가 직접 수정한다.

Raster 트랙은 편집 가능성을 포기해도 되는 시각 중심 덱에만 쓴다.

Codex에서 실행할 때는 아래 하위 스킬에 위임할 수 있다. Claude에는 이 스킬들이 없으므로 각 stage를 직접 수행한다.

- `DESIGN.md` 작성: `gpt-slide-design`
- `slide_plan.json` 작성: `gpt-slide-plan`
- `slide_prompts.json` 작성: `gpt-slide-prompt`
- 페이지 이미지 생성: `gpt-slide-generate`

공통 도구:

- 네이티브 조립: `components/` (아래 "구조화 도형" 참고)
- PPTX 패키징: `scripts/package-raster-pptx.mjs`

여러 stage를 이어서 실행하거나 기존 산출물에서 재개할 때는 `references/stage-contract.md`를 읽는다.

레퍼런스가 있는 덱은 `references/design-quality-gate.md`도 읽는다. 이 파일은 폰트, 본문 크기, 팔레트, 컴포넌트 충실도 검수 기준이다.

레퍼런스가 있는 덱의 Stage 1은 `references/design-token-extraction.md`도 읽는다. 이 파일은 특정 레퍼런스의 고유 스타일을 기본값으로 삼지 않고, 실제로 관찰된 레이아웃/표/차트/타이포그래피 반복 요소만 토큰으로 추출하는 기준이다.

## 내장 도구와 의존성

Merry-slide는 Stage 5를 위해 자체 패키징 도구를 포함한다.

- `scripts/package-raster-pptx.mjs`: `page_<n>.png` 이미지를 full-slide raster PPTX로 조립
- `scripts/setup-deps.sh`: 스킬 내부 `vendor/`에 Node 의존성 설치
- `package.json`: 필요한 패키지 선언
- `components/`: 관찰된 레퍼런스에서 추출한 네이티브 PPTX 컴포넌트 라이브러리

## 구조화 도형은 이미지 생성 대신 컴포넌트를 쓴다

간트/타임라인, 비교 매트릭스, 프로세스 chevron, 정확한 수치가 걸린 표와 stat 그리드처럼 **좌표·정렬·비율이 정확해야 하는 요소**는 이미지 생성 모델이 자주 틀린다(날짜 밀림, 막대 길이 오차, 라벨 겹침).

이런 요소가 필요한 slide는 Stage 4 raster 렌더로 보내지 말고 `components/`의 네이티브 빌더로 만든다. 구조 로직(좌표·비율)만 코드에 고정하고, 색상·폰트는 Stage 1의 `DESIGN.md` 토큰을 주입한다. 레퍼런스에 없는 시각 문법을 발명하지 않는다는 원칙은 그대로 유지된다 — 컴포넌트의 구조는 실제 레퍼런스에서 관찰해 뽑은 것이어야 한다.

현재 포함된 컴포넌트 세트:

- `components/mysc-proposal.mjs`: MYSC 제안서 톤. 표지, 섹션 구분, 본문 헤더 블록, 네이비 pill 소제목, 무배경 stat 그리드, 표, 프로세스 chevron
- `components/example-mysc-deck.mjs`: 위 컴포넌트 스모크 테스트 겸 사용 예시

근거 토큰은 `references/examples/mysc-2026/tokens.md`에 있다. 다른 톤의 덱을 만들 때는 그 레퍼런스에서 같은 방식으로 토큰을 뽑아 새 컴포넌트 파일을 만든다. MYSC 컴포넌트를 다른 브랜드 덱에 그대로 쓰지 않는다.

패키징 도구는 의존성을 아래 순서로 찾는다.

1. 현재 workspace의 `node_modules`
2. Merry-slide의 `vendor/node_modules`
3. Merry-slide skill 폴더의 `node_modules`

`pptxgenjs`가 없다는 오류가 나오면 우회하지 말고 먼저 아래를 실행한다.

```bash
bash scripts/setup-deps.sh
```

그 다음 Stage 5 패키징 명령을 다시 실행한다. 실행 권한이 없어도 `bash` 또는 `node`로 호출하면 된다.

## 사람이 결정하는 지점

Merry-slide는 덱을 대신 만들어 주는 자동화가 아니라 **사람이 판단할 지점을 정해 놓은 작업 흐름**이다. 끝까지 혼자 밀고 가서 완성본을 내밀지 않는다. 아래 네 곳에서는 멈추고 사용자에게 확인받는다.

| 체크포인트 | 언제 | 보여줄 것 | 물을 것 |
| --- | --- | --- | --- |
| **CP1 — 기본값** | Stage 0 끝 | brief 요약 3~5줄 | 폰트, 본문 최소 크기, 트랙(Native/Raster), 레퍼런스 충실도 |
| **CP2 — 디자인 시스템** | Stage 1 끝 | `DESIGN.md`의 token table | 이 톤이 맞는지, 빠진 관찰이 있는지 |
| **CP3 — 스토리와 장수** | Stage 2 끝 | **구성 프리뷰 HTML** (실제 문구가 들어간 슬라이드) | 순서, 장수, 각 장의 형식, 강조할 메시지, 뺄 내용 |
| **CP4 — 시각 검수** | Stage 4 렌더 후 | 렌더된 슬라이드 이미지 | 배치, 밀도, 톤이 의도대로인지 |

CP2와 CP3이 가장 중요하다. 여기서 틀리면 이후 작업이 전부 헛수고가 된다. 디자인 시스템과 스토리는 되돌리는 비용이 크므로, 확인 없이 다음 stage로 넘어가지 않는다.

체크포인트에서는 짧게 묻는다. 선택지를 길게 나열하지 말고, 판단이 필요한 것만 1~3개 제시하고 추천안을 함께 준다.

사용자가 "알아서 해줘", "빨리 해줘"라고 하면 CP1과 CP3만 남기고 나머지는 진행하면서 결과에 근거를 붙여 보고한다. 그래도 CP3은 건너뛰지 않는다. 장수와 메시지 우선순위는 모델이 대신 정할 수 없다.

### 모델이 혼자 정하지 않는 것

- **슬라이드 장수**: 밀도로 제안은 하되 확정은 사용자가 한다.
- **무엇을 강조할지**: 같은 자료로도 설득 축이 여러 개다.
- **뺄 내용**: 자료에 있다고 다 넣지 않는다. 무엇을 버릴지는 사용자 판단이다.
- **레퍼런스 충실도**: "거의 동일하게"와 "참고만"은 결과가 완전히 다르다.
- **없는 사실**: 자료에 근거가 없으면 지어내지 않는다. 빈칸으로 두고 무엇이 필요한지 말한다. 제안서에서 지어낸 숫자는 결함이 아니라 사고다.

### 사람이 하는 편이 빠른 것

아래는 모델이 붙들고 씨름하지 말고 사용자에게 넘긴다.

- 레퍼런스 원본 파일 확보 (접근 안 되는 링크는 스크린샷/PDF를 요청한다)
- 브랜드 폰트 설치 여부 확인
- 최종 PPTX를 실제 PowerPoint에서 열어 확인
- 사내 표현, 고유명사, 직함 표기 확정

## Stage 선택

먼저 사용자가 원하는 stage를 판단한다. 사용자가 stage를 명시하면 해당 stage와 필요한 선행 검증만 실행한다. 사용자가 “만들어줘”, “완성해줘”, “PPT로 뽑아줘”처럼 말하거나 stage를 따로 고르지 않으면 `Auto`로 보고 가장 이른 미완료 stage부터 끝까지 진행한다.

| Stage | 이름 | 트랙 | 입력 | 출력 | 완료 기준 |
| --- | --- | --- | --- | --- | --- |
| 0 | Intake | 공통 | 요청, 링크, 파일, 레퍼런스 이미지/PDF | `merry_slide_brief.md` 또는 짧은 대화형 brief | 목표, 소스, 트랙, 최종 산출물이 명확함 |
| 1 | Design | 공통 | 레퍼런스 이미지/PDF/링크/`.pptx` | `DESIGN.md` | 재사용 가능한 디자인 시스템이 잡힘 |
| 2 | Plan | 공통 | `DESIGN.md`, 사용자 목표, 원본 콘텐츠 | `slide_plan.json` | 스토리와 슬라이드 순서가 타당함 |
| 3 | Prompt | Raster | `DESIGN.md`, `slide_plan.json`, 원본 콘텐츠 | `slide_prompts.json` | 모든 슬라이드가 생성 가능한 프롬프트를 가짐 |
| 4A | Build (native) | Native | `DESIGN.md`, `slide_plan.json`, `components/` | 빌더 스크립트 + `.pptx` | 덱이 열리고 렌더 검수를 통과함 |
| 4B | Render (raster) | Raster | `DESIGN.md`, `slide_prompts.json` | `page_<n>.png` | 모든 페이지 이미지가 생성되고 검수됨 |
| 5 | Package | 공통 | 페이지 이미지 또는 네이티브 덱 | `.pptx` | PPTX가 열리고 슬라이드 수가 계획과 일치함 |

Native 트랙은 Stage 3을 건너뛴다. 이미지 프롬프트가 필요 없기 때문이다.

stage가 애매하면 짧게 한 번만 묻는다. 추천 옵션은 항상 `Auto: 누락된 stage 전체 진행`이다.

## 사용자에게 stage를 물을 때

다음 메뉴를 그대로 짧게 제시한다.

- `Auto` - 필요한 stage를 자동으로 이어서 최종 산출물까지 진행
- `0 Intake` - 소스, 목표, 청중, 최종 산출물 정리
- `1 Design` - `DESIGN.md` 생성 또는 수정
- `2 Plan` - `slide_plan.json` 생성 또는 수정
- `3 Prompt` - `slide_prompts.json` 생성 또는 수정
- `4 Render` - 검수된 `page_<n>.png` 이미지 생성
- `5 Package` - 생성 이미지로 raster `.pptx` 제작

사용자 요청만으로 충분하면 묻지 말고 `Auto`를 선택한다.

## 입력 처리 규칙

다음 입력을 받을 수 있다.

- 레퍼런스 슬라이드 이미지
- 레퍼런스 덱 export, PDF, 스크린샷
- 레퍼런스 URL
- 사용자 메모, Markdown, 문서, 스프레드시트, PDF
- 기존 `DESIGN.md`, `slide_plan.json`, `slide_prompts.json`

레퍼런스 URL이 주어지면:

1. 시각적 레퍼런스 판단에 필요한 범위만 열거나 확인한다.
2. 보이는 디자인 근거를 캡처하거나 관찰한다.
3. brief에 URL을 레퍼런스 소스로 기록한다.
4. 접근이 안 되면 스크린샷, 이미지 crop, PDF export를 요청한다.

사용자가 명시하지 않는 한 레퍼런스는 콘텐츠 권위가 아니라 디자인 권위다.

- 레퍼런스 자료: 시각 언어, 레이아웃, 팔레트, 타입, 컴포넌트 규칙
- 사용자 요청과 원본 파일: 메시지, 사실관계, 스토리, 슬라이드 내용

## 사용자 확인이 필요한 기본값

레퍼런스 덱 전체가 없어도 된다. **대표 장표 5~6개**만 받아도 형식 어휘를 잡을 수 있다. Stage 0에서 이렇게 요청한다.

> 자주 쓰는 장표 형식을 5~6개만 보여주세요. 표가 들어간 장, 좌우로 나뉜 장, 도식이 큰 장처럼 형태가 다른 것으로 골라주시면 좋습니다.

받은 장표에서 형식 이름을 한글로 정하고 `references/composition-format.md`에 맞춰 정리한다. 레퍼런스가 아예 없으면 그 파일의 기본 8종을 쓰되 사용자에게 알린다.

아래 값이 사용자 요청이나 레퍼런스에서 명확하지 않으면 Stage 0에서 짧게 묻는다. 질문은 한 번에 1-3개만 한다.

- 폰트: 기본 제안은 `Pretendard`
- 본문 최소 크기: 기본 제안은 `12pt 이상`
- 산출물: `raster PPTX`인지, 수정 가능한 `native PPTX`인지
- 렌더 모델: 기본 제안은 `gpt-image-2`
- 레퍼런스 충실도: “거의 동일한 보고서 톤”인지 “참고만 한 새 톤”인지

사용자가 빠르게 진행하라고 했거나 이미 답을 준 경우에는 묻지 않고 기록한다. 단, 폰트/본문 크기/렌더 모델을 임의로 낮추지 않는다.

## 디자인 충실도 기본값

한국어 덱의 기본 폰트 제안은 `Pretendard`다. 사용자가 확정하면 산출물과 source script에 명시한다. 사용자가 다른 폰트를 요구하면 그 값을 우선한다.

본문 텍스트는 최소 12pt다. 표 본문, 차트 라벨, 다이어그램 설명도 12pt 이상을 기본으로 한다. 예외는 페이지 번호, 출처, 축약 footer 같은 보조 메타데이터뿐이며 8-10pt로 제한한다.

레퍼런스 기반 작업에서 가장 중요한 규칙은 “새로운 시각 문법을 발명하지 않는 것”이다.

- 레퍼런스에 없는 다색 KPI 카드, 무지개식 accent, 두꺼운 윤곽선 카드, 그림자 카드, generic dashboard widget을 만들지 않는다.
- 팔레트는 레퍼런스에서 관찰된 dominant color와 neutral color를 우선한다. 의미 구분이 필요해도 accent는 1-2개까지만 쓴다.
- 도식화가 필요하면 레퍼런스의 선, 박스, 표, 여백, 헤더 문법 안에서 만든다.
- 표와 차트는 레퍼런스가 보여준 밀도와 선 굵기를 따른다. “보기 좋아 보이는” 임의 카드 레이아웃으로 바꾸지 않는다.
- `fit: shrink`나 작은 글씨로 정보를 밀어 넣지 않는다. 12pt로 안 들어가면 내용을 줄이거나 슬라이드를 나눈다.

Stage 1 Design은 반드시 아래를 기록한다.

- font family와 최소 크기
- observed palette와 금지 색상
- observed components: header, footer, table, chart, callout, diagram
- observed design token table: canvas, layout primitives, header, typography, palette, table, chart, diagram, footer, forbidden
- forbidden patterns: 레퍼런스에 없는 장식/카드/색상/아이콘 스타일
- body slide density rule: 한 장에 담을 수 있는 최대 표 행, bullet 수, chart 수

토큰 추출에는 토큰을 많이 써도 된다. 오히려 레퍼런스가 보고서형이거나 표/차트가 많은 경우 토큰을 적게 쓰는 것이 실패다. “깔끔한 보고서 톤”처럼 요약하지 말고 `header.rule.primary_segment`, `table.border`, `chart.grid`, `chart.primary_series`, `typography.body.size`처럼 역할 기반 이름으로 쓴다. 단, 특정 레퍼런스에서만 보이는 구조나 색상은 기본값으로 승격하지 않는다.

## 기본 Auto 워크플로우

사용 가능한 산출물이 없으면 전체 stage를 실행한다.

Native 트랙 (기본):

1. Stage 0: 목표, 청중, 목표 장수, 레퍼런스, 콘텐츠 소스, 최종 산출물을 확인한다.
2. Stage 1: `DESIGN.md`를 만든다.
3. Stage 2: `slide_plan.json`을 만든다.
4. Stage 4A: `components/`의 빌더로 덱을 조립하고 렌더해서 검수한다.
5. Stage 5: PPTX를 확인해서 넘긴다.

Raster 트랙 (이미지 생성이 가능하고, 편집 가능성을 포기해도 되는 경우):

1. Stage 0~2는 동일하다.
2. Stage 3: `slide_prompts.json`을 만든다.
3. Stage 4B: 페이지를 한 장씩 생성하고 검수한다.
4. Stage 5: `scripts/package-raster-pptx.mjs`로 패키징한다.

기존 산출물이 있으면 재시작보다 재개를 우선한다.

- `DESIGN.md`는 있고 `slide_plan.json`이 없으면 Stage 2부터
- `slide_plan.json`이 있고 Native 트랙이면 Stage 4A부터
- `slide_plan.json`은 있고 `slide_prompts.json`이 없으면 Stage 3부터 (Raster)
- `slide_prompts.json`은 있고 `page_<n>.png`가 없으면 Stage 4B부터
- 페이지 이미지가 있고 사용자가 PPT/PPTX를 원하면 Stage 5부터

재개 전에는 산출물이 그럴듯한지 확인한다.

- `DESIGN.md`: layout family, body-slide rule, observed design token table이 있는가
- `slide_plan.json`: JSON 파싱이 되고 slide number가 순차적인가
- `slide_prompts.json`: JSON 파싱이 되고 계획된 slide 수와 prompt 수가 맞는가
- 페이지 이미지: prompt JSON의 slide 수와 이미지 수가 맞는가

## Stage 0: Intake Brief

소스가 여러 개거나 애매한 점이 있으면 짧은 brief를 만든다.

```markdown
# Merry-slide Brief
- Goal:
- Audience:
- Speaker mode: presented | read-only | hybrid
- Target length:
- Reference source:
- Content sources:
- Requested final output: DESIGN.md | plan | prompts | images | PPTX
- Typography: font, body minimum size
- Render model: gpt-image-2 unless user chooses otherwise
- Editability: raster PPTX | native editable PPTX
- Assumptions:
- Missing inputs:
```

brief는 실행 정확도를 위한 최소 문서다. 과하게 기획하지 않는다.

Stage 0에서 폰트, 본문 크기, 렌더 모델, 산출물 편집성이 비어 있으면 사용자가 이미 지시한 값과 기본 제안을 함께 적는다. 애매하면 “Pretendard / 본문 12pt 이상 / gpt-image-2 / raster PPTX 기본”으로 진행해도 되는지 묻는다.

## Stage 1: Design

`gpt-slide-design`을 사용한다.

필수 기준:

- 가장 강한 시각 레퍼런스를 사용한다.
- 관찰된 규칙과 추론한 규칙을 분리한다.
- 폰트, 최소 본문 크기, 팔레트 제한, 금지 패턴을 명시한다.
- `references/design-token-extraction.md` 기준으로 role-based design token table을 작성한다.
- header rule, side rail, 표 header/grid, 차트 grid/axis/series 같은 반복 요소가 보이면 반드시 별도 토큰으로 기록한다. 보이지 않는 요소는 만들거나 강제하지 않는다.
- title/body/end page 흐름을 잡는다.
- body slide의 반복 규칙을 명시한다.
- 표, 차트, 아이콘, 인포그래픽, 다이어그램 규칙을 보이는 범위에서 잡는다.
- 레퍼런스 슬라이드의 사적 내용은 구조 설명에 필요한 최소 라벨 외에는 복사하지 않는다.

출력: `DESIGN.md`

## Stage 2: Plan

`gpt-slide-plan`을 사용한다.

필수 기준:

- `DESIGN.md`를 시각 제약으로 사용한다.
- 사용자 자료를 사실관계의 출처로 사용한다.
- 파일 업로드 순서가 아니라 청중 설득 흐름으로 스토리를 만든다.
- 장수는 임의로 정하지 말고 밀도와 설득력 기준으로 정한다.
- 근거가 약하거나 빠진 부분은 명시한다.
- 표/차트/아이콘/다이어그램 사용 여부를 prompt 작성 전에 정한다.

출력: 유효한 `slide_plan.json` (형식은 `references/composition-format.md`)

### CP3: 구성 프리뷰로 확정받는다

`slide_plan.json`을 만들었으면 채팅으로 목록을 나열하지 말고 프리뷰를 띄운다.

```bash
node scripts/preview-composition.mjs --plan slide_plan.json --out preview.html
```

프리뷰는 와이어프레임이 아니라 **실제 문구가 들어간 슬라이드**를 렌더한다. 사용자는 한 장씩 넘기며 형식을 고르고, 제목을 고치고, 순서를 바꾸고, 장을 지우거나 추가한 뒤 `확정 저장`으로 `slide_plan.confirmed.json`을 내려받는다.

지켜야 할 것:

- **`content`를 채운 뒤에 띄운다.** 제목만 있고 본문이 빈 프리뷰는 검토 자료가 아니다.
- 모든 본문 슬라이드에 `intro` 리드 문단(150~200자)을 넣는다. 빠뜨리지 않는다.
- `introOptions`에 후보를 2~3개 담아 사용자가 프리뷰에서 고르게 한다. 작성 기준은 `references/lead-writing.md`.
- 빈 공간은 `figure`로 무엇이 들어갈지 명시한다.
- 형식 이름은 한글로만 노출한다. 내부 키를 사용자에게 보여주지 않는다.
- 사용자가 확정 파일을 주면 그 파일을 Stage 4A의 입력으로 삼는다. 채팅에서 다시 협의하지 않는다.

이 방식은 "3번은 2단으로, 7번은 표로" 같은 왕복을 없애 토큰을 아끼고, 구성이 파일로 확정되어 해석 차이가 생기지 않는다.

## Stage 3: Prompt

`gpt-slide-prompt`를 사용한다.

필수 기준:

- 승인된 plan 순서를 유지한다.
- 이미지 생성기가 오해하지 않을 만큼 구체적으로 쓴다.
- header/body/footer 배치를 명시한다.
- Stage 1의 design token 이름을 slide별 prompt에 직접 넣는다. “레퍼런스 색 사용”처럼 뭉뚱그리지 않는다.
- 표/차트/도식이 있는 slide는 table/chart/diagram token을 각각 명시한다.
- slide별 anti-pattern ban을 포함한다. 금지 패턴은 레퍼런스에 없는 다색 카드, 과한 윤곽선, 작은 본문, 임의 dashboard widget을 포함한다.
- body slide의 시각 일관성을 유지한다.
- 사실관계는 사용자 자료에 근거한다.

출력: 유효한 `slide_prompts.json`

## Stage 4A: Build (Native 트랙)

`components/`의 빌더로 슬라이드를 조립하는 스크립트를 작성한다. `components/example-mysc-deck.mjs`가 참고 예시다.

필수 기준:

- Stage 1의 design token을 빌더 상수로 옮긴다. 색상을 코드에 직접 적지 않는다.
- 캔버스 비율을 레퍼런스에서 확인한 값으로 등록한다. 16:9를 기본으로 가정하지 않는다.
- 표는 native table, 텍스트는 native text로 남긴다. 사용자가 PowerPoint에서 직접 고칠 수 있어야 한다.
- 레퍼런스에서 관찰되지 않은 카드/장식/색상을 추가하지 않는다.
- **배치가 결과 품질을 좌우한다.** 콘텐츠를 상단에 몰아두고 하단을 비우지 않는다. 레퍼런스의 body 영역 밀도를 따른다.
- 빈 공간이 크게 남으면 슬라이드를 합치고, 넘치면 나눈다. 글씨를 줄여 밀어 넣지 않는다.

검수는 눈으로 한다. 스크립트가 에러 없이 끝난 것은 완료가 아니다. 모델이 먼저 렌더해서 명백한 결함을 고친 뒤, **CP4로 사용자에게 이미지를 보여주고 판단을 받는다.** 모델 검수로 갈음하지 않는다.

```bash
node <빌더>.mjs --out deck.pptx
soffice --headless --convert-to pdf deck.pptx
pdftoppm -jpeg -r 110 deck.pdf slide
```

렌더된 이미지를 직접 열어 텍스트 잘림, 도형 겹침, 여백 불균형, 정렬 어긋남을 확인한다. 문제가 있으면 빌더를 고치고 다시 렌더한다.

## Stage 4B: Render (Raster 트랙)

이미지 생성이 가능한 환경에서만 실행한다. Claude에서는 이 stage를 건너뛰고 Stage 4A를 쓴다.

`gpt-slide-generate`를 사용한다.

기본 렌더 모델은 `gpt-image-2`다. 가능하면 최신 alias인 `gpt-image-2`를 사용하고, 재현성이 더 중요하면 snapshot `gpt-image-2-2026-04-21`을 brief에 기록한다.

Codex native image generation이 모델 선택을 직접 노출하지 않아도 프롬프트와 작업 기록에는 `gpt-image-2` 목표를 명시한다. API runner가 있는 환경에서는 `gpt-image-2`를 사용한다. `gpt-image-1`, `gpt-image-1.5`, DALL-E 계열로 조용히 downgrade하지 않는다. 사용할 수 없으면 fallback 전에 사용자에게 알린다.

필수 기준:

- 한 번에 한 장씩 생성한다.
- 각 이미지를 받아들기 전에 직접 검수한다.
- 텍스트가 안 읽히거나, 본문이 12pt 미만으로 보이거나, 구성이 깨졌거나, page family가 틀렸거나, 테마가 흔들리면 재생성한다.
- 레퍼런스에서 관찰된 핵심 token이 누락되면 재생성한다. 특정 레퍼런스의 side rail, split rule, 색상 조합은 관찰된 경우에만 요구한다.
- 레퍼런스에 없던 카드/색/장식이 생기면 “스타일 창작”으로 보고 재생성한다.
- 기본 저장명은 `page_<n>.png`다.
- 최종 이미지를 generated-images cache에만 두지 않는다.

## Stage 5: Package

사용자가 `.pptx`, PowerPoint, 덱 파일, 공유 가능한 파일을 요청한 경우에만 실행한다.

Raster 트랙의 패키징은 raster PPTX다. Native 트랙은 Stage 4A에서 이미 `.pptx`가 나오므로, 여기서는 슬라이드 수와 배치만 확인한다.

- 승인된 `page_<n>.png`를 각 슬라이드에 full-slide 이미지로 배치한다.
- 페이지 순서를 정확히 유지한다.
- 조립에 사용한 source script를 남긴다.
- PPTX를 렌더링하거나 검사해서 slide count와 이미지 배치를 확인한다.

가능하면 번들 스크립트를 사용한다.

```bash
node scripts/package-raster-pptx.mjs \
  --images page_1.png,page_2.png,page_3.png \
  --out merry-slide-deck.pptx
```

다른 머신에서 실행할 때는 스크립트를 workspace로 복사하거나 `slides` 스킬로 같은 PptxGenJS wrapper를 작성한다.

완전히 편집 가능한 네이티브 PowerPoint 도형/표가 필요하면 `slides` 스킬로 전환하고, 이미지 기반 Merry-slide와 다른 제작 방식임을 명확히 말한다.

네이티브 PPT를 만들 때도 이 스킬의 디자인 충실도 기본값은 유지한다. `slides` 스킬을 쓰더라도 Pretendard, 본문 12pt 이상, observed palette, forbidden patterns를 source script에 반영한다.

네이티브 PPT source script는 Stage 1 design tokens를 상수로 옮긴다. split rule이나 side rail처럼 분절된 장식/구조 요소가 관찰된 경우에만 별도 선/사각형 segment로 구현하고, 표/차트는 tokenized border/grid/series 색상을 사용한다.

## 공개/안전 가드레일

- 사용 권한이 있는 레퍼런스만 사용한다.
- 사용자가 소유 또는 사용 허가를 명시하지 않은 로고, 워터마크, 기밀 라벨, 브랜드 자산은 복제하지 않는다.
- 검증되지 않은 폰트명을 확정적으로 말하지 않는다.
- 렌더 모델을 조용히 downgrade하지 않는다. `gpt-image-2`가 실행 환경에서 막히면 먼저 사용자에게 알린다.
- 사용자가 요청하지 않으면 원본 파일, 내부 메모, 레퍼런스 URL을 최종 산출물에 노출하지 않는다.

## 완료 보고

마지막에는 짧게 보고한다.

- 완료한 stage
- 생성/수정한 파일
- 건너뛴 stage와 이유
- 남은 시각/콘텐츠 리스크
- **사용자가 지금 결정해야 할 것** (해당 체크포인트와 함께)
- 이어서 진행할 수 있는 정확한 다음 stage

산출물이 주 결과물이다. 보고는 간결하게 유지한다.

근거가 없어 비워둔 칸, 추정으로 채운 값, 사용자 확인 없이 고른 기본값이 있으면 반드시 명시한다. 조용히 넘어가지 않는다.
