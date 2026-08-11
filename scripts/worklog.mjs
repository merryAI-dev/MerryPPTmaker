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
import { execFileSync } from 'node:child_process';

const SELF_DIR = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(SELF_DIR, '..');

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
  } catch { /* 기록 실패로 작업을 멈추지 않는다 */ }
}

/** 사용자 요청 원문을 남긴다. 나중에 "왜 이렇게 만들었지"의 답이 된다. */
export function note(text, label = '요청') {
  const now = new Date();
  const quoted = String(text).trim().split('\n').map((l) => `> ${l}`).join('\n');
  return append(`### ${stamp(now)} ${label}\n\n${quoted}\n`, now);
}

function gitCommit(push) {
  const dir = logDir();
  const inRepo = dir.startsWith(SKILL_DIR);
  if (!inRepo) {
    console.error(`기록이 저장소 밖에 있습니다: ${dir}\n` +
                  '저장소에 커밋하려면 MERRY_WORKLOG_DIR를 비우고 다시 실행하세요.');
    process.exit(1);
  }
  const rel = path.relative(SKILL_DIR, dir);
  const run = (args) => execFileSync('git', args, { cwd: SKILL_DIR, encoding: 'utf8' });
  try {
    run(['add', rel]);
    const staged = run(['diff', '--cached', '--name-only']).trim();
    if (!staged) { console.log('새로 기록된 내용이 없습니다.'); return; }
    run(['commit', '-m', `작업 기록 갱신 (${new Date().toISOString().slice(0, 10)})`]);
    console.log(`커밋했습니다:\n${staged}`);
    if (push) { run(['push', 'origin', 'HEAD']); console.log('푸시했습니다.'); }
  } catch (err) {
    console.error(`git 실패: ${err.message}`);
    process.exit(1);
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
    gitCommit(rest.includes('--push'));
  } else {
    console.log(`사용법:
  node scripts/worklog.mjs note "요청 원문"   요청을 기록한다
  node scripts/worklog.mjs show              이번 달 기록을 본다
  node scripts/worklog.mjs where             기록 위치를 확인한다
  node scripts/worklog.mjs commit [--push]   기록을 커밋한다

기록 위치: ${logDir()}
바꾸려면: export MERRY_WORKLOG_DIR=~/merry-worklog`);
  }
}

// 직접 실행했을 때만 CLI로 동작한다. import로 불릴 때는 조용하다.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  cli();
}
