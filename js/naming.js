// 이름짓기: 성명학 수리(81수) 4격, 발음오행, 음양으로 이름을 풀고 추천한다
import { HANJA_RAW } from './hanja-data.js';

// ---------- 한자 사전 ----------

export const HANJA = new Map(); // 글자 → { ch, meaning, readings[], strokes }
const BY_READING = new Map(); // 음 → [글자...]
for (const item of HANJA_RAW.split(';')) {
  const [head, readings, strokes] = item.split('|');
  const ch = head[0];
  const entry = { ch, meaning: head.slice(1), readings: readings.split('/'), strokes: Number(strokes) };
  HANJA.set(ch, entry);
  for (const r of entry.readings) {
    if (!BY_READING.has(r)) BY_READING.set(r, []);
    BY_READING.get(r).push(ch);
  }
}

// 두음법칙: 이름에 '이'로 쓰는 글자는 사전에 '리'로 들어 있는 경우가 많다
const INITIAL = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const initialIndex = (syl) => Math.floor((syl.charCodeAt(0) - 0xac00) / 588);
const withInitial = (syl, idx) => String.fromCharCode(0xac00 + idx * 588 + ((syl.charCodeAt(0) - 0xac00) % 588));

function readingVariants(syl) {
  const out = [syl];
  const i = initialIndex(syl);
  if (INITIAL[i] === 'ㅇ') out.push(withInitial(syl, 5), withInitial(syl, 2)); // 이→리, 여→녀
  if (INITIAL[i] === 'ㄴ') out.push(withInitial(syl, 5)); // 나→라
  return out;
}

// 이름 글자로 많이 쓰는 한자 (좋은 뜻 위주). 추천과 목록 정렬에 쓴다
const NAME_CHARS = {
  both: '民賢秀智敏浩宇珍恩瑞允志旻炫潤然娟永英玄河海洙昊承成星晟世素守秀洙淳時信雅安妍延涓淵映泳睿玉完旭雲元源有胤銀恩宜仁一日正貞靜周珠智志眞辰燦彩天泉淸初秋春平夏海香賢慧浩昊皓弘和煥晃輝熙希',
  male: '俊勳哲鎭赫範錫碩煥浚燦旭泰柱鉉東鎬炯宰載植昇榮容龍雄偉峻廷鍾振昌澈亨鎬洪輝圭奎均根基吉斗萬明文炳輔相祥善燮壽舜勇佑雨郁義益寅章楨濟祚喆澤翰炫孝興健傑坤光國奎錦大德道敦烈武炳成秀承植岩堯友原潤正鍾準晋澯昌彬',
  female: '妍娟姬貞淑美惠慧珠眞嬉蓮蘭玲瑛琳妙敏素秀雅英玉媛允恩宜仁慈晶靜情貞珍彩采姝淑順詩信娥愛如姸瑩藝玧有允銀恩宜伊仁姿貞正靜智眞珍彩泉初春夏香賢惠慧和花華嬅希喜熙',
};
const PREFERRED = new Set([...NAME_CHARS.both, ...NAME_CHARS.male, ...NAME_CHARS.female]);

/** 음절에 맞는 한자 목록 (이름에 자주 쓰는 글자 먼저) */
export function hanjaFor(syl) {
  const seen = new Set();
  const list = [];
  for (const r of readingVariants(syl)) {
    for (const ch of BY_READING.get(r) || []) {
      if (seen.has(ch)) continue;
      seen.add(ch);
      list.push(HANJA.get(ch));
    }
  }
  return list.sort((a, b) => (PREFERRED.has(b.ch) - PREFERRED.has(a.ch)) || a.strokes - b.strokes);
}

// ---------- 발음오행 ----------
// ㄱㅋ 목, ㄴㄷㄹㅌ 화, ㅇㅎ 토, ㅅㅈㅊ 금, ㅁㅂㅍ 수 (0 목 1 화 2 토 3 금 4 수)
const SOUND_ELEMENT = { ㄱ: 0, ㄲ: 0, ㅋ: 0, ㄴ: 1, ㄷ: 1, ㄸ: 1, ㄹ: 1, ㅌ: 1, ㅇ: 2, ㅎ: 2, ㅅ: 3, ㅆ: 3, ㅈ: 3, ㅉ: 3, ㅊ: 3, ㅁ: 4, ㅂ: 4, ㅃ: 4, ㅍ: 4 };
export const ELEMENT_NAMES = ['목(木)', '화(火)', '토(土)', '금(金)', '수(水)'];

export function soundElement(syl) {
  return SOUND_ELEMENT[INITIAL[initialIndex(syl)]];
}

