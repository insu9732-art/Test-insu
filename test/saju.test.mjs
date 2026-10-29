import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSaju, dayPillarOf, pillarName, surroundingJie, lunarToSolar, solarToLunar, tenGod,
} from '../js/saju.js';

const names = (r) => ['year', 'month', 'day', 'hour'].map((k) => pillarName(r.pillars[k]));

test('일주 기준일', () => {
  assert.equal(pillarName(dayPillarOf(1900, 1, 1)), '甲戌');
  assert.equal(pillarName(dayPillarOf(2000, 1, 1)), '戊午');
  assert.equal(pillarName(dayPillarOf(2024, 1, 1)), '甲子');
});

test('입춘 전후로 연주·월주가 바뀐다 (2024 입춘 2/4 17시경)', () => {
  const before = calculateSaju({ year: 2024, month: 2, day: 4, hour: 16, minute: 0 });
  const after = calculateSaju({ year: 2024, month: 2, day: 4, hour: 19, minute: 0 });
  assert.deepEqual(names(before).slice(0, 2), ['癸卯', '乙丑']);
  assert.deepEqual(names(after).slice(0, 2), ['甲辰', '丙寅']);
});

test('절입 시각 계산 오차 30분 이내', () => {
  const { prev } = surroundingJie(Date.UTC(2024, 1, 10));
  const expected = Date.UTC(2024, 1, 4, 8, 27); // 2024-02-04 17:27 KST
  assert.equal(prev.name, '입춘');
  assert.ok(Math.abs(prev.ms - expected) < 30 * 60000);
});

test('시주: 시두법과 23시 子시', () => {
  const r = calculateSaju({ year: 2024, month: 1, day: 1, hour: 0, minute: 40, longitudeCorrection: 0 });
  assert.equal(pillarName(r.pillars.day), '甲子');
  assert.equal(pillarName(r.pillars.hour), '甲子');
  const late = calculateSaju({ year: 2024, month: 1, day: 1, hour: 23, minute: 40, longitudeCorrection: 0 });
  assert.equal(pillarName(late.pillars.day), '乙丑');
  assert.equal(pillarName(late.pillars.hour), '丙子');
});

test('시간 모름이면 시주 없음', () => {
  const r = calculateSaju({ year: 1990, month: 5, day: 15, hour: null });
  assert.equal(r.pillars.hour, null);
  assert.equal(r.elements.reduce((a, b) => a + b), 6);
});

test('음력 ↔ 양력 (윤달 포함)', () => {
  assert.deepEqual(lunarToSolar(2023, 2, 1, true), { year: 2023, month: 3, day: 22 });
  assert.deepEqual(lunarToSolar(2023, 2, 1, false), { year: 2023, month: 2, day: 20 });
  assert.deepEqual(solarToLunar(2024, 2, 10), { year: 2024, month: 1, day: 1, leap: false });
});

test('십신', () => {
  assert.equal(tenGod(0, 0), '비견');
  assert.equal(tenGod(0, 3), '상관');
  assert.equal(tenGod(0, 7), '정관');
  assert.equal(tenGod(0, 9), '정인');
});

test('대운: 양년생 남자는 순행', () => {
  const r = calculateSaju({ year: 1990, month: 5, day: 15, hour: 10, minute: 30, gender: 'male' });
  assert.equal(r.daewoon.forward, true);
  assert.equal(pillarName(r.daewoon.list[0]), '壬午');
  const f = calculateSaju({ year: 1990, month: 5, day: 15, hour: 10, minute: 30, gender: 'female' });
  assert.equal(pillarName(f.daewoon.list[0]), '庚辰');
});

