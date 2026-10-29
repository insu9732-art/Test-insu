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
