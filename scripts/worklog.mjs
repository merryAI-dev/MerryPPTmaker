#!/usr/bin/env node
/**
 * 작업 기록을 남긴다. 무엇을, 언제, 얼마나 걸려서, 어떤 결과로 했는지.
 *
 * 기록 위치는 MERRY_WORKLOG_DIR 환경변수로 바꾼다. 기본값은 저장소 안의
 * worklog/ 다. 제안서 작업 기록에는 발주처명이나 사업 내용이 들어갈 수 있으니,
 * 저장소가 공개라면 반드시 비공개 경로로 돌려놓는다.
 *
 *   export MERRY_WORKLOG_DIR=~/merry-worklog
 *
 * 사용법:
 *   node scripts/worklog.mjs note "사용자 요청 원문"      # 프롬프트 아카이빙
 *   node scripts/worklog.mjs show                        # 이번 달 기록 보기
 *   node scripts/worklog.mjs commit                      # 기록만 골라 커밋
 *   node scripts/worklog.mjs commit --push
 *
 * 다른 스크립트에서:
 *   import { startRun, endRun } from './worklog.mjs';
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';

const SELF_DIR = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(SELF_DIR, '..');

/**
 * 설정은 집 아래에 둔다. 저장소에 두면 클론한 사람 모두에게 따라가는데,
 * 자동 커밋은 push 권한이 있는 사람만 쓰는 기능이라 기계마다 정해야 한다.
 */
const CONFIG_FILE = path.join(os.homedir(), '.merry-slide', 'config.json');

function readConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch { return {}; }
}

function writeConfig(patch) {
  const next = { ...readConfig(), ...patch };
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
  fs.writeFileSync(CONFIG_FILE, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}

function autoCommitOn() {
  if (process.env.MERRY_WORKLOG_AUTOCOMMIT === '1') return true;
  if (process.env.MERRY_WORKLOG_AUTOCOMMIT === '0') return false;
  return readConfig().autocommit === true;
}

export function logDir() {
  const raw = process.env.MERRY_WORKLOG_DIR;
  const dir = raw ? raw.replace(/^~/, os.homedir()) : path.join(SKILL_DIR, 'worklog');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** 월 단위 파일 하나. 하루 단위로 쪼개면 파일만 늘고 훑어보기 나쁘다. */
function logFile(when = new Date()) {
  const ym = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}`;
  const file = path.join(logDir(), `${ym}.md`);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, `# 작업 기록 ${ym}\n\n`, 'utf8');
  }
  return file;
}

const stamp = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const dayHead = (d) => `## ${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** 그날 제목이 없으면 만든다. 같은 날 항목은 한 제목 아래로 모인다. */
function append(text, when = new Date()) {
  const file = logFile(when);
  let body = fs.readFileSync(file, 'utf8');
  const head = dayHead(when);
  if (!body.includes(head)) body += `${head}\n\n`;
  body += (text.endsWith('\n') ? text : `${text}\n`) + '\n';   // 항목 사이는 한 줄 띄운다
  fs.writeFileSync(file, body, 'utf8');
  return file;
}

function human(ms) {
  if (ms < 1000) return `${(ms / 1000).toFixed(1)}초`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}초`;
  const m = Math.floor(s / 60);
  return s % 60 ? `${m}분 ${s % 60}초` : `${m}분`;
}

/** 실행 시작. 반환값을 endRun에 그대로 넘긴다. */
export function startRun(action, inputs = {}) {
  return { action, inputs, t0: Date.now(), at: new Date() };
}

/**
 * 실행 종료를 기록한다. 기록이 실패해도 본 작업을 망치면 안 되므로 모든 예외를 삼킨다.
 */
export function endRun(run, result = {}) {
  if (!run) return;
  try {
    const took = Date.now() - run.t0;
    const rows = [];
    for (const [k, v] of Object.entries(run.inputs)) {
      if (v !== undefined && v !== '' && v !== null) rows.push(`- ${k}: \`${v}\``);
    }
    for (const [k, v] of Object.entries(result)) {
      if (v !== undefined && v !== '' && v !== null) rows.push(`- ${k}: ${v}`);
    }
    append(`### ${stamp(run.at)} ${run.action} — ${human(took)}\n\n${rows.join('\n')}\n`, run.at);
    if (autoCommitOn()) autoCommit();
  } catch { /* 기록 실패로 작업을 멈추지 않는다 */ }
}

