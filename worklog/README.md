# 작업 기록

무엇을, 언제, 얼마나 걸려서, 어떤 결과로 만들었는지 월 단위 마크다운으로 쌓입니다.
미리보기 생성과 PPTX 생성은 실행될 때마다 스스로 기록하고, 요청 원문은
`worklog.mjs note`로 남깁니다.

## 원본은 이 폴더가 아닙니다

기록의 원본은 **`~/.merry-slide/worklog/`** 에 있습니다. 이 폴더는 공유용 사본이고,
`commit`할 때 원본에서 복사해 채웁니다.

저장소 안에만 두면 다시 클론하거나 폴더를 지우는 순간 전부 사라집니다. 스킬은
갈아엎을 수 있어도 작업 기록은 남아야 하므로 수명을 분리했습니다.

예전 버전이 이 폴더에 남긴 기록은 처음 실행할 때 자동으로 원본 쪽으로 옮겨집니다.
같은 달 파일이 양쪽에 있으면 이어 붙이고, 원래 파일을 지우지는 않습니다.

## 명령

```bash
node scripts/worklog.mjs setup [--apply]   git 상태를 점검한다
node scripts/worklog.mjs note "요청 원문"   요청을 남긴다
node scripts/worklog.mjs show              이번 달 기록을 본다
node scripts/worklog.mjs export [경로]      전체를 파일 하나로 묶는다
node scripts/worklog.mjs autocommit on|off 자동 커밋을 켜고 끈다
node scripts/worklog.mjs commit [--push]   지금 커밋한다
```

## push 권한이 없다면

공개 저장소여도 올리려면 권한이 따로 필요합니다. 클론만 했다고 쓸 수 있는 게
아닙니다. 권한이 없으면 자동 커밋은 조용히 넘어가고 기록은 그 컴퓨터에 계속 쌓입니다.
작업에는 지장이 없습니다.

나중에 통째로 건네주려면 이렇게 묶어서 슬랙이나 메일로 보내면 됩니다.

```bash
node scripts/worklog.mjs export
```

바탕화면에 `merry-작업기록-YYYY-MM-DD.md` 한 파일로 나옵니다.

## 공개 저장소에 올리기 전에

이 저장소는 **공개**입니다. 제안서 작업 기록에는 발주처명, 사업 내용, 예산 같은
정보가 섞이기 쉽습니다. 한 번 올라간 내용은 지워도 다른 사람이 이미 받아 갔을 수
있습니다.

올리고 싶지 않다면 자동 커밋을 끄면 됩니다. 기록은 원본 위치에 그대로 쌓입니다.

```bash
node scripts/worklog.mjs autocommit off
```