// a에서 b로: 0 같음, 1 상생, -1 상극
function relation(a, b) {
  const d = ((b - a) % 5 + 5) % 5;
  if (d === 0) return 0;
  if (d === 1 || d === 4) return 1;
  return -1;
}

// ---------- 81수 ----------
// [길흉(2 길, 1 반길, 0 흉), 풀이]
export const SURI = [
  null,
  [2, '모든 일의 시작이 되는 수. 건강하고 부귀와 명예를 함께 누립니다.'],
  [0, '나뉘고 흩어지는 수. 의지가 약해지고 일이 자주 끊기기 쉽습니다.'],
  [2, '지혜와 결단이 함께하는 수. 이름을 얻고 집안이 번성합니다.'],
  [0, '흔들리고 부서지는 수. 노력에 비해 결실이 적고 고생이 따릅니다.'],
  [2, '음양이 조화로운 수. 덕망이 있고 복과 장수를 함께 누립니다.'],
  [2, '하늘의 덕을 입는 수. 집안이 넉넉하고 대대로 평안합니다.'],
  [2, '굳센 의지로 홀로 서는 수. 추진력이 강해 큰일을 해냅니다.'],
  [2, '꾸준히 쌓아 올리는 수. 인내하면 자수성가합니다.'],
  [0, '큰 뜻에 비해 힘이 모자라는 수. 고독하고 기복이 심합니다.'],
  [0, '텅 빈 그릇의 수. 애써도 남는 것이 적고 허무함을 겪기 쉽습니다.'],
  [2, '새싹이 돋아나는 수. 차츰 일어나 집안을 다시 일으킵니다.'],
  [0, '약한 몸으로 무거운 짐을 진 수. 뜻은 크나 이루기 어렵습니다.'],
  [2, '지혜와 재주가 빛나는 수. 머리가 좋아 어디서나 인정받습니다.'],
  [0, '흩어지고 떠도는 수. 가족과 인연이 엷고 외로움이 따릅니다.'],
  [2, '덕이 높아 사람이 모이는 수. 윗사람의 도움으로 크게 됩니다.'],
  [2, '두터운 덕으로 우두머리가 되는 수. 재물과 명예를 함께 얻습니다.'],
  [2, '굳세게 뚫고 나가는 수. 어려움을 이겨 내고 뜻을 이룹니다.'],
  [2, '의지가 굳어 일을 끝까지 해내는 수. 사업에서 성공합니다.'],
  [0, '바람 앞의 등불 같은 수. 재주가 있어도 장애가 많습니다.'],
  [0, '공허한 수. 일이 중간에 꺾이고 실패가 거듭되기 쉽습니다.'],
  [2, '홀로 서서 우두머리가 되는 수. 남을 이끄는 힘이 있습니다.'],
  [0, '가을 낙엽 같은 수. 중도에 힘이 빠지고 좌절을 겪기 쉽습니다.'],
  [2, '해가 떠오르는 기세의 수. 크게 발전하고 이름을 떨칩니다.'],
  [2, '재물이 모이는 수. 작은 것에서 시작해 큰 부를 이룹니다.'],
  [2, '재주와 개성이 뛰어난 수. 꾸준하면 크게 성공합니다.'],
  [1, '파란만장한 수. 영웅의 기질이 있으나 굴곡이 큽니다.'],
  [1, '자존심이 강해 비난을 사기 쉬운 수. 중년에 고비가 있습니다.'],
  [0, '풍파가 잦은 수. 가정과 일에 다툼이 생기기 쉽습니다.'],
  [2, '지혜와 재물을 함께 갖춘 수. 뜻한 바를 이룹니다.'],
  [1, '길흉이 엇갈리는 수. 큰 성공과 실패가 교차합니다.'],
  [2, '지혜와 용기, 덕을 갖춘 수. 남을 이끌며 안정을 누립니다.'],
  [2, '뜻밖의 행운이 따르는 수. 귀인의 도움으로 크게 됩니다.'],
  [2, '하늘로 오르는 용의 수. 권위와 명예를 얻습니다.'],
  [0, '갑작스러운 재난을 조심해야 하는 수. 가정에 근심이 생기기 쉽습니다.'],
  [2, '온화하고 평안한 수. 학문과 예술에 재능이 있습니다.'],
  [1, '의리가 강해 남을 돕다 손해를 보는 수. 파란이 많습니다.'],
  [2, '충직하고 권위가 있는 수. 신망을 얻어 크게 됩니다.'],
  [2, '문학과 예술에 뛰어난 수. 재능으로 이름을 얻습니다.'],
  [2, '부귀와 영화를 누리는 수. 지위가 높아집니다.'],
  [1, '변화가 많은 수. 지혜는 있으나 투기를 조심해야 합니다.'],
  [2, '덕망이 높고 사람이 따르는 수. 크게 성공합니다.'],
  [0, '재주는 많으나 한 가지를 이루지 못하는 수입니다.'],
  [0, '겉은 화려하나 속이 빈 수. 재물이 흩어지기 쉽습니다.'],
  [0, '근심과 고난이 겹치는 수. 무리한 일을 피해야 합니다.'],
  [2, '순풍에 돛 단 듯한 수. 지혜로 크게 발전합니다.'],
  [0, '재물을 잃기 쉬운 수. 의지가 약해지면 곤란을 겪습니다.'],
  [2, '꽃이 피어 열매를 맺는 수. 집안이 번창합니다.'],
  [2, '지혜와 덕으로 남을 돕는 수. 존경을 받습니다.'],
  [1, '길흉이 갈리는 수. 환경에 따라 성패가 달라집니다.'],
  [0, '한 번 이루고 한 번 무너지는 수. 말년을 조심해야 합니다.'],
  [1, '성공과 실패가 번갈아 오는 수. 중년 이후를 대비하세요.'],
  [2, '앞을 내다보는 수. 계획한 일을 이뤄 재물을 얻습니다.'],
  [0, '겉은 좋아 보이나 속에 근심이 있는 수입니다.'],
  [0, '어려움이 많은 수. 몸과 마음을 지켜야 합니다.'],
  [0, '좋은 것과 나쁜 것이 함께 오는 수. 끈기가 필요합니다.'],
  [0, '실행력이 부족한 수. 기회를 놓치기 쉽습니다.'],
  [2, '노력으로 시련을 이기는 수. 끝내 성공합니다.'],
  [1, '늦게 피는 꽃의 수. 고생 끝에 낙이 옵니다.'],
  [0, '인내와 용기가 부족한 수. 일을 끝맺기 어렵습니다.'],
  [0, '방향을 잃고 헤매는 수. 계획을 단단히 세워야 합니다.'],
  [2, '명예와 재물이 함께하는 수. 크게 이룹니다.'],
  [0, '신용을 잃기 쉬운 수. 말과 행동을 조심해야 합니다.'],
  [2, '만물이 자라는 수. 부귀와 영화를 누립니다.'],
  [0, '어려움이 가라앉지 않는 수. 건강을 조심해야 합니다.'],
  [2, '복이 두텁고 집안이 화목한 수입니다.'],
  [0, '안과 밖이 맞지 않아 곤란을 겪는 수입니다.'],
  [2, '하는 일마다 뜻대로 되는 수. 집안이 번성합니다.'],
  [2, '지혜롭고 꼼꼼해 일을 잘 이루는 수입니다.'],
  [0, '불안정하고 흔들림이 많은 수입니다.'],
  [0, '공허하고 쓸쓸한 수. 가족과의 인연을 잘 지켜야 합니다.'],
  [1, '노력에 따라 성공할 수 있는 수입니다.'],
  [0, '앞은 좋으나 뒤가 흐린 수입니다.'],
  [1, '뜻은 크나 실천이 따라야 하는 수입니다.'],
  [0, '재능을 펴지 못하고 막히는 수입니다.'],
  [1, '분수를 지키면 평안한 수입니다.'],
  [0, '이별과 손해가 따르기 쉬운 수입니다.'],
  [1, '초년은 좋고 말년이 약한 수입니다.'],
  [1, '중년까지는 좋으나 말년을 대비해야 하는 수입니다.'],
  [0, '나아갈 힘이 부족한 수입니다.'],
  [0, '헛된 꿈을 좇기 쉬운 수입니다.'],
  [2, '다시 처음으로 돌아가 크게 일어나는 수. 1수와 같은 대길수입니다.'],
];

