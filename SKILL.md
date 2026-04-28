---
name: merry-slide
description: Use when creating a staged Codex-native presentation workflow from reference links, reference images, PDFs, notes, or source files into DESIGN.md, slide_plan.json, slide_prompts.json, generated slide images, or a raster PPTX package. Korean deck workflows and stage-based slide production are supported.
---

# Merry-slide

Merry-slide는 Codex 전용 발표자료 제작 워크플로우다. 레퍼런스 자료와 원본 콘텐츠를 받아 아래 단계형 파이프라인으로 처리한다.

`intake -> design -> plan -> prompts -> render -> package`

기존 slide 계열 스킬을 대체하지 않고 상위에서 묶어 실행한다.

- `DESIGN.md` 작성: `gpt-slide-design`
- `slide_plan.json` 작성: `gpt-slide-plan`
- `slide_prompts.json` 작성: `gpt-slide-prompt`
- 페이지 이미지 생성: `gpt-slide-generate`
- PPTX 패키징: `scripts/package-raster-pptx.mjs`
- 완전 편집 가능한 네이티브 PPT가 필요할 때만 `slides`

여러 stage를 이어서 실행하거나 기존 산출물에서 재개할 때는 `references/stage-contract.md`를 읽는다.

## 내장 도구와 의존성

Merry-slide는 Stage 5를 위해 자체 패키징 도구를 포함한다.

- `scripts/package-raster-pptx.mjs`: `page_<n>.png` 이미지를 full-slide raster PPTX로 조립
- `scripts/setup-deps.sh`: 스킬 내부 `vendor/`에 Node 의존성 설치
- `package.json`: 필요한 패키지 선언

패키징 도구는 의존성을 아래 순서로 찾는다.

1. 현재 workspace의 `node_modules`
2. Merry-slide의 `vendor/node_modules`
3. Merry-slide skill 폴더의 `node_modules`

`pptxgenjs`가 없다는 오류가 나오면 우회하지 말고 먼저 아래를 실행한다.

```bash
bash scripts/setup-deps.sh
```

그 다음 Stage 5 패키징 명령을 다시 실행한다. 실행 권한이 없어도 `bash` 또는 `node`로 호출하면 된다.

## Stage 선택

먼저 사용자가 원하는 stage를 판단한다. 사용자가 stage를 명시하면 해당 stage와 필요한 선행 검증만 실행한다. 사용자가 “만들어줘”, “완성해줘”, “PPT로 뽑아줘”처럼 말하거나 stage를 따로 고르지 않으면 `Auto`로 보고 가장 이른 미완료 stage부터 끝까지 진행한다.

| Stage | 이름 | 입력 | 출력 | 완료 기준 |
| --- | --- | --- | --- | --- |
| 0 | Intake | 요청, 링크, 파일, 레퍼런스 이미지/PDF | `merry_slide_brief.md` 또는 짧은 대화형 brief | 목표, 소스, 최종 산출물이 명확함 |
| 1 | Design | 레퍼런스 이미지/PDF/링크 | `DESIGN.md` | 재사용 가능한 디자인 시스템이 잡힘 |
| 2 | Plan | `DESIGN.md`, 사용자 목표, 원본 콘텐츠 | `slide_plan.json` | 스토리와 슬라이드 순서가 타당함 |
| 3 | Prompt | `DESIGN.md`, `slide_plan.json`, 원본 콘텐츠 | `slide_prompts.json` | 모든 슬라이드가 생성 가능한 프롬프트를 가짐 |
| 4 | Render | `DESIGN.md`, `slide_prompts.json` | `page_<n>.png` | 모든 페이지 이미지가 생성되고 검수됨 |
| 5 | Package | 페이지 이미지, 선택적 제목/메타데이터 | `.pptx`와 필요 시 조립 스크립트 | PPTX가 열리고 슬라이드 수가 이미지 수와 일치함 |

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

## 기본 Auto 워크플로우

사용 가능한 산출물이 없으면 전체 stage를 실행한다.

