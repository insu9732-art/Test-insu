// 사주 원국에서 종합 풀이(적성·재물·연애·건강·신살·합충·월운)를 만든다
import {
  BRANCHES, STEMS, BRANCH_ELEMENT, BRANCH_MAIN_STEM, stemElement, tenGod,
} from './saju.js';

const cyc = (n, m) => ((n % m) + m) % m;

// 십신 5그룹
export const GROUPS = ['비겁', '식상', '재성', '관성', '인성'];
const GROUP_OF = {
  비견: 0, 겁재: 0, 식신: 1, 상관: 1, 편재: 2, 정재: 2, 편관: 3, 정관: 3, 편인: 4, 정인: 4,
};

const PILLAR_LABEL = { year: '연주', month: '월주', day: '일주', hour: '시주' };

export function groupCounts(saju) {
  const counts = [0, 0, 0, 0, 0];
  for (const [k, g] of Object.entries(saju.tenGods)) {
    if (!g) continue;
    if (k !== 'day') counts[GROUP_OF[g.stem]]++;
    counts[GROUP_OF[g.branch]]++;
  }
  return counts;
}

const GROUP_TEXT = {
  비겁: {
    also: '독립심과 승부욕도 함께 갖추었습니다',
    trait: '자존심과 독립심이 강하고, 남에게 기대기보다 스스로 해내려는 기질',
    career: ['자영업·창업', '프리랜서', '스포츠·체육', '영업·협상', '동업보다는 독립 사업'],
  },
  식상: {
    also: '표현력과 창의력도 함께 갖추었습니다',
    trait: '표현력과 손재주가 좋고, 아이디어를 결과물로 만들어 내는 기질',
    career: ['기획·마케팅', '디자인·예술', '요리·식음료', '교육·강의', '유튜브·방송·콘텐츠'],
  },
  재성: {
    also: '현실적인 경제 감각도 함께 갖추었습니다',
    trait: '현실 감각과 경제 감각이 뛰어나고, 결과를 숫자로 만들어 내는 기질',
    career: ['금융·투자', '사업·무역', '부동산', '회계·재무', '유통·판매'],
  },
  관성: {
    also: '책임감과 원칙도 함께 갖추었습니다',
    trait: '책임감과 규율을 중시하고, 조직 안에서 인정받으며 성장하는 기질',
    career: ['공무원·공공기관', '대기업·조직 관리', '법조·경찰·군인', '행정·인사', '관리자·리더'],
  },
  인성: {
    also: '배움을 즐기는 학구적인 면도 함께 갖추었습니다',
    trait: '배움과 사색을 좋아하고, 지식과 자격으로 자리를 잡는 기질',
    career: ['연구·학계', '교사·교수', '의료·상담', '작가·출판', '자격증 기반 전문직'],
  },
};

// 오행별 건강 포인트
const HEALTH = [
  { organ: '간·담, 눈, 근육', tip: '스트레칭과 충분한 수면, 과음을 피하는 것이 좋습니다.' },
  { organ: '심장·소장, 혈압, 혈액순환', tip: '과로와 흥분을 줄이고 가벼운 유산소 운동을 꾸준히 하세요.' },
  { organ: '위·비장, 소화기', tip: '규칙적인 식사와 천천히 먹는 습관이 중요합니다.' },
  { organ: '폐·대장, 기관지, 피부', tip: '호흡기 관리와 수분 섭취, 환기에 신경 쓰세요.' },
  { organ: '신장·방광, 허리, 생식기', tip: '몸을 따뜻하게 하고 물을 자주 마시며 무리한 야근을 피하세요.' },
];

// ---------- 종합 풀이 ----------