const suri = (n) => SURI[((n - 1) % 80) + 1];
// 수리오행: 격수의 끝자리 1·2 목, 3·4 화, 5·6 토, 7·8 금, 9·0 수
export const suriElement = (n) => Math.floor(((n % 10) || 10) - 1) / 2 | 0;
const reduce81 = (n) => ((n - 1) % 80) + 1;

/**
 * 이름 풀이
 * @param {{ch:string, strokes:number, syl:string}[]} sur 성 (1~2자)
 * @param {{ch:string, strokes:number, syl:string}[]} given 이름 (1~2자)
 * @param {number[]} helpful 사주에서 도움이 되는 오행 (없으면 [])
 */
export function analyzeName(sur, given, helpful = []) {
  const s = sur.reduce((a, c) => a + c.strokes, 0);
  const g1 = given[0].strokes;
  const g2 = given[1] ? given[1].strokes : 0;
  const total = s + g1 + g2;
  const won = given.length === 1 ? g1 : g1 + g2; // 원격(초년)
  const hyung = s + g1; // 형격(청년)
  const yi = given.length === 1 ? s : s + g2; // 이격(중년)
  const jung = total; // 정격(말년·총운)
  const gyeok = [
    { name: '원격', age: '초년운 (~20세)', n: reduce81(won) },
    { name: '형격', age: '청년운 (20~40세)', n: reduce81(hyung) },
    { name: '이격', age: '중년운 (40~60세)', n: reduce81(yi) },
    { name: '정격', age: '말년운·총운', n: reduce81(jung) },
  ].map((x) => ({ ...x, luck: suri(x.n)[0], text: suri(x.n)[1], element: suriElement(x.n) }));

  const syllables = [...sur, ...given];
  const elements = syllables.map((c) => soundElement(c.syl));
  const flow = [];
  for (let i = 1; i < elements.length; i++) flow.push(relation(elements[i - 1], elements[i]));
  const yinYang = syllables.map((c) => (c.strokes % 2 ? '양' : '음'));
  const balanced = new Set(yinYang).size > 1;
  const fit = given.filter((c) => helpful.includes(soundElement(c.syl))).length;

  let score = 40;
  score += gyeok.reduce((a, x) => a + (x.luck === 2 ? 10 : x.luck === 1 ? 5 : 0), 0);
  score += flow.reduce((a, x) => a + (x === 1 ? 5 : x === 0 ? 2 : -6), 0);
  score += balanced ? 6 : 0;
  score += fit * 4;
  score = Math.max(0, Math.min(100, score));

  return { gyeok, elements, flow, yinYang, balanced, fit, score };
}

