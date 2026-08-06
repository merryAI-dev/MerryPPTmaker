# MerryPPTmaker

MerryPPTmaker는 Codex에서 발표자료를 단계적으로 만드는 Merry AI 내부용 스킬 번들입니다.

핵심 목표는 "한 번에 예쁜 슬라이드를 만들어 달라"가 아니라, 레퍼런스 디자인과 사용자 자료를 분리해서 읽고, 중간 산출물을 남기며, 품질이 흔들리는 지점으로 되돌아갈 수 있는 슬라이드 제작 파이프라인을 제공하는 것입니다.

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

레퍼런스는 콘텐츠가 아니라 디자인 권위이고, 사용자 자료는 콘텐츠 권위입니다. 폰트/본문 크기/렌더 모델/편집성처럼 애매하면 결과 품질을 좌우하는 기본값은 Stage 0에서 먼저 확인합니다. 자세한 stage별 규칙, 완료/재개 기준, 디자인 품질 게이트, 디자인 토큰 추출 계약은 아래 "스킬 문서" 섹션을 참고하세요 — 실제 동작 기준은 이 파일이 아니라 그 문서들입니다.

## Stage Workflow

| Stage | 이름 | 입력 | 출력 | 완료 기준 |
| --- | --- | --- | --- | --- |
| 0 | Intake | 사용자 요청, 링크, 파일, 레퍼런스 | `merry_slide_brief.md` 또는 짧은 brief | 목표, 청중, 소스, 폰트, 본문 크기, 모델, 편집성이 명확함 |
| 1 | Design | 레퍼런스 PDF/이미지/링크 | `DESIGN.md` | observed/inferred 규칙, 폰트, role-based token table, 금지 패턴이 정리됨 |
| 2 | Plan | `DESIGN.md`, 사용자 자료 | `slide_plan.json` | 설득 흐름, 페이지 역할, token reuse가 타당함 |
| 3 | Prompt | `DESIGN.md`, `slide_plan.json` | `slide_prompts.json` | 페이지별 프롬프트, token 이름, anti-generic ban이 있음 |
| 4 | Render | `slide_prompts.json` | `page_<n>.png` | `gpt-image-2` 기준으로 한 장씩 생성되고 핵심 token이 검수됨 |
| 5 | Package | 승인된 이미지 또는 native 요소 | `.pptx` | 슬라이드 수, 배치, 편집성 조건이 확인됨 |

전체 stage 판단 로직(사용자에게 무엇을 묻는지, 어디서 재개하는지)은 `SKILL.md`와 `references/stage-contract.md`가 기준입니다.

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

사용자가 수정 가능한 PowerPoint를 요구하면 `slides` 스킬과 PptxGenJS 기반 native object 제작으로 전환합니다. 이때도 MerryPPTmaker의 디자인 품질 게이트(`references/design-quality-gate.md`)는 그대로 유지합니다.

## 스킬 문서

실제 동작 기준이 되는 문서는 여기 있습니다. README는 요약본이고, 규칙이 바뀌면 아래 파일들을 먼저 고칩니다.

| 파일 | 역할 |
| --- | --- |
| `SKILL.md` | Codex가 읽는 메인 스킬 문서. stage 선택, 입력 처리, 디자인 충실도 기본값, gpt-image-2 정책, package 규칙 |
| `references/stage-contract.md` | stage별 완료 조건과 재개 규칙 |
| `references/design-quality-gate.md` | 폰트, 본문 크기, 팔레트, 레퍼런스 충실도, 모델 downgrade 금지 기준 |
| `references/design-token-extraction.md` | 레퍼런스 시각 시스템을 role-based token으로 추출하는 기준 |
| `agents/openai.yaml` | 스킬 UI 메타데이터 (기본 설명, `default_model: gpt-image-2`) |
| `scripts/setup-deps.sh` | 스킬 내부 `vendor/`에 Node 의존성 설치 |
| `scripts/package-raster-pptx.mjs` | `page_<n>.png` 이미지를 full-slide raster PPTX로 조립 |
| `components/mysc-proposal.mjs` | MYSC 제안서 톤 네이티브 PPTX 컴포넌트 (표지·헤더·pill·stat 그리드·표·chevron) |
| `references/examples/mysc-2026/` | 위 컴포넌트의 근거가 된 레퍼런스 추출 결과 (토큰·도형 전량 덤프·브랜드 에셋) |

핵심 기본값만 요약하면:

- 한국어 덱 폰트: `Pretendard` (사용자가 다른 폰트를 명시하지 않는 한)
- 본문/표/차트 라벨: 최소 12pt (footer, 출처, 페이지 번호만 8-10pt 허용)
- 렌더 모델: `gpt-image-2` (조용히 downgrade하지 않음, fallback 전에 항상 승인받음)
- 기본 산출물: raster PPTX (native 편집 가능 PPTX가 필요하면 `slides` 스킬로 전환)

## 구조화 도형은 컴포넌트로

간트/타임라인, 비교 매트릭스, 프로세스 chevron, 정확한 수치가 걸린 표와 stat 그리드는 이미지 생성 모델이 자주 틀립니다(막대 길이 오차, 라벨 겹침, 날짜 밀림). 이런 요소는 raster 렌더 대신 `components/`의 네이티브 빌더로 만듭니다.

구조 로직(좌표·비율)만 코드에 고정하고 색상·폰트는 `DESIGN.md` 토큰을 주입하므로, "레퍼런스에 없는 시각 문법을 발명하지 않는다"는 원칙은 유지됩니다. 컴포넌트의 구조 자체가 실제 레퍼런스 관찰에서 나온 것이어야 합니다.

```bash
node components/example-mysc-deck.mjs --out sample.pptx
```

`components/mysc-proposal.mjs`는 실제 MYSC 제안서 템플릿 32장 / 도형 1031개를 전수 추출해서 만들었고, 근거 토큰은 `references/examples/mysc-2026/tokens.md`에 있습니다. 다른 브랜드 톤의 덱을 만들 때는 그 레퍼런스에서 같은 방식으로 토큰을 뽑아 새 컴포넌트 파일을 만듭니다.

## Raster PPTX와 Native PPTX

기본 Stage 5는 raster PPTX입니다. 이미지 렌더 결과를 그대로 보존하고 슬라이드 간 시각 일관성이 유지되지만, 표/차트/텍스트를 PowerPoint에서 직접 편집하기는 어렵습니다.

사용자가 "수정 가능한 표", "native chart", "PowerPoint에서 직접 고치게"를 요구하면 `slides` 스킬로 전환합니다. native PPT 기준(테마 폰트, 12pt 이상, native table/chart, 관찰된 split rule 구현, 토큰 기반 색상)은 `references/design-quality-gate.md`의 "Native PPT Checklist"를 따릅니다.

## 두 가지 트랙

Stage 4에서 트랙이 갈립니다. Stage 0~3과 5는 공통입니다.

| 트랙 | 방식 | 산출물 | 실행 환경 |
| --- | --- | --- | --- |
| **Native** (기본) | `components/`의 PptxGenJS 빌더로 슬라이드를 직접 조립 | 편집 가능한 PPTX | Claude, Codex 모두 |
| **Raster** | 이미지 생성 모델로 페이지를 렌더 | `page_<n>.png` → raster PPTX | 이미지 생성이 가능한 환경 |

제안서처럼 표와 수치가 많은 덱은 Native가 낫습니다. 이미지 생성 모델은 표 정렬과 숫자를 자주 틀리고, 발표 직전 문구를 고쳐야 할 때 통째로 다시 렌더해야 합니다. Native는 표·텍스트·도형이 PowerPoint 객체로 남아 사용자가 직접 수정합니다.

Claude Code에는 이미지 생성 도구가 없으므로 Native 트랙만 사용합니다.

## 사람이 결정하는 지점

이 저장소는 덱을 대신 만들어 주는 자동화가 아니라, **사람이 판단할 지점을 정해 놓은 작업 흐름**입니다. 네 곳에서 멈추고 확인받습니다.

| 체크포인트 | 언제 | 물을 것 |
| --- | --- | --- |
| CP1 기본값 | Stage 0 끝 | 폰트, 본문 크기, 트랙, 레퍼런스 충실도 |
| CP2 디자인 시스템 | Stage 1 끝 | 톤이 맞는지, 빠진 관찰이 있는지 |
| CP3 스토리와 장수 | Stage 2 끝 | 순서, 장수, 각 장의 형식, 뺄 내용 |
| CP4 시각 검수 | Stage 4 렌더 후 | 배치, 밀도, 톤이 의도대로인지 |

특히 장수, 강조할 메시지, 뺄 내용, 레퍼런스 충실도는 모델이 혼자 정하지 않습니다. 자료에 근거가 없는 사실은 지어내지 않고 빈칸으로 두고 무엇이 필요한지 말합니다.

### CP3은 프리뷰로 확정합니다

Stage 2가 끝나면 채팅으로 목록을 나열하는 대신 구성 프리뷰를 띄웁니다.