export function lifeReading(saju, gender) {
  const counts = groupCounts(saju);
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  const order = counts.map((c, i) => [i, c]).sort((a, b) => b[1] - a[1]);
  const top = GROUPS[order[0][0]];
  const second = order[1][1] > 0 ? GROUPS[order[1][0]] : null;
  const missing = counts.map((c, i) => (c === 0 ? GROUPS[i] : null)).filter(Boolean);
  const strong = saju.strength.label === '신강';
  const weak = saju.strength.label === '신약';

  // 성향·적성
  const career = {
    title: '직업과 적성',
    lines: [
      `사주에서 가장 두드러진 기운은 <b>${top}</b>입니다. ${GROUP_TEXT[top].trait}이 있습니다.`,
      second ? `여기에 <b>${second}</b>의 기운이 더해져 ${GROUP_TEXT[second].also}.` : '',
      `잘 맞는 분야: ${[...GROUP_TEXT[top].career.slice(0, 3), ...(second ? GROUP_TEXT[second].career.slice(0, 2) : [])].join(', ')}`,
      strong
        ? '힘이 강한 사주라 남 밑에서 오래 버티기보다 주도권을 쥘 수 있는 자리에서 실력이 더 잘 드러납니다.'
        : weak
          ? '협력과 조직의 울타리 안에서 꾸준히 실력을 쌓을 때 안정적으로 성장합니다. 좋은 선배·스승을 만나는 것이 큰 복입니다.'
          : '상황에 맞춰 역할을 바꿀 줄 아는 균형형이라, 조직 생활과 개인 활동 모두 무난하게 해냅니다.',
    ].filter(Boolean),
  };

  // 재물운
  const wealth = counts[2];
  const output = counts[1];
  const wealthLines = [];
  if (wealth === 0) {
    wealthLines.push('원국에 재성(재물의 별)이 드러나 있지 않습니다. 돈을 쫓기보다 실력과 명예를 쌓으면 재물이 따라오는 구조입니다. 대운·세운에서 재성이 들어오는 시기에 기회가 열립니다.');
  } else if (wealth >= 3) {
    wealthLines.push('재성이 많아 돈의 흐름을 읽는 감각이 좋고 벌 기회도 많습니다. 다만 욕심을 부리면 나가는 돈도 커지니, 지키는 습관(저축·분산)이 핵심입니다.');
  } else {
    wealthLines.push('재성이 적당히 자리 잡아 노력한 만큼 재물이 모이는 안정적인 재물운입니다.');
  }
  if (output > 0 && wealth > 0) wealthLines.push('식상(재능)이 재성(재물)을 생하는 흐름이 있어, 내 기술·아이디어로 돈을 버는 데 유리합니다.');
  if (counts[0] >= 3) wealthLines.push('비겁이 많아 경쟁자나 지인으로 인한 지출이 생기기 쉽습니다. 돈거래와 보증은 특히 조심하세요.');
  if (strong && wealth > 0) wealthLines.push('사주의 힘이 강해 큰 재물도 감당할 수 있는 그릇입니다. 사업·투자에서도 승부를 걸어볼 만합니다.');
  if (weak && wealth >= 2) wealthLines.push('재물에 비해 내 힘이 약한 편이라, 무리한 투자보다 안정적인 수입원을 우선하는 것이 좋습니다.');

  // 연애·결혼운
  const spouseGroup = gender === 'female' ? 3 : 2; // 여자: 관성, 남자: 재성
  const spouseName = gender === 'female' ? '관성(남편·연인의 별)' : '재성(아내·연인의 별)';
  const sc = counts[spouseGroup];
  const dayBranchGod = saju.tenGods.day.branch;
  const loveLines = [];
  if (sc === 0) loveLines.push(`원국에 ${spouseName}이 드러나 있지 않아 인연이 늦게 오거나, 연애보다 일·자기 계발에 마음이 더 가는 편입니다. 운에서 해당 기운이 들어오는 해에 좋은 인연을 만나기 쉽습니다.`);
  else if (sc >= 3) loveLines.push(`${spouseName}이 많아 이성에게 인기가 있고 인연의 기회도 많습니다. 그만큼 선택이 어려울 수 있으니 신중한 판단이 필요합니다.`);
  else loveLines.push(`${spouseName}이 알맞게 있어 인연을 자연스럽게 만나고 관계를 안정적으로 이어가는 편입니다.`);
  const spouseSeat = {
    비겁: '배우자 자리에 비겁이 있어 친구 같은 동등한 관계를 원합니다. 서로의 영역을 존중하는 것이 오래가는 비결입니다.',
    식상: '배우자 자리에 식상이 있어 다정하고 표현이 풍부한 관계를 만듭니다. 말로 상처 주지 않도록 주의하세요.',
    재성: '배우자 자리에 재성이 있어 현실적이고 살림을 잘 꾸리는 배우자와 인연이 깊습니다.',
    관성: '배우자 자리에 관성이 있어 책임감 있고 믿음직한 배우자를 만나는 경향이 있습니다.',
    인성: '배우자 자리에 인성이 있어 나를 이해하고 돌봐 주는 배우자와 인연이 깊습니다.',
  };
  loveLines.push(spouseSeat[GROUPS[GROUP_OF[dayBranchGod]]]);

  // 건강
  const el = saju.elements;
  const minEl = el.indexOf(Math.min(...el));
  const maxEl = el.indexOf(Math.max(...el));
  const ELN = ['목(木)', '화(火)', '토(土)', '금(金)', '수(水)'];
  const healthLines = [
    `${ELN[minEl]} 기운이 가장 약해 <b>${HEALTH[minEl].organ}</b> 쪽을 미리 챙기면 좋습니다. ${HEALTH[minEl].tip}`,
    el[maxEl] >= 3 ? `${ELN[maxEl]} 기운이 많아 ${HEALTH[maxEl].organ} 쪽이 과로하기 쉽습니다.` : '',
  ].filter(Boolean);

  // 대인관계
  const socialLines = [];
  if (counts[0] >= 2) socialLines.push('형제·친구 같은 수평적인 관계에서 힘을 얻습니다. 다만 경쟁 관계에서는 양보가 어려울 수 있어요.');
  if (counts[4] >= 2) socialLines.push('윗사람·스승의 도움을 받기 쉬운 구조입니다. 조언을 구하는 것을 어려워하지 마세요.');
  if (counts[1] >= 2) socialLines.push('재치 있는 말과 배려로 분위기를 이끕니다. 후배나 아랫사람을 잘 챙깁니다.');
  if (counts[3] >= 2) socialLines.push('예의와 원칙을 중시해 신뢰를 얻습니다. 때로는 너무 엄격해 보일 수 있어요.');
  if (counts[2] >= 2) socialLines.push('사람을 실속 있게 연결하는 능력이 있어 인맥이 곧 기회가 됩니다.');
  if (!socialLines.length) socialLines.push('넓은 관계보다 소수의 깊은 관계를 선호하는 편입니다.');
  if (missing.includes('인성')) socialLines.push('인성이 없어 남의 도움보다 스스로 길을 개척하는 경우가 많습니다.');

  return {
    counts,
    total,
    sections: [
      career,
      { title: '재물운', lines: wealthLines },
      { title: '연애·결혼운', lines: loveLines },
      { title: '대인관계', lines: socialLines },
      { title: '건강', lines: healthLines },
    ],
  };
}

