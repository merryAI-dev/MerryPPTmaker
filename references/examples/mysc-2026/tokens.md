# Reference Extraction: 2026 MYSC EMA 제안서 템플릿

`references/design-token-extraction.md` 계약에 따라 `2026 MYSC 제안서 템플릿.pptx`(32 slides, 사용자 로컬 파일)에서 뽑은 관찰 기반 design token 예시다. python-pptx와 raw OOXML 파싱으로 **1031개 도형 전량**의 bbox, preset geometry, line, fill, 그림자, 폰트, 색상, 표/차트 속성을 직접 읽어서 만들었고 추측한 값은 없다. 향후 MYSC 브랜드 톤의 제안서 덱을 만들 때 이 파일을 Stage 1 참고 자료로 재사용한다.

원본 `.pptx`는 이 저장소에 없다(사용자 로컬 Downloads). 이 디렉터리 구성:

| 파일 | 내용 |
| --- | --- |
| `tokens.md` | 이 문서 — 관찰 기반 design token |
| `shapes-full.json` | 1031개 도형 전량 덤프(좌표·geometry·line·fill·effect·텍스트 run) |
| `text-style-summary.json` | 폰트/크기/색상 빈도 집계 |
| `assets/` | MYSC 자체 브랜드 에셋 (로고, 표지 그라디언트) |

에셋은 원본 42MB / 139개 미디어 중 **MYSC 고유 브랜드 자산만** 골라 최적화해 담았다(1.8MB). 행사 사진, 포트폴리오사·파트너사 로고 등 제3자 자산은 의도적으로 제외했다 — 재사용 가능한 디자인 컴포넌트가 아니고, 타사 상표를 공개 저장소에 재배포하는 건 MYSC 자체 자료 공유와는 다른 문제다.

이 토큰을 실행 가능한 PptxGenJS 컴포넌트로 옮긴 것이 `components/mysc-proposal.mjs`다.

## Canvas

| token | observed_value | evidence | reuse_rule | confidence |
| --- | --- | --- | --- | --- |
| canvas.size | 11.693in x 8.267in (A4 landscape, ~1.414:1) | `prs.slide_width/height`, 전체 32 slide 동일 | MYSC 톤 재현 시 `package-raster-pptx.mjs`의 기본 WIDE(13.333x7.5, 16:9)를 쓰지 말고 이 비율로 캔버스를 맞춘다 | high |
| canvas.background | 표지/섹션 구분 = 그라디언트 이미지(`assets/cover-gradient-blue.jpg`, 그린 변형 존재); body slide = 흰색 위에 상단 네이비 밴드 | slideLayout6/7/8→image1.png, slideLayout9→image3.png | 표지/섹션 구분 슬라이드와 본문 슬라이드는 배경이 다르다. 섞지 않는다 | high |
| canvas.header_band | 본문 레이아웃 배경은 `091823`→`0C2044` 가로 그라디언트, 그 위에 y=0.794in부터 흰색 사각형이 덮는다 → 실질 상단 밴드 높이 0.794in | `slideLayout4.xml` bg gradFill + 흰 rect y=0.794 | 본문 슬라이드 상단 네이비 밴드의 정확한 높이 | high |
| canvas.outer_margin | 좌우 약 0.55-0.66in, 표 콘텐츠는 상단 헤더 룰(y=1.343in) 아래부터 시작 | 다수 body slide의 shape left_in 0.55~0.66 반복 | 본문 콘텐츠 좌측 정렬 기준선으로 사용 | high |

## Header

| token | observed_value | evidence | reuse_rule | confidence |
| --- | --- | --- | --- | --- |
| header.section_label | `x=0.657 y=0.420 w=1.586 h=0.328`, 로마숫자+대분류명, 흰 Bold 15pt | slide 7/8/9/10에서 좌표 완전 동일 | 모든 본문 슬라이드 상단 좌측 고정 위치 | high |
| header.subsection_label | `x=2.928 y=0.456 w=5.431 h=0.336`, "1. 일반현황" 형태, 흰 Bold 14.5pt | 동일 좌표 반복 | 대분류 옆 소분류 표기 | high |
| header.page_badge | **우상단** `x=10.016 y=0.505 w=1.062 h=0.260`, "01 쪽수", 흰 Bold 10pt | 동일 좌표 반복 | 페이지 번호는 footer가 아니라 header 우측 배지다. 일반적인 "footer page number" 가정과 다르므로 이 톤에서는 footer에 넣지 않는다 | high |
| header.rule | `x=0.649 y=1.343 w=10.370`, 0.5pt 실선, 색 `#001521` | **21개 슬라이드에서 4개 속성 모두 동일** | 모든 본문 슬라이드 헤더 하단에 반복 | high |
| header.content_top | 헤더 룰 아래 본문 시작 ≈ y 1.55in | 본문 도형 top 분포 | 본문 콘텐츠 상단 기준선 | medium |
| header.lead_sentence | 헤더 룰 바로 아래(y=0.935) 한 줄 "액션 타이틀"(McKinsey lead-sentence 패턴). 라벨 세그먼트(예: "1-1. MYSC 소개")는 accent cyan 5BBEDE Bold, 구분자 "｜"는 진한 네이비 01397E Bold, 본문 주장 문장은 TEXT_1(다크) Bold, 전체 14.5pt | slide 7 "Google Shape;261;p5" | 모든 body slide가 이 3-세그먼트 lead sentence를 갖는다: [소분류 라벨(cyan)] ｜ [핵심 주장 한 문장(dark)]. 콘텐츠 요약이 아니라 슬라이드가 증명하려는 주장을 이 줄에 압축한다 | high |