test('내장 음력 표가 1900~2100년 모든 날짜에서 ICU(dangi)와 일치', () => {
  const fmt = new Intl.DateTimeFormat('ko-KR-u-ca-dangi', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' });
  for (let t = Date.UTC(1900, 0, 1); t <= Date.UTC(2100, 11, 31); t += 86400000) {
    const p = fmt.formatToParts(new Date(t));
    const g = (k) => p.find((x) => x.type === k).value;
    const exp = { year: +g('relatedYear'), month: +g('month').replace(/\D/g, ''), day: +g('day'), leap: g('month').includes('윤') };
    const dt = new Date(t);
    const got = solarToLunar(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
    assert.deepEqual(got, exp, dt.toISOString());
    assert.deepEqual(lunarToSolar(exp.year, exp.month, exp.day, exp.leap),
      { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() });
  }
});

test('음력 1981년 1월 29일 = 양력 1981년 3월 5일, 30일은 없음', () => {
  assert.deepEqual(lunarToSolar(1981, 1, 29), { year: 1981, month: 3, day: 5 });
  assert.equal(lunarToSolar(1981, 1, 30), null);
});

test('토정비결: 괘 번호가 범위 안이고 데이터가 모두 있다', async () => {
  const { tojungOf } = await import('../js/tojung.js');
  const { TOJUNG } = await import('../js/tojung-data.js');
  assert.equal(TOJUNG.length, 144);
  for (const x of TOJUNG) {
    assert.equal(x.m.length, 12);
    assert.ok(x.s >= 1 && x.s <= 5 && x.t.length > 20);
  }
  const seen = new Set();
  for (let m = 1; m <= 12; m++) {
    for (let d = 1; d <= 30; d++) {
      for (const by of [1950, 1963, 1977, 1981, 1994, 2008]) {
        const t = tojungOf({ year: by, month: m, day: d }, 2026);
        assert.match(t.code, /^[1-8][1-6][1-3]$/);
        assert.equal(t.months.length, 12);
        seen.add(t.code);
      }
    }
  }
  assert.ok(seen.size > 100, `${seen.size}`); // 대부분의 괘가 나온다
});

test('토정비결: 상괘 = (나이 + 태세수) % 8', async () => {
  const { tojungOf } = await import('../js/tojung.js');
  // 2026 丙午년: 丙7 + 午9 = 16, 1981년생 46세 → (46 + 16) % 8 = 6
  assert.equal(tojungOf({ year: 1981, month: 1, day: 29 }, 2026).code[0], '6');
});

test('안드로이드용 한 파일 묶음이 문법 오류 없이 만들어진다', async () => {
  const { execFileSync } = await import('node:child_process');
  const { readFileSync, mkdtempSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const out = join(mkdtempSync(join(tmpdir(), 'bundle-')), 'index.html');
  execFileSync('python3', ['tools/bundle.py', 'android', out]);
  const script = readFileSync(out, 'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
  assert.doesNotThrow(() => new Function(script));
});

test('꿈해몽 검색과 작명 추천', async () => {
  const { searchDreams } = await import('../js/dreams.js');
  const { suggestNames, analyzeName, HANJA } = await import('../js/naming.js');
  assert.equal(searchDreams('돼지꿈')[0].title, '돼지');
  const r1 = searchDreams('돼지가 도망가는 꿈')[0];
  assert.equal(r1.title, '돼지');
  assert.match(r1.situations[0].title, /도망/);
  assert.match(searchDreams('돼지가 죽으면')[0].situations[0].title, /죽는/);
  assert.match(searchDreams('이빨 빠지는 꿈')[0].situations[0].title, /빠지는/);
  const kim = [{ syl: '김', ch: '金', strokes: HANJA.get('金').strokes }];
  const list = suggestNames(kim, 'female', [], 10);
  assert.equal(list.length, 10);
  for (const r of list) assert.ok(r.gyeok.every((g) => g.luck > 0) && !r.flow.includes(-1));
  // 김민준(金民俊): 원격 5+9=14 → 14수
  const r = analyzeName(kim, [{ syl: '민', ch: '民', strokes: 5 }, { syl: '준', ch: '俊', strokes: 9 }]);
  assert.deepEqual(r.gyeok.map((g) => g.n), [14, 13, 17, 22]);
});
