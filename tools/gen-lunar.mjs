// 한국 음력 표(1899~2101)를 만든다. Node 의 ICU 'dangi' 달력을 기준으로 한다.
//   node tools/gen-lunar.mjs > js/lunar-data.js
// 연도마다 "설날 날짜(1월 1일부터 일수, 2자리 36진) + 윤달 월(0=없음, 1자리 36진) + 달별 일수(30일=1, 29일=0, 13자리)"
const fmt = new Intl.DateTimeFormat('ko-KR-u-ca-dangi', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' });
const DAY = 86400000;
function parts(t) {
  const p = fmt.formatToParts(new Date(t));
  const g = (k) => p.find((x) => x.type === k)?.value ?? '';
  const m = g('month');
  return { y: +g('relatedYear'), m: +m.replace(/\D/g, ''), d: +g('day'), leap: m.includes('윤') };
}
const FIRST = 1899;
const LAST = 2101;
const rows = [];
for (let y = FIRST; y <= LAST; y++) {
  let t = Date.UTC(y, 0, 1);
  while (!(parts(t).y === y && parts(t).m === 1 && parts(t).d === 1)) t += DAY;
  const offset = (t - Date.UTC(y, 0, 1)) / DAY;
  const lens = [];
  let leapMonth = 0;
  let cur = parts(t);
  let len = 0;
  for (;;) {
    const p = parts(t);
    if (p.d === 1 && len > 0) {
      lens.push(len);
      len = 0;
      if (p.y !== y) break;
      if (p.leap) leapMonth = p.m;
    }
    len++;
    t += DAY;
    cur = p;
  }
  const bits = lens.map((l) => (l === 30 ? '1' : '0')).join('').padEnd(13, '0');
  rows.push(offset.toString(36).padStart(2, '0') + leapMonth.toString(36) + parseInt(bits, 2).toString(36).padStart(3, '0'));
}
console.log(`// 자동 생성 파일 — tools/gen-lunar.mjs 로 다시 만들 수 있습니다
// ${FIRST}~${LAST}년 한국 음력: 연도마다 6글자 (설날 오프셋 2 + 윤달 1 + 달 크기 비트 3, 36진수)
export const LUNAR_FIRST_YEAR = ${FIRST};
export const LUNAR_DATA = '${rows.join('')}';`);