1. Stage 0: 목표, 청중, 목표 장수, 레퍼런스, 콘텐츠 소스, 최종 산출물을 확인한다.
2. Stage 1: `DESIGN.md`를 만든다.
3. Stage 2: `slide_plan.json`을 만든다.
4. Stage 3: `slide_prompts.json`을 만든다.
5. Stage 4: Codex native image generation으로 페이지를 한 장씩 생성하고 검수한다.
6. Stage 5: 사용자가 PPTX/PowerPoint/덱 파일을 요청한 경우에만 PPTX로 패키징한다.

기존 산출물이 있으면 재시작보다 재개를 우선한다.

- `DESIGN.md`는 있고 `slide_plan.json`이 없으면 Stage 2부터
- `slide_plan.json`은 있고 `slide_prompts.json`이 없으면 Stage 3부터
- `slide_prompts.json`은 있고 `page_<n>.png`가 없으면 Stage 4부터
- 페이지 이미지가 있고 사용자가 PPT/PPTX를 원하면 Stage 5부터

재개 전에는 산출물이 그럴듯한지 확인한다.

- `DESIGN.md`: layout family와 body-slide rule이 있는가
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
- Assumptions:
- Missing inputs:
```

brief는 실행 정확도를 위한 최소 문서다. 과하게 기획하지 않는다.

## Stage 1: Design

`gpt-slide-design`을 사용한다.

필수 기준:

- 가장 강한 시각 레퍼런스를 사용한다.
- 관찰된 규칙과 추론한 규칙을 분리한다.
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

출력: 유효한 `slide_plan.json`

## Stage 3: Prompt

`gpt-slide-prompt`를 사용한다.

필수 기준:

- 승인된 plan 순서를 유지한다.
- 이미지 생성기가 오해하지 않을 만큼 구체적으로 쓴다.
- header/body/footer 배치를 명시한다.
- slide별 anti-pattern ban을 포함한다.
- body slide의 시각 일관성을 유지한다.
- 사실관계는 사용자 자료에 근거한다.

출력: 유효한 `slide_prompts.json`

## Stage 4: Render

`gpt-slide-generate`를 사용한다.

Codex native image generation만 사용한다. 이 스킬 안에서 별도 OpenAI SDK runner를 만들지 않는다. 사용자가 `gpt-image-2`라고 말하면 현재 환경에 실제 모델이 노출되어 있지 않은 한 GPT Image 생성에 대한 사용자식 표현으로만 해석한다.

필수 기준:

- 한 번에 한 장씩 생성한다.
- 각 이미지를 받아들기 전에 직접 검수한다.
- 텍스트가 안 읽히거나, 구성이 깨졌거나, page family가 틀렸거나, 테마가 흔들리면 재생성한다.
- 기본 저장명은 `page_<n>.png`다.
- 최종 이미지를 generated-images cache에만 두지 않는다.

## Stage 5: Package

사용자가 `.pptx`, PowerPoint, 덱 파일, 공유 가능한 파일을 요청한 경우에만 실행한다.

Codex 전용 Merry-slide의 기본 패키징은 raster PPTX다.

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

## 공개/안전 가드레일

- 사용 권한이 있는 레퍼런스만 사용한다.
- 사용자가 소유 또는 사용 허가를 명시하지 않은 로고, 워터마크, 기밀 라벨, 브랜드 자산은 복제하지 않는다.
- 검증되지 않은 폰트명을 확정적으로 말하지 않는다.
- 현재 Codex 환경에 없는 API 모델 지원을 약속하지 않는다.
- 사용자가 요청하지 않으면 원본 파일, 내부 메모, 레퍼런스 URL을 최종 산출물에 노출하지 않는다.

## 완료 보고

마지막에는 짧게 보고한다.

- 완료한 stage
- 생성/수정한 파일
- 건너뛴 stage와 이유
- 남은 시각/콘텐츠 리스크
- 이어서 진행할 수 있는 정확한 다음 stage

산출물이 주 결과물이다. 보고는 간결하게 유지한다.