/**
 * 이름 추천
 * @param {{ch:string, strokes:number, syl:string}[]} sur
 * @param {'male'|'female'} gender
 * @param {number[]} helpful
 */
export function suggestNames(sur, gender, helpful = [], count = 12, seed = 0) {
  const pool = [...new Set([...NAME_CHARS.both, ...NAME_CHARS[gender]])]
    .map((ch) => HANJA.get(ch))
    .filter(Boolean)
    .map((h) => ({ ch: h.ch, strokes: h.strokes, syl: preferredReading(h), meaning: h.meaning }));

  const results = [];
  for (const a of pool) {
    for (const b of pool) {
      if (a.syl === b.syl) continue;
      const r = analyzeName(sur, [a, b], helpful);
      if (r.gyeok.some((x) => x.luck === 0)) continue;
      if (r.flow.some((x) => x === -1)) continue;
      results.push({ given: [a, b], ...r });
    }
  }
  // 점수가 높은 순, 같은 점수 안에서는 seed로 섞어 다양하게
  let t = 0x9e3779b9 ^ (seed * 2654435761);
  const rand = () => { // mulberry32
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
  for (const r of results) r.key = rand();
  results.sort((x, y) => y.score - x.score || x.key - y.key);
  // 같은 소리 이름은 한 번만, 한 글자는 추천 목록에 두 번까지만 (다양하게)
  const seen = new Set();
  const usedChars = new Map(); // 글자별 사용 횟수 (최대 2번)
  const out = [];
  for (const r of results) {
    const key = r.given.map((c) => c.syl).join('');
    if (seen.has(key) || r.given.some((c) => (usedChars.get(c.ch) || 0) >= 2)) continue;
    seen.add(key);
    r.given.forEach((c) => usedChars.set(c.ch, (usedChars.get(c.ch) || 0) + 1));
    out.push(r);
    if (out.length >= count) break;
  }
  return out;
}

// 이름에 쓰는 소리: 두음법칙 적용 (리→이, 녀→여 …)
const READING_OVERRIDE = { 瑩: '영' };

function preferredReading(h) {
  if (READING_OVERRIDE[h.ch]) return READING_OVERRIDE[h.ch];
  const r = h.readings[0];
  const i = initialIndex(r);
  if (INITIAL[i] === 'ㄹ') {
    const v = withInitial(r, 11); // ㅇ
    const vowel = (r.charCodeAt(0) - 0xac00) % 588;
    const jung = Math.floor(vowel / 28);
    // ㅑㅕㅛㅠㅣㅖ 앞의 ㄹ은 ㅇ, 나머지는 ㄴ
    return [2, 6, 7, 12, 17, 20].includes(jung) ? v : withInitial(r, 2);
  }
  if (INITIAL[i] === 'ㄴ') {
    const jung = Math.floor(((r.charCodeAt(0) - 0xac00) % 588) / 28);
    if ([2, 6, 7, 12, 17, 20].includes(jung)) return withInitial(r, 11);
  }
  return r;
}