/**
 * 자동 커밋은 뒤로 떼어 낸다. push는 네트워크를 타므로 본 작업을 붙잡으면 안 된다.
 * 실패해도 조용히 로그만 남긴다. 기록을 못 올린 것 때문에 제안서 작업이 멈추면 곤란하다.
 */
function autoCommit() {
  const dir = logDir();
  if (!dir.startsWith(SKILL_DIR)) return;   // 저장소 밖 기록은 올릴 곳이 없다
  const child = spawn(process.execPath,
    [fileURLToPath(import.meta.url), 'commit', '--push', '--quiet'],
    { detached: true, stdio: 'ignore', cwd: SKILL_DIR });
  child.unref();
}

/** 사용자 요청 원문을 남긴다. 나중에 "왜 이렇게 만들었지"의 답이 된다. */
export function note(text, label = '요청') {
  const now = new Date();
  const quoted = String(text).trim().split('\n').map((l) => `> ${l}`).join('\n');
  return append(`### ${stamp(now)} ${label}\n\n${quoted}\n`, now);
}

function gitCommit(push, quiet = false) {
  const say = (m) => { if (!quiet) console.log(m); };
  const dir = logDir();
  if (!dir.startsWith(SKILL_DIR)) {
    if (quiet) return;
    console.error(`기록이 저장소 밖에 있습니다: ${dir}\n` +
                  '저장소에 커밋하려면 MERRY_WORKLOG_DIR를 비우고 다시 실행하세요.');
    process.exit(1);
  }
  const rel = path.relative(SKILL_DIR, dir);
  const run = (args) => execFileSync('git', args, { cwd: SKILL_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

  try {
    // 기록 폴더만 담는다. 작업 중인 코드가 섞여 올라가면 안 된다.
    run(['add', '--', rel]);
    const staged = run(['diff', '--cached', '--name-only']).trim();
    if (!staged) { say('새로 기록된 내용이 없습니다.'); return; }
    run(['commit', '-m', `작업 기록 갱신 (${new Date().toISOString().slice(0, 10)})`]);
    say(`커밋했습니다:\n${staged}`);
  } catch (err) {
    logFailure('커밋', err);
    if (!quiet) { console.error(`커밋 실패: ${err.message}`); process.exit(1); }
    return;
  }

  if (!push) return;
  try {
    // 사이에 다른 커밋이 올라왔을 수 있다. 기록 커밋 하나 때문에 충돌로 멈추지 않게 한다.
    try { run(['pull', '--rebase', '--autostash', 'origin', 'HEAD']); }
    catch { /* 실패하면 그대로 push를 시도하고, 거기서 걸리면 아래에서 잡는다 */ }
    run(['push', 'origin', 'HEAD']);
    say('푸시했습니다.');
  } catch (err) {
    logFailure('푸시', err);
    const msg = String(err.stderr || err.message);
    // GitHub는 권한이 없을 때도 "Repository not found"로 답한다. 있는 저장소인데
    // 없다고 나오면 대개 권한 문제다. 인증 창을 못 띄운 경우도 같이 묶는다.
    const denied = /denied|403|not have permission|Authentication|Repository not found|could not read Username/i.test(msg);
    if (quiet) return;
    console.error(denied
      ? '푸시 권한이 없습니다. 기록은 이 컴퓨터에만 남았습니다.\n' +
        '  → 저장소 소유자에게 collaborator 초대를 받거나, 자동 커밋을 끄세요:\n' +
        '    node scripts/worklog.mjs autocommit off'
      : `푸시 실패: ${msg.trim().split('\n')[0]}`);
  }
}

/** 뒤에서 조용히 도는 자동 커밋이 실패했을 때 흔적은 남긴다. */
function logFailure(what, err) {
  try {
    fs.appendFileSync(path.join(logDir(), '.sync-errors.log'),
      `${new Date().toISOString()} ${what} 실패: ${String(err.stderr || err.message).trim().split('\n')[0]}\n`);
  } catch { /* 여기서 또 실패하면 할 수 있는 게 없다 */ }
}

/**
 * git 상태를 점검한다. 자동 커밋은 push 권한이 있어야 의미가 있는데,
 * 공개 저장소를 클론했다고 권한이 생기는 게 아니다. 그 구분을 여기서 해준다.
 */
function gitSetup(apply) {
  const g = (args) => execFileSync('git', args, { cwd: SKILL_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const line = (mark, name, detail, fix = '') => {
    console.log(`  ${mark} ${name.padEnd(16, ' ')} ${detail}`);
    if (fix) console.log(`      → ${fix}`);
  };
  console.log('\ngit 준비 상태\n');

  try { line('✓', 'git', g(['--version'])); }
  catch { line('✗', 'git', '설치되어 있지 않습니다', 'xcode-select --install'); return; }

  // 커밋에는 이름과 메일이 필요하다. 없으면 커밋 자체가 실패한다.
  let name = '', email = '';
  try { name = g(['config', 'user.name']); } catch { /* 비어 있음 */ }
  try { email = g(['config', 'user.email']); } catch { /* 비어 있음 */ }
  if (name && email) line('✓', '사용자', `${name} <${email}>`);
  else line('✗', '사용자', '이름 또는 메일이 설정되지 않았습니다',
            'git config --global user.name "이름"; git config --global user.email "메일"');

  let remote = '';
  try { remote = g(['remote', 'get-url', 'origin']); line('✓', '원격 저장소', remote); }
  catch { line('✗', '원격 저장소', 'origin이 없습니다', '저장소를 git clone으로 받으세요.'); return; }

  // 권한은 물어보지 말고 실제로 확인한다. dry-run은 아무것도 바꾸지 않는다.
  let canPush = false;
  try { g(['push', '--dry-run', 'origin', 'HEAD']); canPush = true; }
  catch { canPush = false; }
  if (canPush) line('✓', 'push 권한', '있습니다');
  else line('!', 'push 권한', '없습니다 (읽기만 가능)',
            '기록은 이 컴퓨터에만 남습니다. 공유하려면 저장소 소유자에게 collaborator 초대를 받으세요.');

  const dir = logDir();
  const inRepo = dir.startsWith(SKILL_DIR);
  line(inRepo ? '!' : '✓', '기록 위치', dir + (inRepo ? ' (저장소 안 — 커밋하면 공개됩니다)' : ' (저장소 밖 — 공개되지 않음)'),
       inRepo ? '발주처명이나 사업 내용이 들어간다면: export MERRY_WORKLOG_DIR=~/merry-worklog' : '');

  const on = autoCommitOn();
  line(on ? '✓' : '!', '자동 커밋', on ? '켜짐' : '꺼짐',
       on ? '' : 'node scripts/worklog.mjs autocommit on');

  console.log('');
  if (apply && canPush && inRepo) {
    writeConfig({ autocommit: true });
    console.log('자동 커밋을 켰습니다. 이제 미리보기와 PPTX 생성 결과가 자동으로 올라갑니다.\n');
  } else if (apply && !canPush) {
    writeConfig({ autocommit: false });
    console.log('push 권한이 없어 자동 커밋을 껐습니다. 기록은 이 컴퓨터에 계속 쌓입니다.\n');
  }
}

function cli() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'note') {
    if (!rest.length) { console.error('기록할 내용을 넣어 주세요.'); process.exit(1); }
    console.log(note(rest.join(' ')));
  } else if (cmd === 'show') {
    const f = logFile();
    console.log(fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '기록이 없습니다.');
  } else if (cmd === 'where') {
    console.log(logDir());
  } else if (cmd === 'commit') {
    gitCommit(rest.includes('--push'), rest.includes('--quiet'));
  } else if (cmd === 'setup') {
    gitSetup(rest.includes('--apply'));
  } else if (cmd === 'autocommit') {
    const v = rest[0];
    if (v === 'on' || v === 'off') {
      writeConfig({ autocommit: v === 'on' });
      console.log(`자동 커밋을 ${v === 'on' ? '켰습니다' : '껐습니다'}. (${CONFIG_FILE})`);
    } else {
      console.log(`자동 커밋: ${autoCommitOn() ? '켜짐' : '꺼짐'}`);
    }
  } else {
    console.log(`사용법:
  node scripts/worklog.mjs setup [--apply]   git 상태를 점검한다 (--apply면 자동 커밋까지 설정)
  node scripts/worklog.mjs note "요청 원문"   요청을 기록한다
  node scripts/worklog.mjs show              이번 달 기록을 본다
  node scripts/worklog.mjs where             기록 위치를 확인한다
  node scripts/worklog.mjs autocommit on|off 자동 커밋을 켜고 끈다
  node scripts/worklog.mjs commit [--push]   기록을 지금 커밋한다

기록 위치: ${logDir()}
자동 커밋: ${autoCommitOn() ? '켜짐' : '꺼짐'}
위치를 바꾸려면: export MERRY_WORKLOG_DIR=~/merry-worklog`);
  }
}

// 직접 실행했을 때만 CLI로 동작한다. import로 불릴 때는 조용하다.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  cli();
}
