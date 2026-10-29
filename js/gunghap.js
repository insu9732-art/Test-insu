// 궁합: 두 사람의 띠(겉궁합)·일주(속궁합)·일간 오행·오행 보완을 함께 본다
import { STEMS, STEMS_KO, BRANCHES, ZODIAC, ELEMENTS, stemElement } from './saju.js';
import { josa } from './dream-gen.js';

const ghCyc = (n, m) => ((n % m) + m) % m;
const GH_SAMHAP = [[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]]; // 申子辰 寅午戌 巳酉丑 亥卯未
const GH_YUKHAP = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
const GH_WONJIN = [[0, 7], [1, 6], [2, 9], [3, 8], [4, 11], [5, 10]];
const ghPairIn = (list, a, b) => list.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
const ghSamhap = (a, b) => a !== b && GH_SAMHAP.some((g) => g.includes(a) && g.includes(b));
const ghChung = (a, b) => ghCyc(a - b, 12) === 6;

// 지지 두 개의 관계
function ghBranchRelation(a, b) {
  if (ghPairIn(GH_YUKHAP, a, b)) return 'yukhap';
  if (ghSamhap(a, b)) return 'samhap';
  if (ghChung(a, b)) return 'chung';
  if (ghPairIn(GH_WONJIN, a, b)) return 'wonjin';
  if (a === b) return 'same';
  return 'plain';
}

const GH_ZODIAC_TEXT = {
  yukhap: { s: 15, t: '육합', d: '서로의 빈 곳을 채워 주는 짝입니다. 처음 만나도 오래 안 사이처럼 편안하고, 함께 있으면 일이 술술 풀립니다.' },
  samhap: { s: 12, t: '삼합', d: '뜻이 잘 맞아 같은 방향을 바라보는 사이입니다. 함께 목표를 세우면 힘이 배로 납니다.' },
  same: { s: 5, t: '같은 띠', d: '성향이 비슷해 서로를 잘 이해합니다. 다만 고집도 닮아 부딪힐 때는 한 사람이 먼저 양보하는 게 좋습니다.' },
  plain: { s: 0, t: '무난', d: '크게 끌리거나 부딪히는 관계는 아닙니다. 함께 쌓는 시간만큼 정이 깊어지는 사이입니다.' },
  wonjin: { s: -10, t: '원진', d: '이유 없이 서운함이 쌓이기 쉬운 사이입니다. 작은 일도 말로 풀고 넘어가면 오히려 단단해집니다.' },
  chung: { s: -12, t: '충', d: '성격과 생활 방식이 정반대라 부딪히기 쉽습니다. 대신 서로에게 없는 것을 배우면 큰 자극이 되는 관계입니다.' },
};

const GH_DAY_BRANCH_TEXT = {
  yukhap: { s: 12, d: '배우자 자리가 서로 합을 이루어 속정이 깊고, 함께 살수록 잘 맞습니다.' },
  samhap: { s: 6, d: '생활의 리듬과 가치관이 잘 어울려 집안이 편안합니다.' },
  same: { s: 2, d: '생활 습관이 닮아 편하지만, 같은 문제에서 함께 막히기도 합니다.' },
  plain: { s: 0, d: '서로 다른 생활 방식을 맞춰 가는 재미가 있는 사이입니다.' },
  wonjin: { s: -8, d: '가까울수록 사소한 것에 서운해지기 쉬우니 표현을 자주 해 주세요.' },
  chung: { s: -10, d: '같이 살면 생활 방식 차이가 드러나기 쉽습니다. 각자의 공간과 시간을 존중하면 좋습니다.' },
};

// 일간(나 자신) 오행의 관계
function ghStemRelation(a, b) {
  if (Math.abs(a - b) === 5) return { s: 15, t: '천간합', d: `${josa(STEMS_KO[a], '과와')} ${josa(STEMS_KO[b], '이가')} 합을 이루는, 서로 끌리는 인연입니다. 첫눈에 마음이 가고 함께 있으면 안정됩니다.` };
  const ea = stemElement(a);
  const eb = stemElement(b);
  if (ea === eb) return { s: 4, t: '비화', d: `둘 다 ${ELEMENTS[ea]}의 기운이라 친구처럼 통합니다. 경쟁심이 생기지 않게 역할을 나누면 좋습니다.` };
  if (ghCyc(eb - ea, 5) === 1) return { s: 10, t: '상생', d: `${josa(ELEMENTS[ea], '이가')} ${josa(ELEMENTS[eb], '을를')} 살리는 관계라, 내가 상대를 아끼고 밀어 주는 모양입니다.` };
  if (ghCyc(ea - eb, 5) === 1) return { s: 10, t: '상생', d: `${josa(ELEMENTS[eb], '이가')} ${josa(ELEMENTS[ea], '을를')} 살리는 관계라, 상대가 나를 아끼고 밀어 주는 모양입니다.` };
  return { s: -3, t: '상극', d: '서로를 다잡는 관계라 긴장감이 있습니다. 잔소리보다는 칭찬으로 이끌면 좋은 자극이 됩니다.' };
}