// ---------- 신살 ----------

// 삼합 그룹 (지지 → 그룹 0:申子辰 1:寅午戌 2:巳酉丑 3:亥卯未)
const SANHAP = [0, 2, 1, 3, 0, 2, 1, 3, 0, 2, 1, 3];
const DOHWA = [9, 3, 6, 0];
const YEOKMA = [2, 8, 11, 5];
const HWAGAE = [4, 10, 1, 7];
const CHEONEUL = [[1, 7], [0, 8], [11, 9], [11, 9], [1, 7], [0, 8], [1, 7], [2, 6], [5, 3], [5, 3]];
const MUNCHANG = [5, 6, 8, 9, 8, 9, 11, 0, 2, 3];
const YANGIN = { 0: 3, 2: 6, 4: 6, 6: 9, 8: 0 };

const SINSAL_INFO = {
  천을귀인: '하늘이 돕는 귀인의 별. 어려울 때 도와주는 사람이 나타나고 위기를 잘 넘깁니다.',
  문창귀인: '총명함과 학업의 별. 공부·시험·글쓰기에 재능이 있습니다.',
  도화살: '사람을 끄는 매력의 별. 인기가 많고 예술·연예·서비스 분야에 유리합니다.',
  역마살: '이동과 변화의 별. 여행·출장·이사·해외와 인연이 많고 한곳에 머물기보다 움직일 때 운이 트입니다.',
  화개살: '예술과 정신세계의 별. 종교·철학·예술적 감수성이 깊고 혼자만의 시간이 필요합니다.',
  양인살: '강한 추진력과 결단의 별. 위기에 강하지만 성급함과 다툼을 조심해야 합니다.',
};