## Layout primitives

| token | observed_value | evidence | reuse_rule | confidence |
| --- | --- | --- | --- | --- |
| layout.section_marker_pill | `round2SameRect` pill, fill `0C2044`(45개 중 35개), 흰 텍스트 12pt, 높이 0.283~0.551in. 자주 쓰인 폭: 10.354(전폭), 5.095(반폭), 3.44, 2.132 | **32장 중 18장에 45회** — 가장 지배적인 반복 컴포넌트 | 본문을 서브섹션으로 나눌 때 쓰는 소제목 바. 카드/그림자/윤곽선 박스가 아니라 단색 pill이다 | high |
| layout.divider_watermark | 섹션 구분 슬라이드(5,18,26)에 로마숫자를 150pt ExtraLight 대형 워터마크로 배치, 우측에 44pt Bold 섹션명 | slide 5 "Google Shape;77;p81" | 섹션 전환 슬라이드에만 쓴다. 본문 슬라이드에는 쓰지 않음 | high |
| layout.stat_grid | 3열 3행 무배경 그리드. 열 시작 x=1.234, 열 간격 1.472in, 행 y=3.210/4.772/6.475. 라벨 박스 `w≈1.373 h=0.462`(2줄 흔함), 숫자 박스 `w≈1.380 h=0.68~0.753`, 라벨은 숫자보다 0.417in 위 | slide 9 stat 9개 전수 실측 | "숫자 강조"가 필요하면 색카드가 아니라 라벨(10.8pt)+큰 숫자(25.9~30.2pt)+괄호 각주(8.6pt) 조합. 디자인 게이트가 금지하는 "다색 KPI 카드"와 반대되는 MYSC 고유 패턴 | high |
| layout.roundRect_card | `roundRect` 114개. 최빈 조합: 흰 fill+1pt 테두리(16), `BEE6FB` fill 무테두리(16), 밝은 fill+dk1 테두리(15) | 전수 fill/line 조합 집계 | 카드가 필요하면 이 세 조합 안에서 고른다. 그림자·다색 카드는 만들지 않는다 | high |

## Typography

| token | observed_value | evidence | reuse_rule | confidence |
| --- | --- | --- | --- | --- |
| typography.font_family | `Pretendard` / `Pretendard Variable`(+Light/Medium/SemiBold/ExtraBold 웨이트 variant) 전량, 다른 폰트 미사용(1860+572+... occurrences) | 전체 32 slide run 3600+개 스캔 | MerryPPTmaker의 Pretendard 기본값과 그대로 일치. 확인 질문 없이 Pretendard 확정 가능 | high |
| typography.title_cover | 48pt Light(표지 연도), 44pt Bold(섹션 타이틀) | slide 1, slide 5 | 표지/섹션 제목에만 사용 | high |
| typography.lead_sentence | 14.5pt Bold | slide 7 헤더 리드문 | 모든 body slide 공통 | high |
| typography.body_paragraph | 12pt (전체 corpus 최빈값, 564회) | 전체 스캔 top_sizes | 일반 본문 단락 기본 크기. `design-quality-gate.md`의 12pt 최소 기준과 일치 | high |
| typography.dense_table_cell | 8.6-10.8pt (표/스탯 각주에서 반복 다수: 9pt 227회, 9.7pt 220회, 10pt 170회, 8.8pt 167회) | 전체 스캔 top_sizes, slide 9/24 표·각주 | **12pt 미만이 매우 흔하다.** 이 톤은 밀도 높은 데이터 표/각주에서 8.6-10.8pt를 상시 사용한다 — `SKILL.md`가 이미 허용한 "dense appendix table" 예외에 해당하는 실제 사례. MYSC 톤 재현 시 표 본문을 12pt로 강제하면 오히려 레퍼런스와 어긋난다 | high |
| typography.stat_number | 25.9-30.22pt, 검정(000000) 또는 accent 색 | slide 9 stat grid | 큰 숫자 강조용. bold 여부는 shape마다 상이, 재관찰 필요 | medium |

