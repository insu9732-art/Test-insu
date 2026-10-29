// 사주 계산 엔진 (브라우저/Node 공용 ES 모듈)
// - 연주·월주: 태양 황경으로 계산한 절기(입춘 등) 기준
// - 일주: 1900-01-01 = 甲戌일 기준 60갑자 순환
// - 시주: 일간 기준 시두법, 23시부터 다음 날 子시

import { LUNAR_DATA, LUNAR_FIRST_YEAR } from './lunar-data.js';

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const STEMS_KO = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const BRANCHES_KO = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
export const ZODIAC = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];

// 오행: 0 木, 1 火, 2 土, 3 金, 4 水 (상생 순서)
export const ELEMENTS = ['목', '화', '토', '금', '수'];
export const ELEMENTS_HANJA = ['木', '火', '土', '金', '水'];
export const BRANCH_ELEMENT = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
// 지지 본기(정기) 천간 — 지지의 십신 판단에 사용
export const BRANCH_MAIN_STEM = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8];

export const stemElement = (s) => Math.floor(s / 2);
export const isYang = (s) => s % 2 === 0;

const mod = (n, m) => ((n % m) + m) % m;

export function pillarOf(index60) {
  const i = mod(index60, 60);
  return { index: i, stem: i % 10, branch: i % 12 };
}

export function pillarName(p, lang = 'hanja') {
  if (!p) return '';
  return lang === 'ko'
    ? STEMS_KO[p.stem] + BRANCHES_KO[p.branch]
    : STEMS[p.stem] + BRANCHES[p.branch];
}

// ---------- 천문 계산 ----------

export function julianDay(ms) {
  return ms / 86400000 + 2440587.5;
}

// 태양의 겉보기 황경 (Meeus 저정밀 공식, 오차 약 0.01°)
export function sunLongitude(ms) {
  const jd = julianDay(ms) + 69 / 86400; // UT → TT 근사
  const T = (jd - 2451545.0) / 36525;
  const rad = Math.PI / 180;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * rad;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M) +
    0.000289 * Math.sin(3 * M);
  const omega = (125.04 - 1934.136 * T) * rad;
  return mod(L0 + C - 0.00569 - 0.00478 * Math.sin(omega), 360);
}

// 황경이 target(도)이 되는 순간을 [from, from+days] 안에서 찾는다
function findLongitude(target, fromMs, direction) {
  const day = 86400000;
  let a = fromMs;
  const diff = (ms) => mod(sunLongitude(ms) - target + 180, 360) - 180;
  // 하루씩 이동하며 부호 변화 탐색
  for (let i = 0; i < 40; i++) {
    const b = a + direction * day;
    const da = diff(a);
    const db = diff(b);
    if ((da <= 0 && db > 0) || (da >= 0 && db < 0) || da === 0) {
      let lo = Math.min(a, b);
      let hi = Math.max(a, b);
      for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2;
        if (diff(mid) < 0) lo = mid;
        else hi = mid;
      }
      return (lo + hi) / 2;
    }
    a = b;
  }
  return null;
}

// 절(節): 월이 바뀌는 12절기. 315°(입춘)부터 30°씩
export const JIE_NAMES = ['입춘', '경칩', '청명', '입하', '망종', '소서', '입추', '백로', '한로', '입동', '대설', '소한'];

export function monthIndexFromLongitude(lon) {
  return Math.floor(mod(lon - 315, 360) / 30); // 0 = 寅월
}

// 생일 순간 기준 직전/직후 절입 시각
export function surroundingJie(ms) {
  const lon = sunLongitude(ms);
  const m = monthIndexFromLongitude(lon);
  const prevTarget = mod(315 + m * 30, 360);
  const nextTarget = mod(prevTarget + 30, 360);
  return {
    prev: { name: JIE_NAMES[m], ms: findLongitude(prevTarget, ms, -1) },
    next: { name: JIE_NAMES[(m + 1) % 12], ms: findLongitude(nextTarget, ms, 1) },
  };
}

// ---------- 시간 보정 ----------

// 한국 서머타임(1987, 1988) — 해당 기간 시각은 1시간 빠르게 기록됨
const KOREA_DST = [
  [Date.UTC(1987, 4, 10, 2), Date.UTC(1987, 9, 11, 3)],
  [Date.UTC(1988, 4, 8, 2), Date.UTC(1988, 9, 9, 3)],
];

export function isKoreaDst(y, mo, d, h, mi) {
  const t = Date.UTC(y, mo - 1, d, h, mi);
  return KOREA_DST.some(([s, e]) => t >= s && t < e);
}

// ---------- 음력 ↔ 양력 ----------
// 기기 브라우저의 음력 지원 여부와 상관없이 동작하도록 내장 표(lunar-data.js)를 쓴다