export function sinsal(saju) {
  const ps = saju.pillars;
  const entries = Object.entries(ps).filter(([, p]) => p);
  const found = [];
  const add = (name, where) => {
    const f = found.find((x) => x.name === name);
    if (f) { if (!f.where.includes(where)) f.where.push(where); } else found.push({ name, where: [where], desc: SINSAL_INFO[name] });
  };
  const dayStem = ps.day.stem;
  for (const [k, p] of entries) {
    if (CHEONEUL[dayStem].includes(p.branch)) add('천을귀인', PILLAR_LABEL[k]);
    if (MUNCHANG[dayStem] === p.branch) add('문창귀인', PILLAR_LABEL[k]);
    if (YANGIN[dayStem] === p.branch) add('양인살', PILLAR_LABEL[k]);
  }
  // 도화·역마·화개: 연지·일지 기준
  for (const baseKey of ['year', 'day']) {
    const g = SANHAP[ps[baseKey].branch];
    for (const [k, p] of entries) {
      if (k === baseKey) continue;
      if (p.branch === DOHWA[g]) add('도화살', PILLAR_LABEL[k]);
      if (p.branch === YEOKMA[g]) add('역마살', PILLAR_LABEL[k]);
      if (p.branch === HWAGAE[g]) add('화개살', PILLAR_LABEL[k]);
    }
  }
  return found;
}

// ---------- 합·충 ----------

const YUKHAP = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
const isYukhap = (a, b) => YUKHAP.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
const isChung = (a, b) => cyc(a - b, 12) === 6;
const isStemHap = (a, b) => Math.abs(a - b) === 5;

const PAIR_MEANING = {
  'year-month': '집안·부모와의 관계',
  'month-day': '사회생활과 나',
  'day-hour': '나와 자녀·말년',
  'year-day': '조상·고향과 나',
  'year-hour': '초년과 말년',
  'month-hour': '부모와 자녀',
};

export function relations(saju) {
  const keys = ['year', 'month', 'day', 'hour'].filter((k) => saju.pillars[k]);
  const out = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = saju.pillars[keys[i]];
      const b = saju.pillars[keys[j]];
      const where = `${PILLAR_LABEL[keys[i]]}–${PILLAR_LABEL[keys[j]]}`;
      const meaning = PAIR_MEANING[`${keys[i]}-${keys[j]}`];
      if (isStemHap(a.stem, b.stem)) out.push({ type: '천간합', text: `${where} ${STEMS[a.stem]}${STEMS[b.stem]}합 — ${meaning}에서 서로 끌어당기고 화합하는 기운이 있습니다.` });
      if (isYukhap(a.branch, b.branch)) out.push({ type: '육합', text: `${where} ${BRANCHES[a.branch]}${BRANCHES[b.branch]}합 — ${meaning}이(가) 원만하고 서로 돕는 인연입니다.` });
      if (isChung(a.branch, b.branch)) out.push({ type: '충', text: `${where} ${BRANCHES[a.branch]}${BRANCHES[b.branch]}충 — ${meaning}에서 변화와 이동이 잦습니다. 갈등보다는 변화의 에너지로 쓰면 좋습니다.` });
    }
  }
  return out;
}

// ---------- 월별 운세 ----------

const MONTH_START = ['2월 4일경', '3월 6일경', '4월 5일경', '5월 6일경', '6월 6일경', '7월 7일경', '8월 8일경', '9월 8일경', '10월 8일경', '11월 7일경', '12월 7일경', '1월 6일경'];

const MONTH_TEXT = {
  비겁: '사람이 모이고 경쟁도 생기는 달. 협력하되 돈 관리는 철저히.',
  식상: '재능과 표현력이 빛나는 달. 새로운 시도와 발표에 좋습니다.',
  재성: '재물과 실속을 챙기기 좋은 달. 계약·거래에 관심을 가져 보세요.',
  관성: '책임과 평가가 따르는 달. 원칙을 지키면 인정받습니다.',
  인성: '배움과 도움이 들어오는 달. 공부·자격·문서 일에 유리합니다.',
};

