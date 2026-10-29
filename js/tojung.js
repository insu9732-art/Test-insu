// 토정비결: 태어난 음력 월·일과 보려는 해로 144괘 중 하나를 고른다
//   상괘 = (그해 나이 + 태세수) % 8
//   중괘 = (그해 생월의 날수 + 월건수) % 6
//   하괘 = (생일 + 일진수) % 3        (나머지가 0이면 8·6·3)
// 태세수·월건수·일진수는 해당 간지의 선천수(천간수 + 지지수)
import { lunarMonthDays, lunarToSolar, dayPillarOf, yearPillarOf } from './saju.js';
import { TOJUNG } from './tojung-data.js';

const STEM_NUM = [9, 8, 7, 6, 5, 9, 8, 7, 6, 5];
const BRANCH_NUM = [9, 8, 7, 6, 5, 4, 9, 8, 7, 6, 5, 4];
const pillarNum = (p) => STEM_NUM[p.stem] + BRANCH_NUM[p.branch];
const rem = (n, m) => n % m || m;

/**
 * @param {{year:number, month:number, day:number}} lunarBirth 음력 생일 (윤달은 평달로 본다)
 * @param {number} year 운세를 볼 해
 */
export function tojungOf(lunarBirth, year) {
  const age = year - lunarBirth.year + 1;
  const yp = yearPillarOf(year);
  const upper = rem(age + pillarNum(yp), 8);

  const m = lunarBirth.month;
  const monthDays = lunarMonthDays(year, m, false) || 30;
  // 월건: 그해 음력 m월의 간지 (정월 = 寅월, 연두법)
  const monthStem = (yp.stem * 2 + 2 + (m - 1)) % 10;
  const monthBranch = (m + 1) % 12;
  const mid = rem(monthDays + STEM_NUM[monthStem] + BRANCH_NUM[monthBranch], 6);

  // 일진: 그해 음력 생일의 일진 (그달에 없는 날이면 그달 말일)
  const d = Math.min(lunarBirth.day, monthDays);
  const solar = lunarToSolar(year, m, d, false);
  const dp = dayPillarOf(solar.year, solar.month, solar.day);
  const low = rem(lunarBirth.day + pillarNum(dp), 3);

  const index = (upper - 1) * 18 + (mid - 1) * 3 + (low - 1);
  const data = TOJUNG[index];
  const [verseKo, verseHanja] = (data.v || '').split('|');
  return {
    year,
    age,
    code: `${upper}${mid}${low}`,
    verseKo: verseKo || '',
    verseHanja: verseHanja || '',
    score: data.s,
    total: data.t,
    months: data.m.map((x) => {
      const [score, text] = x.split('|');
      return { score: Number(score), text };
    }),
  };
}