## Palette

| token | observed_value | evidence | reuse_rule | confidence |
| --- | --- | --- | --- | --- |
| palette.primary_navy | `#0C2044` (텍스트 92회, fill 44회), `#001D45`, `#01397E` | 전체 색상 스캔 | 헤더 배경, section marker pill, 강조 텍스트의 주 색상 | high |
| palette.accent_cyan | `#59C2E2` / `#5BBEDE`(리드문 라벨), `#BEE6FB`/`#BAE8FB`/`#C7E6F9`(표 헤더·태그 배경, 옅은 톤) | 전체 색상 스캔 + 표 header_fill | 유일한 accent 계열. 진한 cyan은 라벨/포인트 텍스트, 옅은 cyan은 배경 tint(표 헤더, 태그 pill)로 역할 분리 | high |
| palette.secondary_accent_yellow | `#FADE4B` | fill 색상 스캔(7회) | 드물게 강조용으로만 등장(경고/하이라이트 추정). 남용하지 않음 | medium |
| palette.neutral_gray | `#7F7F7F` | 텍스트 색상 스캔(39회) | 보조 설명/각주 텍스트 | medium |
| palette.neutral_white | `#FFFFFF` | 텍스트/배경 다수 | 네이비 배경 위 텍스트, 카드 배경 | high |
| palette.forbidden | 무지개색 KPI 카드, 두꺼운 외곽선 카드, 장식 icon chip 미관찰. **그림자는 존재하되 용도가 한정적** — 아래 `effect.shadow` 참고 | 1031개 도형 전수 스캔 | 이 톤을 재현할 때 다색 카드/장식 아이콘을 추가하지 않는다 | high |
| effect.shadow | 외곽 그림자 사용 도형 75개, **전량 slide 11(세계지도) 한 장에만** 존재. 지도 위치 마커(ellipse)와 연결선용, `blur 3pt / dist 1.6~1.8pt / dir 90° / 검정 alpha 35~38%` | 전수 `effectLst` 스캔 | 그림자는 지도 마커 같은 특수 오버레이에만 쓴다. 카드·표·pill에는 쓰지 않는다 | high |
| line.weight | 1.0pt(180) > 0.5pt(115) > 2.0pt(45) 순. 3pt 이상은 2개뿐 | 전수 line 스캔 | 테두리는 1pt 이하가 기본. 두꺼운 윤곽선을 쓰지 않는다는 규칙의 수치 근거 | high |

## Table

| token | observed_value | evidence | reuse_rule | confidence |
| --- | --- | --- | --- | --- |
| table.header_fill | `#BAE8FB`(옅은 하늘색) | slide 7 표("Google Shape;370;p5") header_fill | 모든 표 헤더 행에 재사용 | high |
| table.body_size | 8.6-10.8pt | slide 24/25 표 다수 | 표 본문은 12pt 강제하지 않고 이 범위 사용 | high |

## Chart

| token | observed_value | evidence | reuse_rule | confidence |
| --- | --- | --- | --- | --- |
| chart.native_usage | 32 slide 중 native PowerPoint chart는 slide 15의 pie-of-pie 1개뿐. 그 외 "차트처럼 보이는" 막대/비교 시각화(slide 9, 14 등)는 전부 shape/text로 수작업 조립 | python-pptx `has_chart` 전수 스캔 | MYSC 톤은 native chart보다 커스텀 stat 레이아웃을 선호한다. `slides` native 경로로 이 톤을 재현할 때도 모든 수치를 자동으로 native chart화하지 말고, 원본처럼 텍스트+shape 조합을 우선 검토 | high |
| chart.primary_series / secondary_series | `#0C2044`(주 계열), `#82ECFD`(보조 계열) | `ppt/charts/chart1.xml` 색상 | 네이티브 차트를 쓸 경우 이 2색 조합 사용 | high |

## Diagram

1031개 도형의 preset geometry를 전수 집계했다. 이 톤의 다이어그램 문법은 **화살표 커넥터를 쓰지 않는다**는 점이 가장 특징적이다.

전체 geometry 분포: `rect` 712 · `roundRect` 114 · `line` 71 · `ellipse` 47 · `round2SameRect` 45 · `custom` 8 · `curvedDownArrow` 6 · `triangle` 4 · `straightConnector1` 3 · `homePlate` 3 · `mathPlus` 2 · `rightBrace` 1 · `downArrow` 1