const LUNAR_YEARS = [];
for (let i = 0; i * 6 < LUNAR_DATA.length; i++) {
  const row = LUNAR_DATA.slice(i * 6, i * 6 + 6);
  const year = LUNAR_FIRST_YEAR + i;
  const leapMonth = parseInt(row[2], 36);
  const bits = parseInt(row.slice(3), 36).toString(2).padStart(13, '0');
  const count = leapMonth ? 13 : 12;
  const months = []; // { month, leap, days }
  let m = 1;
  for (let k = 0; k < count; k++) {
    const leap = leapMonth > 0 && k === leapMonth; // 윤달은 같은 번호의 평달 바로 다음
    months.push({ month: leap ? leapMonth : m, leap, days: bits[k] === '1' ? 30 : 29 });
    if (!leap) m++;
  }
  LUNAR_YEARS.push({ year, start: Date.UTC(year, 0, 1) + parseInt(row.slice(0, 2), 36) * 86400000, months });
}

// 음력 y년 m월(윤달 여부)의 날수. 없는 달이면 0
export function lunarMonthDays(y, m, leap = false) {
  const info = LUNAR_YEARS[y - LUNAR_FIRST_YEAR];
  const mo = info && info.months.find((x) => x.month === m && x.leap === !!leap);
  return mo ? mo.days : 0;
}

export function lunarToSolar(y, m, d, leap = false) {
  const info = LUNAR_YEARS[y - LUNAR_FIRST_YEAR];
  if (!info) return null;
  let t = info.start;
  for (const mo of info.months) {
    if (mo.month === m && mo.leap === !!leap) {
      if (d < 1 || d > mo.days) return null;
      const dt = new Date(t + (d - 1) * 86400000);
      return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
    }
    t += mo.days * 86400000;
  }
  return null;
}

export function solarToLunar(y, m, d) {
  const t = Date.UTC(y, m - 1, d);
  for (let i = LUNAR_YEARS.length - 1; i >= 0; i--) {
    const info = LUNAR_YEARS[i];
    if (t < info.start) continue;
    let s = info.start;
    for (const mo of info.months) {
      const end = s + mo.days * 86400000;
      if (t < end) return { year: info.year, month: mo.month, day: Math.round((t - s) / 86400000) + 1, leap: mo.leap };
      s = end;
    }
    return null;
  }
  return null;
}

// ---------- 사주 계산 ----------

const DAY_BASE = Date.UTC(1900, 0, 1); // 甲戌일 (60갑자 index 10)

export function dayPillarOf(y, m, d) {
  const days = Math.round((Date.UTC(y, m - 1, d) - DAY_BASE) / 86400000);
  return pillarOf(10 + days);
}

/**
 * @param {object} input
 *  year, month, day: 양력 날짜
 *  hour, minute: 출생 시각 (null 이면 시간 모름)
 *  gender: 'male' | 'female'
 *  longitudeCorrection: 동경 135° 표준시 → 서울(약 127°) 보정 분 (기본 -30)
 */
export function calculateSaju(input) {
  const { year, month, day, gender = 'male' } = input;
  const timeKnown = input.hour !== null && input.hour !== undefined && input.hour !== '';
  let hour = timeKnown ? Number(input.hour) : 12;
  const minute = timeKnown ? Number(input.minute || 0) : 0;
  const correction = input.longitudeCorrection ?? -30;

  // 서머타임 보정
  const dst = timeKnown && isKoreaDst(year, month, day, hour, minute);
  const dstOffset = dst ? -60 : 0;

  // 실제 출생 순간 (UTC) — 절기 판단용. KST = UTC+9
  const birthMs = Date.UTC(year, month - 1, day, hour, minute) - 9 * 3600000 + dstOffset * 60000;

  // 연주: 입춘 기준
  const lon = sunLongitude(birthMs);
  const monthIdx = monthIndexFromLongitude(lon);
  // 양력 1~2월인데 입춘 전(寅월 이전, 즉 子·丑월)이면 전년도
  let sajuYear = year;
  if (month <= 2 && monthIdx >= 10) sajuYear -= 1;
  if (month >= 11 && monthIdx <= 1) sajuYear += 1; // 이론상 발생하지 않음, 안전장치
  const yearP = pillarOf(sajuYear - 4);

  // 월주: 연간 기준 월두법
  const monthStem = mod(yearP.stem * 2 + 2 + monthIdx, 10);
  const monthBranch = (monthIdx + 2) % 12;
  const monthP = { stem: monthStem, branch: monthBranch, index: sixtyIndex(monthStem, monthBranch) };

  // 일주·시주: 지방시(경도 보정) 기준
  const localMs = Date.UTC(year, month - 1, day, hour, minute) + (dstOffset + (timeKnown ? correction : 0)) * 60000;
  const local = new Date(localMs);
  let ly = local.getUTCFullYear();
  let lm = local.getUTCMonth() + 1;
  let ld = local.getUTCDate();
  const lh = local.getUTCHours();
  const lmin = local.getUTCMinutes();

  let dayP = dayPillarOf(ly, lm, ld);
  let hourP = null;
  if (timeKnown) {
    if (lh >= 23) dayP = pillarOf(dayP.index + 1); // 23시 이후는 다음 날 子시
    const hb = Math.floor((lh + 1) / 2) % 12;
    const hs = mod(dayP.stem * 2 + hb, 10);
    hourP = { stem: hs, branch: hb, index: sixtyIndex(hs, hb) };
  }

  const pillars = { hour: hourP, day: dayP, month: monthP, year: yearP };

  return {
    input: { ...input, timeKnown },
    pillars,
    dayMaster: dayP.stem,
    zodiac: ZODIAC[yearP.branch],
    dst,
    localTime: timeKnown ? `${pad(lh)}:${pad(lmin)}` : null,
    elements: countElements(pillars),
    tenGods: tenGodsOf(pillars),
    strength: strengthOf(pillars),
    daewoon: daewoonOf(birthMs, yearP, monthP, gender, year),
  };
}