// 상대가 내게 필요한 오행을 얼마나 가졌나 (0~1)
function ghSupply(need, other) {
  const total = other.elements.reduce((a, b) => a + b, 0) || 1;
  return need.reduce((a, e) => a + other.elements[e], 0) / total;
}

const GH_GRADES = [
  [90, '천생연분', '하늘이 맺어 준 인연입니다. 서로를 믿고 지금처럼 아껴 주세요.'],
  [80, '아주 좋은 궁합', '서로 돕고 채워 주는 사이입니다. 함께하면 복이 커집니다.'],
  [70, '좋은 궁합', '잘 맞는 부분이 많습니다. 작은 차이만 이해하면 오래 행복합니다.'],
  [60, '무난한 궁합', '좋은 점과 다른 점이 고루 있습니다. 대화가 궁합을 완성합니다.'],
  [50, '노력하는 궁합', '다른 점이 많아 처음엔 맞춰 가는 시간이 필요합니다. 그만큼 배울 것도 많습니다.'],
  [0, '배려가 필요한 궁합', '부딪히기 쉬운 기운이 있습니다. 서로의 방식을 존중하면 오히려 깊어질 수 있습니다.'],
];

/**
 * @param a,b calculateSaju 결과
 * @returns {{score, grade, gradeText, items:{title,score,max,tag,text}[], advice}}
 */
export function compatibility(a, b) {
  const items = [];
  const zr = ghBranchRelation(a.pillars.year.branch, b.pillars.year.branch);
  const z = GH_ZODIAC_TEXT[zr];
  items.push({ title: `겉궁합 (띠) · ${ZODIAC[a.pillars.year.branch]}띠·${ZODIAC[b.pillars.year.branch]}띠`, score: z.s, max: 15, tag: z.t, text: z.d });

  const st = ghStemRelation(a.dayMaster, b.dayMaster);
  items.push({ title: `마음 궁합 (일간) · ${STEMS[a.dayMaster]}${ELEMENTS[stemElement(a.dayMaster)]}·${STEMS[b.dayMaster]}${ELEMENTS[stemElement(b.dayMaster)]}`, score: st.s, max: 15, tag: st.t, text: st.d });

  const dr = ghBranchRelation(a.pillars.day.branch, b.pillars.day.branch);
  const d = GH_DAY_BRANCH_TEXT[dr];
  items.push({ title: `속궁합 (배우자 자리) · ${BRANCHES[a.pillars.day.branch]}·${BRANCHES[b.pillars.day.branch]}`, score: d.s, max: 12, tag: GH_ZODIAC_TEXT[dr].t, text: d.d });

  const ab = ghSupply(a.strength.helpful, b);
  const ba = ghSupply(b.strength.helpful, a);
  const fill = Math.round((ab + ba) * 15);
  const need = (s) => s.strength.helpful.map((e) => ELEMENTS[e]).join('·');
  items.push({
    title: '오행 보완',
    score: fill,
    max: 15,
    tag: fill >= 10 ? '잘 채워 줌' : fill >= 5 ? '조금 채워 줌' : '각자 채워야 함',
    text: `나에게 필요한 ${need(a)} 기운을 상대가 ${Math.round(ab * 100)}%, 상대에게 필요한 ${need(b)} 기운을 내가 ${Math.round(ba * 100)}% 가지고 있습니다. `
      + (fill >= 10 ? '서로 부족한 기운을 채워 주니 함께 있을 때 마음이 편해집니다.' : fill >= 5 ? '어느 정도 서로를 채워 줍니다. 부족한 부분은 취미나 생활 습관으로 보완해 보세요.' : '서로 채워 주는 기운은 적으니, 각자 자기 관리를 잘하는 것이 관계에도 도움이 됩니다.'),
  });

  const raw = 55 + items.reduce((s, x) => s + x.score, 0);
  const score = Math.max(35, Math.min(99, raw));
  const [, grade, gradeText] = GH_GRADES.find(([min]) => score >= min);
  const worst = items.slice(0, 3).sort((x, y) => x.score / x.max - y.score / y.max)[0];
  const advice = worst.score < 0
    ? `가장 신경 쓸 부분은 '${worst.title.split(' · ')[0]}'입니다. ${worst.text}`
    : '크게 부딪히는 기운이 없습니다. 지금처럼 서로를 아끼면 됩니다.';
  return { score, grade, gradeText, items, advice, elementsA: a.elements, elementsB: b.elements, zodiacRel: zr, dayRel: dr };
}