| token | observed_value | evidence | reuse_rule | confidence |
| --- | --- | --- | --- | --- |
| diagram.no_arrow_connectors | **화살표 머리(headEnd/tailEnd)를 가진 선이 0개**. 커넥터도 `straightConnector1` 3개뿐 | 전수 line 속성 스캔 | 프로세스 흐름을 화살표 선으로 잇지 않는다. 흐름은 아래 chevron/대형 화살표 도형으로 표현한다 | high |
| diagram.flow_chevron | `homePlate`(오각형 배너) 3개, fill `59C2E2`, 폭 2.9~3.0in / 높이 0.35~0.37in | slide 27 | 단계형 프로세스를 나타낼 때 쓰는 유일한 흐름 표현. 가로로 이어 붙인다 | high |
| diagram.flow_arrow_large | `downArrow` 1개(`w=0.533 h=4.899`, fill `59C2E2`), `curvedDownArrow` 6개(`w=0.631 h=0.176`, fill `01397E`) | slide 17 / slide 22 | 큰 방향 전환은 얇은 선이 아니라 채워진 대형 화살표 도형으로 표현 | high |
| diagram.marker_triangle | `triangle` 4개, `w=0.226 h=0.095`, fill `01397E` | slide 14 | 목록·라벨 앞 소형 마커. 불릿 문자 대신 쓰는 도형 마커 | medium |
| diagram.map_marker | `ellipse` 2겹(외곽 0.197in + 내부 0.118in) + 그림자, 외곽 fill `BEE6FB` alpha 46% 또는 흰색 | slide 11 세계지도 | 지도 위 위치 표시 전용. 이 조합에만 그림자를 쓴다 | high |
| diagram.grouping_brace | `rightBrace` 1개(`w=0.202 h=1.426`) | slide 15 | 항목 묶음 표시. 드물게 사용 | low |

## Footer

| token | observed_value | evidence | reuse_rule | confidence |
| --- | --- | --- | --- | --- |
| footer.page_number | **본문 하단이 아니라 상단 header 우측 배지**(위 `header.page_badge` 참고) | slide 7 | 이 톤을 재현할 때 footer 영역에 별도 페이지 번호를 넣지 않는다 | high |
| footer.bottom_area | 이번 스캔에서 하단 footer 전용 텍스트(출처/보조 메타데이터) 반복 패턴은 확인되지 않음 | 전체 스캔 | not observed로 두고, 필요하면 재관찰 | low |

## 브랜드 에셋

`assets/`에 담긴 MYSC 자체 자산. 원본 해상도가 슬라이드 표시 크기 대비 과했기에 최적화했다(12MB → 0.8MB, 슬라이드 크기에서 육안 차이 없음).

| 파일 | 원본 | 용도 |
| --- | --- | --- |
| `mysc-logo.png` | image4.png 1667x459 | 표지 우하단 로고 (표시 크기 2.122 x 0.583in) |
| `cover-gradient-blue.jpg` | image1.png 2752x1536, 6.0MB → 1920px, 396KB | 표지·섹션 구분 기본 배경 |
| `cover-gradient-green.jpg` | image3.png 2752x1536, 5.9MB → 1920px, 403KB | 표지 그린 변형 (slideLayout9) |
| `cover-arc-overlay.png` | image2.png 3508x1935 | 표지 위 옅은 아크 오버레이(거의 투명) |

## 요약: 이 톤을 재현할 때 기존 MerryPPTmaker 기본값과 다른 점

- **캔버스 비율**이 16:9 WIDE가 아니라 A4 landscape(11.693x8.267in)다. `package-raster-pptx.mjs`의 `WIDE` 상수를 그대로 쓰면 비율이 깨진다.
- **페이지 번호가 footer가 아니라 header 우측 배지**다.
- **표/각주 본문이 12pt 미만(8.6-10.8pt)을 상시 사용**한다 — `design-quality-gate.md`의 "dense appendix table" 예외가 이 톤의 기본값에 가깝다.
- **KPI/통계는 카드가 아니라 무배경 라벨+큰 숫자 조합**으로 표현한다(기존 forbidden pattern인 "다색 KPI 카드"와 정확히 반대되는 사례라 오히려 참고할 만하다).
- **네이티브 PowerPoint chart를 거의 쓰지 않는다** — 대부분 텍스트+도형 수작업 조립이다.
- **화살표 커넥터를 쓰지 않는다** — 흐름은 chevron(`homePlate`)이나 채워진 대형 화살표로만 표현한다.

## 원본에서 발견된 결함 (재현 시 그대로 베끼지 말 것)

- 표지 우측 문구 박스가 `x=8.236 w=3.973` → 우측 끝 12.209in로 **캔버스(11.693)를 0.52in 넘어간다.** 원본은 좌측정렬이라 텍스트가 보이지만, 우측정렬로 재현하면 잘린다. `components/mysc-proposal.mjs`는 폭을 유지하고 x를 7.5로 당겨 해결했다.
</content>