function pad(n) {
  return String(n).padStart(2, '0');
}

export function sixtyIndex(stem, branch) {
  for (let i = 0; i < 60; i++) if (i % 10 === stem && i % 12 === branch) return i;
  return -1;
}

export function countElements(pillars) {
  const counts = [0, 0, 0, 0, 0];
  for (const p of Object.values(pillars)) {
    if (!p) continue;
    counts[stemElement(p.stem)]++;
    counts[BRANCH_ELEMENT[p.branch]]++;
  }
  return counts;
}

// ---------- 십신 ----------

export const TEN_GODS = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];

export function tenGod(dayStem, targetStem) {
  const rel = mod(stemElement(targetStem) - stemElement(dayStem), 5);
  const same = isYang(dayStem) === isYang(targetStem);
  return TEN_GODS[rel * 2 + (same ? 0 : 1)];
}

function tenGodsOf(pillars) {
  const d = pillars.day.stem;
  const out = {};
  for (const [k, p] of Object.entries(pillars)) {
    if (!p) { out[k] = null; continue; }
    out[k] = {
      stem: k === 'day' ? '일간(나)' : tenGod(d, p.stem),
      branch: tenGod(d, BRANCH_MAIN_STEM[p.branch]),
    };
  }
  return out;
}

// ---------- 신강/신약 (간이) ----------

function strengthOf(pillars) {
  const dEl = stemElement(pillars.day.stem);
  const support = (el) => el === dEl || el === mod(dEl - 1, 5); // 비겁, 인성
  let score = 0;
  let total = 0;
  const add = (el, w) => { total += w; if (support(el)) score += w; };
  for (const [k, p] of Object.entries(pillars)) {
    if (!p) continue;
    if (k !== 'day') add(stemElement(p.stem), 1);
    add(BRANCH_ELEMENT[p.branch], k === 'month' ? 3 : 1); // 월지 가중치
  }
  const ratio = score / total;
  let label;
  if (ratio >= 0.6) label = '신강';
  else if (ratio >= 0.45) label = '중화';
  else label = '신약';
  // 간이 용신: 신강이면 설기·극하는 오행, 신약이면 생조하는 오행
  const helpful = label === '신약'
    ? [mod(dEl - 1, 5), dEl]
    : label === '신강'
      ? [mod(dEl + 1, 5), mod(dEl + 2, 5)]
      : [mod(dEl + 1, 5), mod(dEl - 1, 5)];
  return { ratio, label, helpful };
}

// ---------- 대운 ----------

function daewoonOf(birthMs, yearP, monthP, gender, birthYear) {
  const forward = (isYang(yearP.stem) && gender === 'male') || (!isYang(yearP.stem) && gender === 'female');
  const jie = surroundingJie(birthMs);
  const target = forward ? jie.next.ms : jie.prev.ms;
  const days = target ? Math.abs(target - birthMs) / 86400000 : 15;
  let startAge = Math.round(days / 3); // 3일 = 1년
  if (startAge < 1) startAge = 1;
  const list = [];
  for (let i = 1; i <= 10; i++) {
    const p = pillarOf(monthP.index + (forward ? i : -i));
    const age = startAge + (i - 1) * 10;
    list.push({ ...p, age, year: birthYear + age - 1 });
  }
  return { forward, startAge, list };
}

// ---------- 세운·일진 ----------

export function yearPillarOf(y) {
  return pillarOf(y - 4);
}

export function todayPillar(date = new Date()) {
  // 한국 시간 기준 오늘
  const k = new Date(date.getTime() + 9 * 3600000);
  return dayPillarOf(k.getUTCFullYear(), k.getUTCMonth() + 1, k.getUTCDate());
}