```bash
node scripts/preview-composition.mjs --plan slide_plan.json --serve --images ~/사진폴더 --pptx deck.pptx
```

와이어프레임이 아니라 **실제 문구가 들어간 슬라이드**가 렌더됩니다. 슬라이드 좌우의 큰 화살표로 넘기며 형식을 고르고, 제목과 리드 문단을 고치고, 순서를 바꿉니다.

확정과 생성은 따로입니다.

- `이 장 확정` — 지금 장을 확정 목록에 넣습니다. **누른 순서가 곧 덱의 순서**입니다. 다시 누르면 해제됩니다.
- `PPTX 생성` — 확정한 장만, 확정한 순서대로 만듭니다.

`--serve`로 띄우면 `PPTX 생성`을 누르는 순간 서버가 PPTX까지 만들어 냅니다. JSON을 내려받아 다시 넘길 필요가 없습니다.

"3번은 2단으로, 7번은 표로" 같은 왕복이 없어져 토큰이 줄고 해석 차이도 생기지 않습니다. 형식은 그림과 한글 이름으로만 고르며 내부 키는 노출되지 않습니다.

장표 형식과 `slide_plan.json` 구조는 [references/composition-format.md](references/composition-format.md)에 있습니다. 본문 슬라이드에는 그 페이지 전체를 설명하는 **리드 문단(150~200자)** 이 반드시 들어가며, 후보를 여러 개 담아 프리뷰에서 골라 쓸 수 있습니다.

### 확정한 구성이 그대로 PPT가 됩니다

`--serve`로 띄웠다면 `PPTX 생성`을 누른 시점에 이미 만들어져 있습니다. 확정 JSON만 따로 있는 경우에는 빌더를 직접 돌립니다.

```bash
node components/build-from-plan.mjs --out deck.pptx
```

`--plan`을 생략하면 현재 폴더와 `~/Downloads`에서 `slide_plan.confirmed.json`을 자동으로 찾습니다. 파일을 옮기거나 경로를 알려줄 필요가 없습니다.

프리뷰와 같은 좌표를 쓰므로 확정한 모습이 그대로 덱이 됩니다. 표·텍스트·도형은 PowerPoint 네이티브 객체로 남아 직접 수정할 수 있습니다.

## 설치

### Claude

```bash
mkdir -p ~/.claude/skills
git clone https://github.com/merryAI-dev/MerryPPTmaker.git ~/.claude/skills/merry-slide
```

### Codex

```bash
mkdir -p ~/.codex/skills
git clone https://github.com/merryAI-dev/MerryPPTmaker.git ~/.codex/skills/merry-slide
```

이미 설치되어 있다면 해당 디렉터리에서 업데이트합니다.

```bash
git pull
```

새 스킬을 다시 발견하도록 세션을 재시작합니다. `agents/openai.yaml`은 Codex 전용 메타데이터이며 Claude에서는 `SKILL.md`의 frontmatter가 그 역할을 합니다.

## 의존성 설치

PPTX를 만드는 두 경로(Native 빌더 `components/build-from-plan.mjs`, Stage 5 raster 패키징) 모두 `pptxgenjs`를 씁니다. **클론 직후 한 번은 반드시 실행해야 합니다.** 스킬 내부 `vendor/`에 설치되며 시스템을 건드리지 않습니다.

```bash
bash scripts/setup-deps.sh
```

설치 전에 빌더를 돌리면 `pptxgenjs를 찾을 수 없습니다`로 멈추고 이 명령을 안내합니다.

설치 후 구조는 다음과 비슷합니다.

```text
vendor/
  node_modules/
  package.json
  package-lock.json
```

`vendor/`와 생성된 덱 파일은 커밋하지 않습니다.

## 클론에서 덱까지 (3분)

스킬을 통하지 않고 도구만 직접 써 볼 때의 최단 경로입니다. 클론한 폴더에서 실행합니다.

```bash
bash scripts/setup-deps.sh
node scripts/preview-composition.mjs --plan slide_plan.json --images ~/사진폴더 --serve
```

브라우저에서 `http://localhost:18888`을 엽니다. 좌우 화살표로 장을 넘기며 형식과 문구를 고치고, `이 장 확정`을 누른 순서대로 목록이 쌓이고, `PPTX 생성`을 누르면 그 자리에서 PPTX가 만들어집니다. 만들어진 경로는 화면과 터미널에 함께 찍힙니다.

`slide_plan.json`이 아직 없다면 `references/composition-format.md`의 예시를 복사해 시작하면 됩니다.

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
</content>
