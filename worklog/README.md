# 작업 기록

무엇을, 언제, 얼마나 걸려서, 어떤 결과로 만들었는지 월 단위 마크다운으로 쌓입니다.
미리보기 생성과 PPTX 생성은 실행될 때마다 스스로 기록하고, 사용자 요청 원문은
`worklog.mjs note`로 남깁니다.

```bash
node scripts/worklog.mjs note "요청 원문"   요청을 남긴다
node scripts/worklog.mjs show              이번 달 기록을 본다
node scripts/worklog.mjs where             기록 위치를 확인한다
node scripts/worklog.mjs commit [--push]   기록을 커밋한다
```

## 공개 저장소에 올리기 전에

이 저장소는 **공개**입니다. 제안서 작업 기록에는 발주처명, 사업 내용, 예산 같은
정보가 섞이기 쉽습니다. 한 번 올라간 내용은 지워도 다른 사람이 이미 받아 갔을 수
있습니다.

실제 제안서 작업을 할 때는 기록을 비공개 경로로 돌리세요.

```bash
export MERRY_WORKLOG_DIR=~/merry-worklog
```

셸을 열 때마다 적용하려면 `~/.zshrc`에 넣어 두면 됩니다.

기록은 **자동으로 커밋되지 않습니다.** `worklog.mjs commit`을 직접 실행할 때만
올라갑니다. 올리기 전에 내용을 한 번 읽어 보세요.