export function monthlyFortune(saju, year) {
  const ys = cyc(year - 4, 10);
  const helpful = saju.strength.helpful;
  const dm = saju.dayMaster;
  const dayBranch = saju.pillars.day.branch;
  const list = [];
  for (let m = 0; m < 12; m++) {
    const stem = cyc(ys * 2 + 2 + m, 10);
    const branch = (m + 2) % 12;
    const god = tenGod(dm, stem);
    const group = GROUPS[GROUP_OF[god]];
    let score = 3;
    if (helpful.includes(stemElement(stem))) score++;
    if (helpful.includes(BRANCH_ELEMENT[branch])) score++;
    if (!helpful.includes(stemElement(stem)) && !helpful.includes(BRANCH_ELEMENT[branch])) score--;
    let note = '';
    if (isChung(branch, dayBranch)) { score--; note = ' 일지와 충이 있어 이동·변동수가 있습니다.'; }
    if (isYukhap(branch, dayBranch)) { score++; note = ' 일지와 합이 들어 좋은 인연이 생기기 쉽습니다.'; }
    list.push({
      label: `${m === 11 ? '다음 해 ' : ''}${MONTH_START[m]}~`,
      ganzi: STEMS[stem] + BRANCHES[branch],
      god,
      score: Math.max(1, Math.min(5, score)),
      text: MONTH_TEXT[group] + note,
    });
  }
  return list;
}

// ---------- 대운별 한 줄 풀이 ----------

const DW_TEXT = {
  비겁: '독립과 경쟁의 시기. 스스로 길을 개척하지만 재물 관리에 신경 써야 합니다.',
  식상: '재능을 펼치고 표현하는 시기. 창작·사업 아이디어가 결실을 맺습니다.',
  재성: '재물과 현실 성과의 시기. 돈과 일, 결혼 등 현실적인 변화가 큽니다.',
  관성: '사회적 지위와 책임의 시기. 승진·직장·명예의 변화가 있습니다.',
  인성: '배움과 내실의 시기. 공부·자격·귀인의 도움으로 기반을 다집니다.',
};

export function daewoonReading(saju, dw) {
  const dm = saju.dayMaster;
  const god = tenGod(dm, dw.stem);
  const bgod = tenGod(dm, BRANCH_MAIN_STEM[dw.branch]);
  const helpful = saju.strength.helpful;
  let tone = 0;
  if (helpful.includes(stemElement(dw.stem))) tone++;
  if (helpful.includes(BRANCH_ELEMENT[dw.branch])) tone++;
  const toneText = tone === 2 ? '순풍이 부는 좋은 흐름' : tone === 1 ? '무난하게 흘러가는 흐름' : '노력이 더 필요한 단련의 흐름';
  let extra = '';
  if (isChung(dw.branch, saju.pillars.day.branch)) extra = ' 일지와 충이 있어 이사·이직 등 환경 변화가 생기기 쉽습니다.';
  else if (isYukhap(dw.branch, saju.pillars.day.branch)) extra = ' 일지와 합이 있어 인연·결혼 등 관계에 좋은 변화가 있습니다.';
  return { god, bgod, toneText, text: DW_TEXT[GROUPS[GROUP_OF[god]]] + extra };
}

// ---------- 오늘의 운세 (분야별) ----------

const DAILY = {
  비겁: { money: '지출이 늘기 쉬운 날. 충동구매를 조심하세요.', love: '친구 같은 편안한 만남이 좋습니다.', work: '동료와 힘을 합치면 성과가 납니다.', advice: '고집보다 양보가 이기는 날' },
  식상: { money: '재능을 활용한 부수입 기회가 보입니다.', love: '표현을 아끼지 마세요. 마음이 잘 전해집니다.', work: '아이디어 회의·발표에 강한 날입니다.', advice: '말 한마디에 복이 들어오고 나갑니다' },
  재성: { money: '금전 흐름이 활발합니다. 계산은 꼼꼼하게.', love: '이성 인연이 들어오기 쉬운 날입니다.', work: '실속 있는 결과를 챙길 수 있습니다.', advice: '작은 이익보다 큰 신뢰를 챙기세요' },
  관성: { money: '큰돈을 움직이기보다 지키는 날입니다.', love: '진지한 대화가 관계를 깊게 만듭니다.', work: '평가와 책임이 따릅니다. 원칙대로 하면 인정받습니다.', advice: '규칙을 지키는 것이 최고의 전략' },
  인성: { money: '문서·계약 관련 일이 유리합니다.', love: '배려받는 따뜻한 날입니다.', work: '공부와 정리, 계획 세우기에 좋은 날입니다.', advice: '배우는 자세가 행운을 부릅니다' },
};

export function dailyDetail(god) {
  return DAILY[GROUPS[GROUP_OF[god]]];
}

