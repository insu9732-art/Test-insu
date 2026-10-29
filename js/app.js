import {
  STEMS, STEMS_KO, BRANCHES, BRANCHES_KO, ZODIAC, ELEMENTS_HANJA, BRANCH_ELEMENT, BRANCH_MAIN_STEM,
  stemElement, calculateSaju, lunarToSolar, solarToLunar, tenGod, pillarName, surroundingJie,
  yearPillarOf, todayPillar,
} from './saju.js';
import { tojungOf } from './tojung.js';
import { DREAM_CATEGORIES, DREAM_COUNT, searchDreams } from './dreams.js';
import { SYMBOLS, GEN_COUNT, kindLabel, actionsFor, modifiersFor, interpret, searchGenerated } from './dream-gen.js';
import { hanjaFor, analyzeName, suggestNames, soundElement, ELEMENT_NAMES } from './naming.js';
import { APP_CONFIG, COUPANG_NOTICE } from './config.js';
import { ZODIAC_LIFE } from './zodiac-life.js';
import { lifeReading, sinsal, relations, monthlyFortune, daewoonReading, dailyDetail } from './reading.js';
import { DAY_MASTER, ELEMENT_INFO, TEN_GOD_INFO, STRENGTH_INFO, PILLAR_MEANING } from './content.js';

const $ = (s) => document.querySelector(s);
const STORAGE_KEY = 'saju.profiles.v1';

const form = $('#sajuForm');
const views = {
  home: $('#homeView'), input: $('#inputView'), result: $('#resultView'),
  dream: $('#dreamView'), naming: $('#namingView'), saved: $('#savedView'),
  manse: $('#manseView'), settings: $('#settingsView'),
};
const VIEW_TITLE = {
  home: '준비', input: '생년월일시를 입력하세요', result: '사주 풀이', dream: '꿈해몽',
  naming: '작명소', saved: '보관함', manse: '만세력', settings: '설정',
};
let current = null; // { profile, saju, solar }
let activeTab = 'chart';
let pendingTab = 'chart'; // 입력 후 처음 보여 줄 탭
const navStack = ['home'];

// ---------- 화면 전환 ----------

function show(name, { push = true } = {}) {
  for (const [k, el] of Object.entries(views)) el.hidden = k !== name;
  if (push && navStack[navStack.length - 1] !== name) navStack.push(name);
  $('#backBtn').style.visibility = navStack.length > 1 ? 'visible' : 'hidden';
  $('#statusText').textContent = VIEW_TITLE[name] || '준비';
  document.querySelectorAll('.menubar button').forEach((b) => b.classList.toggle('active', b.dataset.go === name || (name === 'result' && b.dataset.go === 'input')));
  if (name === 'saved') renderSaved();
  if (name === 'dream') renderDreams();
  window.scrollTo(0, 0);
}

function goBack() {
  if (navStack.length <= 1) return false;
  navStack.pop();
  show(navStack[navStack.length - 1], { push: false });
  return true;
}

function go(target, tab) {
  if (target === 'today') {
    if (current) { activeTab = 'fortune'; renderTab(); show('result'); } else { pendingTab = 'fortune'; show('input'); }
    return;
  }
  if (LOCKED_VIEWS[target] && !isUnlocked()) {
    requireUnlock(tab === 'tojung' ? '토정비결' : LOCKED_VIEWS[target], () => go(target, tab));
    return;
  }
  if (target === 'input') {
    pendingTab = tab || 'chart';
    if (current && tab) { activeTab = tab; renderTab(); show('result'); return; }
  }
  if (target === 'home') navStack.length = 0;
  if (target === 'naming') prepareNaming();
  if (target === 'manse' && !$('#manseResult').innerHTML) showManse(todayBirth());
  if (target === 'settings') fillSettings();
  show(target);
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-go]');
  if (b) go(b.dataset.go, b.dataset.tab);
});
$('#backBtn').addEventListener('click', goBack);
$('#homeBtn').addEventListener('click', () => go('home'));
$('#newBtn').addEventListener('click', () => { pendingTab = activeTab; show('input'); });
$('#cancelBtn').addEventListener('click', goBack);

// 상태 표시줄 날짜: 2026년 10월 29일 (목)
(() => {
  const d = new Date();
  const w = '일월화수목금토'[d.getDay()];
  $('#statusDate').textContent = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${w})`;
})();

// 안드로이드 뒤로 가기 버튼: 앱 안에서 이전 화면으로, 첫 화면이면 false (앱 종료)
window.handleAndroidBack = () => goBack();

// ---------- 입력 폼 ----------

const isLunar = () => form.calendar.value.startsWith('lunar');
const isLeap = () => form.calendar.value === 'lunar-leap';
const pad2 = (n) => String(n).padStart(2, '0');
let sijin = null; // null: 미선택, -1: 모름, 0~11: 子~亥시

// 시진 범위 (보정 켜면 30분씩 늦춰진 한국 표준시 기준)
function sijinRange(i) {
  const shift = form.correction.checked ? 30 : 0;
  const start = (i * 120 - 60 + shift + 1440) % 1440;
  const end = (start + 119) % 1440;
  const f = (m) => `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
  return `${f(start)}~${f(end)}`;
}

function renderSijin() {
  const grid = $('#sijinGrid');
  grid.innerHTML = BRANCHES_KO.map((b, i) => `
    <button type="button" role="radio" data-i="${i}" aria-checked="${sijin === i}">
      ${b}시 <small>${sijinRange(i)}</small>
    </button>`).join('')
    + `<button type="button" role="radio" data-i="-1" class="unknown" aria-checked="${sijin === -1}">시간 모름</button>`;
}

$('#sijinGrid').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  sijin = Number(btn.dataset.i);
  form.birthTime.value = '';
  renderSijin();
});

// 숫자만 입력해도 되도록: 19810129 → 1981.01.29
function parseDate(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  return { y: +digits.slice(0, 4), m: +digits.slice(4, 6), d: +digits.slice(6, 8) };
}

function parseTime(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 3 || digits.length > 4) return null;
  const h = +digits.slice(0, digits.length - 2);
  const m = +digits.slice(-2);
  if (h > 23 || m > 59) return null;
  return { h, m };
}

function isValidSolar({ y, m, d }) {
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

// 입력한 날짜를 확인할 수 있게 아래에 보여준다
function updateDateHint() {
  const hint = $('#dateHint');
  const digits = form.birthDate.value.replace(/\D/g, '').slice(0, 8);
  form.birthDate.value = [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean).join('.');
  hint.classList.remove('bad');
  const date = parseDate(digits);
  if (!date) { hint.textContent = ''; return null; }
  if (date.y < 1900 || date.y > 2100) {
    hint.textContent = '1900년 ~ 2100년 사이로 입력해 주세요';
    hint.classList.add('bad');
    return null;
  }
  if (!form.calendar.value) {
    hint.textContent = '양력/음력 중 하나를 눌러 주세요';
    hint.classList.add('bad');
    return null;
  }
  if (isLunar()) {
    const solar = date.m >= 1 && date.m <= 12 ? lunarToSolar(date.y, date.m, date.d, isLeap()) : null;
    if (!solar) {
      hint.textContent = `음력 ${date.y}년 ${isLeap() ? '윤' : ''}${date.m}월 ${date.d}일은 없는 날짜예요`;
      hint.classList.add('bad');
      return null;
    }
    hint.textContent = `음력 ${date.y}년 ${isLeap() ? '윤' : ''}${date.m}월 ${date.d}일 → 양력 ${solar.year}년 ${solar.month}월 ${solar.day}일`;
  } else {
    if (!isValidSolar(date)) {
      hint.textContent = `${date.y}년 ${date.m}월 ${date.d}일은 없는 날짜예요`;
      hint.classList.add('bad');
      return null;
    }
    const lunar = solarToLunar(date.y, date.m, date.d);
    hint.textContent = `양력 ${date.y}년 ${date.m}월 ${date.d}일 (음력 ${lunar.leap ? '윤' : ''}${lunar.month}월 ${lunar.day}일)`;
  }
  return date;
}

form.birthDate.addEventListener('input', updateDateHint);
form.calendar.forEach((r) => r.addEventListener('change', updateDateHint));
form.correction.addEventListener('change', () => { syncExactTime(); renderSijin(); });

// 정확한 시각을 입력하면 해당 시진을 표시
function syncExactTime() {
  const t = parseTime(form.birthTime.value);
  if (!t) return;
  const mins = t.h * 60 + t.m + (form.correction.checked ? -30 : 0);
  sijin = Math.floor(((mins + 60 + 1440) % 1440) / 120);
}
form.birthTime.addEventListener('input', () => {
  const digits = form.birthTime.value.replace(/\D/g, '').slice(0, 4);
  form.birthTime.value = digits.length > 2 ? `${digits.slice(0, digits.length - 2)}:${digits.slice(-2)}` : digits;
  if (parseTime(digits)) syncExactTime();
  else if (sijin !== -1 && digits.length === 0) sijin = null;
  renderSijin();
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  $('#formError').textContent = '';
  if (!form.birthDate.value.trim()) return fail('생년월일 8자리를 입력해 주세요. 예) 19810129');
  const date = updateDateHint();
  if (!date) return fail($('#dateHint').textContent || '생년월일 8자리를 입력해 주세요. 예) 19810129');

  let time = null;
  const exact = parseTime(form.birthTime.value);
  if (exact) time = `${pad2(exact.h)}:${pad2(exact.m)}`;
  else if (form.birthTime.value.trim()) return fail('시각은 4자리로 입력해 주세요. 예) 1430');
  else if (sijin === null) return fail('태어난 시간을 골라 주세요. 모르면 “시간 모름”을 누르세요.');
  else if (sijin >= 0) time = `${pad2((sijin * 2) % 24)}:${form.correction.checked ? '30' : '00'}`;

  const profile = {
    id: Date.now().toString(36),
    name: form.name.value.trim(),
    gender: form.gender.value,
    calendar: isLunar() ? 'lunar' : 'solar',
    leap: isLeap(),
    date,
    time,
    sijin: !exact && sijin >= 0 ? sijin : null,
    correction: form.correction.checked,
  };
  requireUnlock('사주풀이', () => {
    const ok = openProfile(profile);
    if (!ok) fail('해당 음력 날짜를 찾을 수 없어요. 윤달 여부를 확인해 주세요.');
  });
});

renderSijin();

function fail(msg) {
  $('#formError').textContent = msg;
}

function openProfile(profile) {
  let solar = { year: profile.date.y, month: profile.date.m, day: profile.date.d };
  if (profile.calendar === 'lunar') {
    solar = lunarToSolar(profile.date.y, profile.date.m, profile.date.d, profile.leap);
    if (!solar) return false;
  }
  const [hh, mm] = profile.time ? profile.time.split(':').map(Number) : [null, null];
  const saju = calculateSaju({
    ...solar,
    hour: hh,
    minute: mm,
    gender: profile.gender,
    longitudeCorrection: profile.correction ? -30 : 0,
  });
  current = { profile, saju, solar };
  activeTab = pendingTab || 'chart';
  renderResult();
  show('result');
  return true;
}

// ---------- 결과 렌더링 ----------

document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => {
  activeTab = b.dataset.tab;
  renderTab();
}));

function renderResult() {
  const { profile, saju, solar } = current;
  const lunar = solarToLunar(solar.year, solar.month, solar.day);
  const dm = saju.dayMaster;
  const dateStr = `양력 ${solar.year}.${solar.month}.${solar.day}`;
  const lunarStr = lunar ? ` · 음력 ${lunar.year}.${lunar.leap ? '윤' : ''}${lunar.month}.${lunar.day}` : '';
  const timeStr = profile.sijin != null
    ? `${BRANCHES_KO[profile.sijin]}시 출생${saju.dst ? ' · 서머타임 반영' : ''}`
    : profile.time
    ? `${profile.time} 출생${saju.localTime ? ` (보정 ${saju.localTime})` : ''}${saju.dst ? ' · 서머타임 반영' : ''}`
    : '시간 모름';
  $('#profileCard').innerHTML = `
    <h2>${esc(profile.name || '나')}의 사주 <span class="tag">${profile.gender === 'male' ? '남' : '여'}</span></h2>
    <p>${dateStr}${lunarStr}</p>
    <p>${timeStr}</p>
    <p>${zodiacText(saju, lunar)} · 일간 <b>${STEMS[dm]}(${STEMS_KO[dm]}${ELEMENTS_HANJA[stemElement(dm)]})</b> · ${saju.strength.label}</p>
  `;
  renderTab();
}

// 사주는 입춘 기준으로 해가 바뀌지만, 흔히 말하는 띠는 설날 기준이라 둘이 다르면 함께 알려준다
function zodiacText(saju, lunar) {
  const byLunar = lunar ? ZODIAC[(((lunar.year - 4) % 12) + 12) % 12] : saju.zodiac;
  return byLunar === saju.zodiac
    ? `${saju.zodiac}띠`
    : `${byLunar}띠 (사주는 입춘 기준 ${saju.zodiac}해)`;
}

function renderTab() {
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === activeTab));
  const html = { chart: tabChart, elements: tabElements, personality: tabPersonality, life: tabLife, tojung: tabTojung, daewoon: tabDaewoon, fortune: tabFortune }[activeTab]();
  $('#tabContent').innerHTML = html;
  const cur = $('#tabContent .dw-item.current');
  if (cur) cur.scrollIntoView({ inline: 'center', block: 'nearest' });
}

function charBox(stemOrBranch, isStem) {
  const el = isStem ? stemElement(stemOrBranch) : BRANCH_ELEMENT[stemOrBranch];
  const hanja = isStem ? STEMS[stemOrBranch] : BRANCHES[stemOrBranch];
  const ko = isStem ? STEMS_KO[stemOrBranch] : BRANCHES_KO[stemOrBranch];
  return `<div class="char el-${el}">${hanja}<small>${ko}·${ELEMENTS_HANJA[el]}</small></div>`;
}

function tabChart() {
  const { saju } = current;
  const order = ['hour', 'day', 'month', 'year'];
  const cols = order.map((k) => {
    const p = saju.pillars[k];
    const g = saju.tenGods[k];
    return `
      <div>
        <div class="pillar-head">${PILLAR_MEANING[k].label}</div>
        <div class="god">${g ? g.stem : '-'}</div>
        ${p ? charBox(p.stem, true) : '<div class="char empty">?</div>'}
        <div style="height:6px"></div>
        ${p ? charBox(p.branch, false) : '<div class="char empty">?</div>'}
        <div class="god">${g ? g.branch : '-'}</div>
        <div class="pillar-sub">${PILLAR_MEANING[k].desc}</div>
      </div>`;
  }).join('');

  const godCounts = {};
  for (const k of order) {
    const g = saju.tenGods[k];
    if (!g) continue;
    if (k !== 'day') godCounts[g.stem] = (godCounts[g.stem] || 0) + 1;
    godCounts[g.branch] = (godCounts[g.branch] || 0) + 1;
  }
  const godList = Object.entries(godCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([g, n]) => `<li><b>${g}</b> ${n}개 — ${TEN_GOD_INFO[g].meaning}</li>`)
    .join('');

  return `
    <div class="card">
      <h3>사주팔자 (四柱八字)</h3>
      <div class="pillars">${cols}</div>
      ${saju.pillars.hour ? '' : '<p class="note" style="margin-top:10px">시간을 몰라 시주는 비워 두었습니다.</p>'}
    </div>
    <div class="card">
      <h3>십신(十神) 구성</h3>
      <p class="note" style="text-align:left">일간(나)을 기준으로 다른 글자와의 관계를 나타냅니다.</p>
      <ul>${godList}</ul>
    </div>`;
}

function tabElements() {
  const { saju } = current;
  const counts = saju.elements;
  const total = counts.reduce((a, b) => a + b, 0);
  const colors = ['var(--wood)', 'var(--fire)', 'var(--earth)', 'var(--metal)', 'var(--water)'];
  const bars = counts.map((c, i) => `
    <div class="bar-row">
      <span>${ELEMENT_INFO[i].name}</span>
      <div class="bar"><i style="width:${(c / total) * 100}%;background:${colors[i]}"></i></div>
      <b>${c}</b>
    </div>`).join('');

  const lacking = counts.map((c, i) => (c === 0 ? i : -1)).filter((i) => i >= 0);
  const excess = counts.map((c, i) => (c >= Math.max(3, Math.ceil(total * 0.4)) ? i : -1)).filter((i) => i >= 0);

  const advice = [
    ...lacking.map((i) => `<p><b>${ELEMENT_INFO[i].name} 부족</b> — ${ELEMENT_INFO[i].lack}</p>`),
    ...excess.map((i) => `<p><b>${ELEMENT_INFO[i].name} 과다</b> — ${ELEMENT_INFO[i].excess}</p>`),
  ].join('') || '<p>오행이 비교적 고르게 분포되어 있습니다. 균형 잡힌 사주예요.</p>';

  const helpful = saju.strength.helpful.map((i) => ELEMENT_INFO[i]);
  return `
    <div class="card">
      <h3>오행 분포</h3>
      <div class="bars">${bars}</div>
    </div>
    <div class="card">
      <h3>오행 진단</h3>
      ${advice}
    </div>
    <div class="card">
      <h3>나에게 힘이 되는 기운</h3>
      <p>${STRENGTH_INFO[saju.strength.label]}</p>
      ${helpful.map((e) => `
        <dl class="kv" style="margin-top:12px">
          <dt>오행</dt><dd><b>${e.name}</b> · ${e.keyword}</dd>
          <dt>행운 색</dt><dd>${e.color}</dd>
          <dt>방향</dt><dd>${e.direction}</dd>
          <dt>숫자</dt><dd>${e.numbers}</dd>
        </dl>`).join('')}
      <p class="note" style="text-align:left;margin-top:12px">신강·신약과 용신은 간이 계산으로 추정한 값입니다.</p>
    </div>`;
}

function lunarBirth() {
  const { solar } = current;
  return solarToLunar(solar.year, solar.month, solar.day);
}

function tabPersonality() {
  const { saju } = current;
  const info = DAY_MASTER[saju.dayMaster];
  const dayBranch = saju.pillars.day.branch;
  const spouseGod = tenGod(saju.dayMaster, BRANCH_MAIN_STEM[dayBranch]);
  const monthGod = saju.tenGods.month.branch;
  return `
    <div class="card">
      <h3>${info.title}</h3>
      <p>${info.summary}</p>
      <p><b>강점</b></p>
      <ul>${info.strengths.map((s) => `<li>${s}</li>`).join('')}</ul>
      <p style="margin-top:8px"><b>주의할 점</b></p>
      <ul>${info.cautions.map((s) => `<li>${s}</li>`).join('')}</ul>
    </div>
    <div class="card">
      <h3>사회적 성향 (월지 ${monthGod})</h3>
      <p>${TEN_GOD_INFO[monthGod].short} — <b>${TEN_GOD_INFO[monthGod].meaning}</b>이(가) 사회생활의 바탕이 됩니다.</p>
    </div>
    <div class="card">
      <h3>배우자 자리 (일지 ${BRANCHES[dayBranch]} · ${spouseGod})</h3>
      <p>배우자 자리에 <b>${spouseGod}</b>(${TEN_GOD_INFO[spouseGod].meaning})이(가) 있어, 관계에서도 이런 기운을 주고받는 경향이 있습니다.</p>
    </div>
    ${zodiacLifeCard()}`;
}

function tabLife() {
  const { saju, profile } = current;
  const life = lifeReading(saju, profile.gender);
  const colors = ['var(--wood)', 'var(--fire)', 'var(--earth)', 'var(--metal)', 'var(--water)'];
  const groupNames = ['비겁 (나·동료)', '식상 (재능·표현)', '재성 (재물)', '관성 (직장·명예)', '인성 (학문·도움)'];
  // 십신 그룹 색은 해당 그룹의 오행 색으로 (일간 오행부터 순서대로)
  const dEl = stemElement(saju.dayMaster);
  const bars = life.counts.map((c, i) => `
    <div class="bar-row wide">
      <span>${groupNames[i]}</span>
      <div class="bar"><i style="width:${(c / life.total) * 100}%;background:${colors[(dEl + i) % 5]}"></i></div>
      <b>${c}</b>
    </div>`).join('');
  const ss = sinsal(saju);
  const rel = relations(saju);
  return `
    <div class="card">
      <h3>십신 균형</h3>
      <div class="bars">${bars}</div>
    </div>
    ${life.sections.map((sec) => `
      <div class="card">
        <h3>${sec.title}</h3>
        ${sec.lines.map((l) => `<p>${l}</p>`).join('')}
      </div>`).join('')}
    <div class="card">
      <h3>신살 (타고난 특별한 기운)</h3>
      ${ss.length ? ss.map((x) => `<p><span class="tag">${x.name}</span><small class="muted">${x.where.join('·')}</small><br />${x.desc}</p>`).join('')
        : '<p>두드러진 신살이 없는 담백한 사주입니다. 특별한 굴곡 없이 스스로의 노력으로 길을 만듭니다.</p>'}
    </div>
    <div class="card">
      <h3>합과 충 (기둥끼리의 관계)</h3>
      ${rel.length ? rel.map((r) => `<p><span class="tag">${r.type}</span>${r.text}</p>`).join('')
        : '<p>기둥끼리 큰 합이나 충이 없어 비교적 안정적인 구조입니다.</p>'}
    </div>`;
}

function zodiacLifeCard() {
  const lunar = lunarBirth();
  const b = (((lunar.year - 4) % 12) + 12) % 12;
  const z = ZODIAC_LIFE[b];
  return `
    <div class="card">
      <h3>${ZODIAC[b]}띠 평생운 · ${z.image}</h3>
      <p>${z.nature}</p>
      <p><b>인생의 흐름</b><br />${z.flow}</p>
      <p><b>삶의 조언</b><br />${z.advice}</p>
    </div>`;
}

let tojungYear = new Date().getFullYear();

function tabTojung() {
  const lunar = lunarBirth();
  const t = tojungOf(lunar, tojungYear);
  const thisYear = new Date().getFullYear();
  const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
  const yp = yearPillarOf(tojungYear);
  return `
    <div class="year-switch">
      ${[thisYear, thisYear + 1].map((y) => `<button type="button" data-year="${y}" class="${y === tojungYear ? 'active' : ''}">${y}년</button>`).join('')}
    </div>
    <div class="card">
      <h3>${tojungYear}년 토정비결 · ${pillarName(yp)}(${pillarName(yp, 'ko')})년</h3>
      <p class="note" style="text-align:left">음력 ${lunar.month}월 ${lunar.day}일생 · ${t.age}세 · ${t.code}괘</p>
      ${t.verseKo ? `<p class="verse">${t.verseKo}${t.verseHanja ? `<small>${t.verseHanja}</small>` : ''}</p>` : ''}
      <div class="fortune-big">${stars(t.score)}</div>
      <p>${t.total}</p>
    </div>
    <div class="card">
      <h3>달마다 보는 운세 (음력)</h3>
      ${t.months.map((m, i) => `<div class="month-row">
        <div class="month-head"><b>${i + 1}월</b><span class="stars">${stars(m.score)}</span></div>
        <p>${m.text}</p>
      </div>`).join('')}
    </div>
    <p class="note">토정비결은 이지함 선생의 비결을 바탕으로 한 전통 신수풀이이며, 풀이 문장은 이 앱에서 새로 썼습니다.</p>`;
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('.year-switch button');
  if (!b) return;
  tojungYear = Number(b.dataset.year);
  renderTab();
});

function tabDaewoon() {
  const { saju, solar } = current;
  const { daewoon } = saju;
  const age = new Date().getFullYear() - solar.year + 1;
  const items = daewoon.list.map((p, i) => {
    const next = daewoon.list[i + 1];
    const isCur = age >= p.age && (!next || age < next.age);
    return `
      <div class="dw-item${isCur ? ' current' : ''}">
        <div class="age">${p.age}세</div>
        ${charBox(p.stem, true)}
        ${charBox(p.branch, false)}
        <div class="yr">${p.year}~</div>
      </div>`;
  }).join('');
  const cur = [...daewoon.list].reverse().find((p) => age >= p.age);
  const curInfo = cur ? (() => {
    const g = tenGod(saju.dayMaster, cur.stem);
    const gb = tenGod(saju.dayMaster, BRANCH_MAIN_STEM[cur.branch]);
    return `
      <div class="card">
        <h3>현재 대운: ${pillarName(cur)} (${cur.age}세~)</h3>
        <p><span class="tag">천간 ${g}</span><span class="tag">지지 ${gb}</span></p>
        <p>${TEN_GOD_INFO[g].fortune}</p>
        <p>${TEN_GOD_INFO[gb].fortune}</p>
      </div>`;
  })() : '<div class="card"><p>아직 첫 대운이 시작되기 전입니다.</p></div>';

  return `
    <div class="card">
      <h3>대운 흐름 (10년 주기)</h3>
      <p class="note" style="text-align:left">${daewoon.forward ? '순행' : '역행'} · 대운수 ${daewoon.startAge} (한국 나이 기준)</p>
      <div class="dw-scroll">${items}</div>
    </div>
    ${curInfo}
    <div class="card">
      <h3>대운별 풀이</h3>
      ${daewoon.list.map((p, i) => {
        const r = daewoonReading(saju, p);
        const next = daewoon.list[i + 1];
        const isCur = age >= p.age && (!next || age < next.age);
        return `<div class="dw-row${isCur ? ' current' : ''}">
          <div class="dw-row-head"><b>${p.age}~${p.age + 9}세</b> ${pillarName(p)} <span class="tag">${r.god}</span><span class="muted">${r.toneText}</span></div>
          <p>${r.text}</p>
        </div>`;
      }).join('')}
    </div>`;
}

function tabFortune() {
  const { saju } = current;
  const dm = saju.dayMaster;
  const today = todayPillar();
  const year = new Date().getFullYear();
  const yp = yearPillarOf(year);
  const tg = tenGod(dm, today.stem);
  const yg = tenGod(dm, yp.stem);
  const ygb = tenGod(dm, BRANCH_MAIN_STEM[yp.branch]);
  const score = luckScore(today);
  const helpful = saju.strength.helpful[0];
  const daily = dailyDetail(tg);
  const months = monthlyFortune(saju, year);
  return `
    <div class="card">
      <h3>오늘의 운세 · ${pillarName(today)}(${pillarName(today, 'ko')})일</h3>
      <div class="fortune-big">${'★'.repeat(score)}${'☆'.repeat(5 - score)}</div>
      <p><span class="tag">${tg}</span> ${TEN_GOD_INFO[tg].short}</p>
      <p>${TEN_GOD_INFO[tg].fortune}</p>
      <dl class="kv" style="margin-top:10px">
        <dt>재물</dt><dd>${daily.money}</dd>
        <dt>애정</dt><dd>${daily.love}</dd>
        <dt>일·학업</dt><dd>${daily.work}</dd>
        <dt>한마디</dt><dd><b>${daily.advice}</b></dd>
      </dl>
      <dl class="kv" style="margin-top:10px">
        <dt>행운 색</dt><dd>${ELEMENT_INFO[helpful].color}</dd>
        <dt>행운 방향</dt><dd>${ELEMENT_INFO[helpful].direction}</dd>
        <dt>행운 숫자</dt><dd>${ELEMENT_INFO[helpful].numbers}</dd>
      </dl>
    </div>
    <div class="card">
      <h3>${year}년 세운 · ${pillarName(yp)}(${pillarName(yp, 'ko')})년</h3>
      <p><span class="tag">천간 ${yg}</span><span class="tag">지지 ${ygb}</span></p>
      <p>${TEN_GOD_INFO[yg].fortune}</p>
      <p>${TEN_GOD_INFO[ygb].fortune}</p>
    </div>
    <div class="card">
      <h3>${year}년 월별 운세</h3>
      <p class="note" style="text-align:left">사주의 달은 절기(입춘·경칩 …)로 바뀝니다.</p>
      ${months.map((m) => `<div class="month-row">
        <div class="month-head"><b>${m.label}</b> ${m.ganzi} <span class="tag">${m.god}</span><span class="stars">${'★'.repeat(m.score)}${'☆'.repeat(5 - m.score)}</span></div>
        <p>${m.text}</p>
      </div>`).join('')}
    </div>`;
}

// 오늘 일진이 나에게 도움이 되는 오행인지로 1~5점
function luckScore(today) {
  const { helpful } = current.saju.strength;
  let s = 3;
  if (helpful.includes(stemElement(today.stem))) s++;
  if (helpful.includes(BRANCH_ELEMENT[today.branch])) s++;
  const dEl = stemElement(current.saju.dayMaster);
  if (stemElement(today.stem) === (dEl + 3) % 5 && !helpful.includes((dEl + 3) % 5)) s--;
  return Math.max(1, Math.min(5, s));
}

// ---------- 저장/공유 ----------

// 저장소: claude.ai 미리보기에서는 계정별 비공개 저장(db), 그 외에는 기기(localStorage)
const store = (() => {
  let cloud = null;
  const ready = (async () => {
    try {
      if (!window.claude?.use) return;
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      const uid = db && user ? await user.id() : null;
      if (uid) cloud = db.collection(`data/users/${uid}/profiles`);
    } catch { cloud = null; }
  })();

  const local = {
    list() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } },
    write(list) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); return true; } catch { return false; } },
  };

  return {
    async list() {
      await ready;
      if (cloud) {
        try {
          const snap = await cloud.get();
          return snap.docs.map((d) => d.data()).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
        } catch { /* 기기 저장으로 */ }
      }
      return local.list();
    },
    async save(profile) {
      await ready;
      const item = { ...profile, savedAt: Date.now() };
      if (cloud) {
        try { await cloud.doc(item.id).set(item); return true; } catch { /* 기기 저장으로 */ }
      }
      return local.write([item, ...local.list().filter((p) => p.id !== item.id)].slice(0, 50));
    },
    async remove(id) {
      await ready;
      if (cloud) {
        try { await cloud.doc(id).delete(); return; } catch { /* 기기 저장으로 */ }
      }
      local.write(local.list().filter((p) => p.id !== id));
    },
  };
})();

$('#saveBtn').addEventListener('click', async () => {
  if (!current) return;
  toast(await store.save(current.profile) ? '저장했어요' : '이 화면에서는 저장할 수 없어요');
});

$('#shareBtn').addEventListener('click', async () => {
  if (!current) return;
  const { saju, profile } = current;
  const p = saju.pillars;
  const text = `${profile.name || '나'}의 사주팔자\n`
    + `시 ${p.hour ? pillarName(p.hour) : '??'} · 일 ${pillarName(p.day)} · 월 ${pillarName(p.month)} · 연 ${pillarName(p.year)}\n`
    + `${DAY_MASTER[saju.dayMaster].title} · ${saju.zodiac}띠 · ${saju.strength.label}`;
  if (window.AndroidBridge) { window.AndroidBridge.share(text); return; } // 안드로이드 앱
  if (navigator.share) {
    try { await navigator.share({ title: '인수토정비결', text, url: location.href }); return; } catch (e) {
      if (e && e.name === 'AbortError') return; // 사용자가 취소
    }
  }
  try { await navigator.clipboard.writeText(text); toast('복사했어요'); } catch { toast('복사할 수 없어요'); }
});

async function renderSaved() {
  const list = await store.list();
  const ul = $('#savedList');
  if (!list.length) {
    ul.innerHTML = '<li class="empty-msg" style="display:block;border:0;background:none">저장된 사주가 없어요</li>';
    return;
  }
  ul.innerHTML = list.map((p) => `
    <li>
      <button class="open" data-id="${p.id}">
        ${esc(p.name || '이름 없음')} (${p.gender === 'male' ? '남' : '여'})
        <small>${p.calendar === 'lunar' ? '음력' : '양력'} ${p.date.y}.${p.date.m}.${p.date.d}${p.leap ? '(윤)' : ''} ${p.sijin != null ? BRANCHES_KO[p.sijin] + '시' : p.time || '시간 모름'}</small>
      </button>
      <button class="del" data-id="${p.id}" aria-label="삭제">×</button>
    </li>`).join('');
  ul.querySelectorAll('.open').forEach((b) => b.addEventListener('click', () => {
    const p = list.find((x) => x.id === b.dataset.id);
    if (p) requireUnlock('사주풀이', () => openProfile(p));
  }));
  ul.querySelectorAll('.del').forEach((b) => b.addEventListener('click', async () => {
    await store.remove(b.dataset.id);
    renderSaved();
  }));
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- 꿈해몽 ----------

let dreamCat = '';
const LUCK_LABEL = ['흉몽', '보통', '길몽'];

// 사전 분류 → 조합 풀이 종류
const GEN_KINDS_OF = { 동물: ['동물'], 사람: ['사람'], 신체: ['신체'], 자연: ['자연'], '물건·장소': ['물건', '장소'], 음식: ['음식'] };
const DREAM_TOTAL = DREAM_COUNT + GEN_COUNT;

function situationsHtml(list) {
  return `<ul class="situations">${list.map((s) => `<li class="${s.hit ? 'hit' : ''}">
    <b>${esc(s.title)}</b><span class="luck luck-${s.luck}">${LUCK_LABEL[s.luck]}</span>
    <p>${esc(s.text)}</p></li>`).join('')}</ul>`;
}

// 조합 풀이 한 상징: 모양 고르기 + 모든 상황
function genBody(sym, modIdx, hits = new Set()) {
  const mods = modifiersFor(sym);
  const mod = mods[modIdx] || mods[0];
  const list = actionsFor(sym).map((a) => ({ ...interpret(sym, a, mod) }))
    .map((r) => ({ ...r, hit: hits.has(r.title) }))
    .sort((a, b) => b.hit - a.hit);
  const chips = mods.length > 1
    ? `<div class="chips mods">${mods.map((m, i) => `<button type="button" data-mod="${i}" class="${i === modIdx ? 'active' : ''}">${m.w ? esc(m.w) + ' ' + esc(sym.name) : '기본'}</button>`).join('')}</div>`
    : '';
  return chips + situationsHtml(list);
}

function genItem(sym, { open = false, modIdx = 0, hits } = {}) {
  const i = SYMBOLS.indexOf(sym);
  const n = actionsFor(sym).length, m = modifiersFor(sym).length;
  return `<details class="dream-item gen" data-sym="${i}" data-mod="${modIdx}"${open ? ' open' : ''}>
    <summary><b>${esc(sym.name)} 꿈</b> <span class="muted">상황 ${n}가지${m > 1 ? ` × 모양 ${m}가지` : ''} · ${kindLabel(sym.kind)}</span></summary>
    <div class="gen-body">${open ? genBody(sym, modIdx, hits) : ''}</div>
  </details>`;
}

function curatedItem(d, open) {
  return `<details class="dream-item"${open ? ' open' : ''}>
    <summary><b>${esc(d.title)} 꿈</b> <span class="muted">${d.situations.length}가지${d.keys.length > 1 ? ' · ' + esc(d.keys.slice(1).join(', ')) : ''}</span></summary>
    ${situationsHtml(d.situations)}
  </details>`;
}

function renderDreams() {
  $('#dreamCats').innerHTML = ['', ...DREAM_CATEGORIES, '음식'].map((c) =>
    `<button type="button" data-cat="${c}" class="${c === dreamCat ? 'active' : ''}">${c || '전체'}</button>`).join('');
  const q = $('#dreamQuery').value.trim();
  let html = '';
  let count = 0;
  if (q) {
    const list = searchDreams(q);
    const gen = searchGenerated(q);
    // 조합 풀이에서 딱 맞는 상황이 나왔으면 그것부터
    const genHit = gen.length && gen[0].results.some((r) => r.hit);
    const genHtml = gen.map((g) => genItem(g.sym, {
      open: true, modIdx: modifiersFor(g.sym).indexOf(g.mod),
      hits: new Set(g.results.filter((r) => r.hit).map((r) => r.title)),
    })).join('');
    const curHtml = list.map((d, i) => curatedItem(d, list.length <= 3 || i === 0)).join('');
    html = genHit ? genHtml + curHtml : curHtml + genHtml;
    count = list.length + gen.length;
  } else {
    const kinds = dreamCat ? GEN_KINDS_OF[dreamCat] || [] : null;
    const list = dreamCat === '음식' ? [] : searchDreams('', dreamCat);
    const gen = SYMBOLS.filter((s) => !kinds || kinds.includes(kindLabel(s.kind)));
    html = list.map((d) => curatedItem(d, false)).join('') + gen.map((s) => genItem(s)).join('');
    count = list.length + gen.length;
  }
  $('#dreamResults').innerHTML = html || `<p class="empty-msg">'${esc(q)}' 꿈은 아직 사전에 없어요. 다른 낱말로 찾아보세요.</p>`;
  $('#statusText').textContent = q ? `꿈해몽 · ${count}건` : `꿈해몽 · 모두 ${DREAM_TOTAL.toLocaleString()}가지 풀이`;
}

$('#dreamForm').addEventListener('submit', (e) => { e.preventDefault(); dreamCat = ''; renderDreams(); });
$('#dreamQuery').addEventListener('input', () => { dreamCat = ''; renderDreams(); });
$('#dreamCats').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  dreamCat = b.dataset.cat;
  $('#dreamQuery').value = '';
  renderDreams();
});
// 조합 풀이는 펼칠 때 그린다 (1만 가지를 한꺼번에 그리지 않도록)
$('#dreamResults').addEventListener('toggle', (e) => {
  const d = e.target;
  if (!d.classList || !d.classList.contains('gen') || !d.open) return;
  const body = d.querySelector('.gen-body');
  if (!body.innerHTML) body.innerHTML = genBody(SYMBOLS[+d.dataset.sym], +d.dataset.mod);
}, true);
$('#dreamResults').addEventListener('click', (e) => {
  const b = e.target.closest('.mods button');
  if (!b) return;
  const d = b.closest('details.gen');
  d.dataset.mod = b.dataset.mod;
  d.querySelector('.gen-body').innerHTML = genBody(SYMBOLS[+d.dataset.sym], +b.dataset.mod);
});

// ---------- 작명소 ----------

let nameSeed = 0;
const isHangulSyl = (c) => c >= '가' && c <= '힣';

function hanjaSelects(container, text, prefix) {
  const syls = [...text].filter(isHangulSyl);
  const prev = [...container.querySelectorAll('select')].map((x) => x.value);
  container.innerHTML = syls.map((syl, i) => {
    const list = hanjaFor(syl);
    if (!list.length) return `<p class="error">'${syl}'에 맞는 한자를 찾지 못했어요</p>`;
    return `<select data-syl="${syl}" aria-label="${prefix} ${i + 1}번째 글자 한자">${list.map((h) =>
      `<option value="${h.ch}"${prev[i] === h.ch ? ' selected' : ''}>${h.ch} ${h.meaning} ${syl} (${h.strokes}획)</option>`).join('')}</select>`;
  }).join('');
}

function pickedChars(container) {
  return [...container.querySelectorAll('select')].map((sel) => {
    const h = hanjaFor(sel.dataset.syl).find((x) => x.ch === sel.value);
    return { ch: h.ch, strokes: h.strokes, syl: sel.dataset.syl, meaning: h.meaning };
  });
}

function nameMode() {
  return document.querySelector('input[name="nameMode"]:checked').value;
}

function prepareNaming() {
  $('#nameLoad').hidden = !current;
  if (current && !$('#surname').value && current.profile.name) {
    $('#surname').value = current.profile.name[0];
    hanjaSelects($('#surnameHanja'), $('#surname').value, '성');
  }
}

$('#nameLoad').addEventListener('click', () => {
  if (!current) return;
  const p = current.profile;
  nameBirth.set({
    calendar: p.calendar === 'lunar' ? (p.leap ? 'lunar-leap' : 'lunar') : 'solar',
    digits: `${p.date.y}${pad2(p.date.m)}${pad2(p.date.d)}`,
    sijin: p.sijin != null ? p.sijin : p.time ? sijinOf(p.time) : '',
  });
  const g = document.querySelector(`input[name="nameGender"][value="${p.gender}"]`);
  if (g) g.checked = true;
  toast('사주를 불러왔어요');
});

document.querySelectorAll('input[name="nameMode"]').forEach((r) => r.addEventListener('change', () => {
  const analyze = nameMode() === 'analyze';
  $('#givenGroup').hidden = !analyze;
  $('#genderGroup').hidden = analyze;
  $('#nameMore').hidden = true;
  $('#nameResults').innerHTML = '';
  $('#nameError').textContent = '';
}));
$('#surname').addEventListener('input', () => hanjaSelects($('#surnameHanja'), $('#surname').value, '성'));
$('#givenName').addEventListener('input', () => hanjaSelects($('#givenHanja'), $('#givenName').value, '이름'));

function nameCard(sur, given, r, detailed, helpful = []) {
  const full = [...sur, ...given];
  const luckText = (l) => (l === 2 ? '<span class="good">길</span>' : l === 1 ? '반길' : '<span class="bad">흉</span>');
  const flowText = r.flow.map((f) => (f === 1 ? '상생' : f === 0 ? '같음' : '상극')).join(' → ');
  return `<div class="name-card">
    <span class="score">${r.score}점</span>
    <div class="name-big">${full.map((c) => c.syl).join('')}<small>${full.map((c) => c.ch).join('')}</small></div>
    <p>${given.map((c) => `<b>${c.ch}</b> ${esc(c.meaning || '')} ${c.syl} (${c.strokes}획)`).join(' · ')}</p>
    <table class="gyeok">
      ${r.gyeok.map((g) => `<tr><th>${g.name}<br /><small>${g.age}</small></th><td>${g.n}수 ${luckText(g.luck)}${detailed ? `<br />${g.text}` : ''}</td></tr>`).join('')}
    </table>
    <p style="margin:6px 0 0"><b>음령오행</b> ${full.map((c) => `${c.syl}${helpful.includes(soundElement(c.syl)) && given.includes(c) ? '★' : ''}(${ELEMENT_NAMES[soundElement(c.syl)][0]})`).join(' → ')}</p>
    ${detailed ? `<p><b>수리오행</b> ${r.gyeok.map((g) => `${g.name} ${ELEMENT_NAMES[g.element][0]}`).join(' · ')}</p>
    <p style="margin-top:8px"><b>소리 흐름</b> ${flowText} ${r.flow.includes(-1) ? '— 서로 부딪치는 소리가 있어 아쉽습니다.' : '— 소리의 흐름이 순조롭습니다.'}</p>
    <p><b>음양</b> ${r.yinYang.join(' ')} ${r.balanced ? '— 음과 양이 섞여 조화롭습니다.' : '— 한쪽으로 치우쳐 있습니다.'}</p>` : ''}
    ${r.fit ? `<p class="muted" style="margin:6px 0 0">사주에 도움이 되는 소리가 ${r.fit}자 들어 있습니다.</p>` : ''}
  </div>`;
}

$('#nameGo').addEventListener('click', () => { nameSeed = 0; runNaming(); });
$('#nameMore').addEventListener('click', () => { nameSeed += 1; runNaming(); });

function runNaming() {
  $('#nameError').textContent = '';
  const sur = pickedChars($('#surnameHanja'));
  if (!sur.length) { $('#nameError').textContent = '성을 한글로 입력하고 한자를 골라 주세요.'; return; }
  const birth = nameBirth.read();
  if (birth.error) { $('#nameError').textContent = birth.error; return; }
  const gender = document.querySelector('input[name="nameGender"]:checked').value;
  requireUnlock('작명', () => {
    let helpful = [];
    let sajuHtml = '';
    if (birth.solar) {
      const saju = sajuOfBirth(birth, gender);
      helpful = saju.strength.helpful;
      sajuHtml = sajuSummaryCard(saju, birth, '아기 사주 (만세력)');
    }
    if (nameMode() === 'analyze') {
      const given = pickedChars($('#givenHanja'));
      if (!given.length) { $('#nameError').textContent = '이름을 한글로 입력하고 한자를 골라 주세요.'; return; }
      const r = analyzeName(sur, given.slice(0, 2), helpful);
      $('#nameResults').innerHTML = sajuHtml + nameCard(sur, given.slice(0, 2), r, true, helpful)
        + '<p class="note">수리(획수)는 원획법, 음령오행은 첫소리(ㄱㅋ 목 · ㄴㄷㄹㅌ 화 · ㅇㅎ 토 · ㅅㅈㅊ 금 · ㅁㅂㅍ 수) 기준입니다. 성명학은 학파마다 기준이 조금씩 다릅니다.</p>';
      return;
    }
    const list = suggestNames(sur, gender, helpful, 10, nameSeed);
    $('#nameMore').hidden = false;
    $('#nameResults').innerHTML = sajuHtml + (list.length
      ? `<p class="note">수리 4격이 모두 길하고 소리의 흐름이 순조로운 이름 ${list.length}개입니다.${helpful.length ? ` 사주에 필요한 ${helpful.map((i) => ELEMENT_NAMES[i]).join('·')} 기운의 소리를 먼저 골랐습니다.` : ' 태어난 날을 넣으면 사주에 맞춰 골라 드려요.'}</p>`
        + list.map((r) => nameCard(sur, r.given, r, false, helpful)).join('')
      : '<p class="empty-msg">조건에 맞는 이름을 찾지 못했어요. 성의 한자를 바꿔 보세요.</p>');
    $('#statusText').textContent = `작명소 · ${list.length}개 추천`;
  });
}

// ---------- 태어난 날·시 입력 (작명소·만세력 공용) ----------

function sijinOf(time) {
  const [h, m] = time.split(':').map(Number);
  return Math.floor(((h * 60 + m - 30 + 60 + 1440) % 1440) / 120);
}

function birthWidget(el, id, { defaultCalendar = 'solar', placeholder = '숫자 8자리 예) 20250315' } = {}) {
  el.innerHTML = `
    <div class="segmented cal" role="radiogroup" aria-label="양력/음력">
      ${[['solar', '양력'], ['lunar', '음력'], ['lunar-leap', '음력 윤달']].map(([v, t]) =>
        `<label><input type="radio" name="${id}Cal" value="${v}"${v === defaultCalendar ? ' checked' : ''} /><span>${t}</span></label>`).join('')}
    </div>
    <input type="text" id="${id}Date" inputmode="numeric" maxlength="10" placeholder="${placeholder}" autocomplete="off" />
    <small class="hint" id="${id}Hint"></small>
    <select id="${id}Time" aria-label="태어난 시">
      <option value="">태어난 시 모름</option>
      ${BRANCHES_KO.map((b, i) => `<option value="${i}">${b}시 (${sijinRange(i)})</option>`).join('')}
    </select>`;
  const dateEl = el.querySelector(`#${id}Date`);
  const hintEl = el.querySelector(`#${id}Hint`);
  const cal = () => el.querySelector(`input[name="${id}Cal"]:checked`).value;

  function resolve() {
    const digits = dateEl.value.replace(/\D/g, '').slice(0, 8);
    dateEl.value = [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean).join('.');
    hintEl.classList.remove('bad');
    hintEl.textContent = '';
    if (!digits) return { empty: true };
    const d = parseDate(digits);
    if (!d) return { error: '날짜는 숫자 8자리로 넣어 주세요. 예) 20250315' };
    if (d.y < 1900 || d.y > 2100) return { error: '1900년 ~ 2100년 사이로 넣어 주세요' };
    let solar;
    let lunar;
    if (cal().startsWith('lunar')) {
      const leap = cal() === 'lunar-leap';
      solar = d.m >= 1 && d.m <= 12 ? lunarToSolar(d.y, d.m, d.d, leap) : null;
      if (!solar) return { error: `음력 ${d.y}년 ${leap ? '윤' : ''}${d.m}월 ${d.d}일은 없는 날짜예요` };
      lunar = { year: d.y, month: d.m, day: d.d, leap };
    } else {
      if (!isValidSolar(d)) return { error: `${d.y}년 ${d.m}월 ${d.d}일은 없는 날짜예요` };
      solar = { year: d.y, month: d.m, day: d.d };
      lunar = solarToLunar(d.y, d.m, d.d);
    }
    hintEl.textContent = `양력 ${solar.year}.${solar.month}.${solar.day} · 음력 ${lunar.year}.${lunar.leap ? '윤' : ''}${lunar.month}.${lunar.day}`;
    return { solar, lunar };
  }

  function show() {
    const r = resolve();
    if (r.error) { hintEl.textContent = r.error; hintEl.classList.add('bad'); }
    return r;
  }
  dateEl.addEventListener('input', show);
  el.querySelectorAll(`input[name="${id}Cal"]`).forEach((x) => x.addEventListener('change', show));

  return {
    read() {
      const r = show();
      if (r.error) return { error: r.error };
      if (r.empty) return {};
      const t = el.querySelector(`#${id}Time`).value;
      const s = t === '' ? null : Number(t);
      return { ...r, sijin: s, hour: s == null ? null : (s * 2) % 24, minute: s == null ? null : 30 };
    },
    set({ calendar, digits, sijin: sj }) {
      const radio = el.querySelector(`input[name="${id}Cal"][value="${calendar}"]`);
      if (radio) radio.checked = true;
      dateEl.value = digits;
      el.querySelector(`#${id}Time`).value = sj === '' || sj == null ? '' : String(sj);
      show();
    },
  };
}

function sajuOfBirth(birth, gender = 'male') {
  return calculateSaju({ ...birth.solar, hour: birth.hour, minute: birth.minute, gender, longitudeCorrection: -30 });
}

function pillarsRow(saju) {
  const order = [['hour', '시주'], ['day', '일주'], ['month', '월주'], ['year', '연주']];
  return `<div class="pillars">${order.map(([k, label]) => {
    const p = saju.pillars[k];
    return `<div><div class="pillar-head">${label}</div>
      ${p ? charBox(p.stem, true) : '<div class="char empty">?</div>'}
      <div style="height:4px"></div>
      ${p ? charBox(p.branch, false) : '<div class="char empty">?</div>'}</div>`;
  }).join('')}</div>`;
}

function elementBars(counts) {
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  const colors = ['var(--wood)', 'var(--fire)', 'var(--earth)', 'var(--metal)', 'var(--water)'];
  return `<div class="bars" style="margin-top:10px">${counts.map((c, i) => `
    <div class="bar-row"><span>${ELEMENT_NAMES[i]}</span>
      <div class="bar"><i style="width:${(c / total) * 100}%;background:${colors[i]}"></i></div><b>${c}</b></div>`).join('')}</div>`;
}

function sajuSummaryCard(saju, birth, title) {
  const lacking = saju.elements.map((c, i) => (c === 0 ? i : -1)).filter((i) => i >= 0);
  const colors = ['var(--wood)', 'var(--fire)', 'var(--earth)', 'var(--metal)', 'var(--water)'];
  return `<div class="card">
    <h3>${title}</h3>
    <p class="note">양력 ${birth.solar.year}.${birth.solar.month}.${birth.solar.day} · 음력 ${birth.lunar.year}.${birth.lunar.leap ? '윤' : ''}${birth.lunar.month}.${birth.lunar.day}${birth.sijin != null ? ` · ${BRANCHES_KO[birth.sijin]}시` : ' · 시 모름'} · ${saju.zodiac}띠</p>
    ${pillarsRow(saju)}
    ${elementBars(saju.elements)}
    <p style="margin-top:10px"><b>일간</b> ${STEMS[saju.dayMaster]}(${STEMS_KO[saju.dayMaster]}${ELEMENTS_HANJA[stemElement(saju.dayMaster)]}) · ${saju.strength.label}${lacking.length ? ` · 없는 오행 ${lacking.map((i) => ELEMENT_NAMES[i]).join('·')}` : ''}</p>
    <p><b>이름에 넣으면 좋은 기운</b><br />${saju.strength.helpful.map((i) => `<span class="need" style="background:${colors[i]}">${ELEMENT_NAMES[i]}</span>`).join('')}
      <span class="muted">음령오행 ${saju.strength.helpful.map((i) => ['ㄱㅋ', 'ㄴㄷㄹㅌ', 'ㅇㅎ', 'ㅅㅈㅊ', 'ㅁㅂㅍ'][i]).join(' / ')}으로 시작하는 소리</span></p>
  </div>`;
}

// ---------- 만세력 ----------

function todayBirth() {
  const k = new Date(Date.now() + 9 * 3600000);
  const solar = { year: k.getUTCFullYear(), month: k.getUTCMonth() + 1, day: k.getUTCDate() };
  const h = k.getUTCHours();
  const s = Math.floor(((h * 60 + k.getUTCMinutes() - 30 + 60 + 1440) % 1440) / 120);
  return { solar, lunar: solarToLunar(solar.year, solar.month, solar.day), sijin: s, hour: (s * 2) % 24, minute: 30 };
}

function kstString(ms) {
  const d = new Date(ms + 9 * 3600000);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

function showManse(birth) {
  const saju = sajuOfBirth(birth);
  const { year, month, day } = birth.solar;
  const ms = Date.UTC(year, month - 1, day, birth.hour ?? 12, birth.minute ?? 0) - 9 * 3600000;
  const jie = surroundingJie(ms);
  const week = '일월화수목금토'[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  $('#manseResult').innerHTML = `<div class="card">
    <h3>${year}년 ${month}월 ${day}일 (${week}) 만세력</h3>
    <dl class="manse-head">
      <dt>양력</dt><dd>${year}년 ${month}월 ${day}일 ${week}요일</dd>
      <dt>음력</dt><dd>${birth.lunar.year}년 ${birth.lunar.leap ? '윤' : ''}${birth.lunar.month}월 ${birth.lunar.day}일</dd>
      <dt>간지</dt><dd>${pillarName(saju.pillars.year)}년 ${pillarName(saju.pillars.month)}월 ${pillarName(saju.pillars.day)}일${saju.pillars.hour ? ` ${pillarName(saju.pillars.hour)}시` : ''}</dd>
      <dt>띠</dt><dd>${saju.zodiac}띠 (입춘 기준)</dd>
      <dt>절기</dt><dd>${jie.prev.name} ${kstString(jie.prev.ms)} → ${jie.next.name} ${kstString(jie.next.ms)}</dd>
    </dl>
    ${pillarsRow(saju)}
    ${elementBars(saju.elements)}
  </div>`;
}

const manseBirth = birthWidget($('#manseBirth'), 'manse', { placeholder: '숫자 8자리 예) 19810129' });
const nameBirth = birthWidget($('#nameBirth'), 'nb');

$('#manseGo').addEventListener('click', () => {
  $('#manseError').textContent = '';
  const b = manseBirth.read();
  if (b.error) { $('#manseError').textContent = b.error; return; }
  if (!b.solar) { $('#manseError').textContent = '날짜를 숫자 8자리로 넣어 주세요.'; return; }
  showManse(b);
});
$('#manseToday').addEventListener('click', () => {
  const t = todayBirth();
  manseBirth.set({ calendar: 'solar', digits: `${t.solar.year}${pad2(t.solar.month)}${pad2(t.solar.day)}`, sijin: t.sijin });
  showManse(t);
});

// ---------- 쿠팡 배너·잠금 ----------

const SETTINGS_KEY = 'saju.settings.v1';
// 잠금은 앱을 켤 때마다 새로 걸린다 (저장하지 않음). 오래 밖에 나가 있다 돌아와도 다시 건다.
const RELOCK_AFTER = 30 * 60000;
let unlocked = false;
let hiddenAt = 0;
try { localStorage.removeItem('saju.unlockUntil'); } catch { /* 예전 버전의 시간제 잠금 */ }
const LOCKED_VIEWS = { input: '사주풀이', dream: '꿈해몽', naming: '작명' };

function settings() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch { /* 기본값 */ }
  // 비워 둔 칸은 앱에 넣어 둔 기본 링크·문구를 쓴다
  for (const k of ['coupangUrl', 'bannerText']) if (!saved[k]) delete saved[k];
  delete saved.unlockHours; // 예전 설정
  return { ...APP_CONFIG, ...saved };
}

function isUnlocked() {
  const cfg = settings();
  return !cfg.coupangUrl || !cfg.lock || unlocked;
}

function unlock() {
  unlocked = true;
}

let pendingAction = null;

function requireUnlock(what, action) {
  if (isUnlocked()) { action(); return; }
  pendingAction = action;
  const last = what.charCodeAt(what.length - 1) - 0xac00;
  $('#gateWhat').textContent = what + (last >= 0 && last % 28 ? '은' : '는');
  $('#gate').hidden = false;
}

function openAd(e) {
  const url = settings().coupangUrl;
  if (!url) { e.preventDefault(); return; }
  if (window.AndroidBridge && window.AndroidBridge.openUrl) {
    e.preventDefault();
    window.AndroidBridge.openUrl(url);
  }
  const wasLocked = !isUnlocked();
  unlock();
  renderAd();
  if (wasLocked) toast('이용이 열렸어요! 사주풀이·꿈해몽·작명을 쓸 수 있어요');
  if (!$('#gate').hidden) {
    $('#gate').hidden = true;
    const action = pendingAction;
    pendingAction = null;
    if (action) setTimeout(action, 300);
  }
}

function renderAd() {
  const cfg = settings();
  const has = Boolean(cfg.coupangUrl);
  $('#adBar').hidden = !has;
  for (const a of [$('#adBanner'), $('#gateAd')]) a.href = has ? cfg.coupangUrl : '#';
  $('#adText').textContent = cfg.bannerText || '오늘의 특가 보러 가기';
  $('#gateAdText').textContent = cfg.bannerText || '오늘의 특가 보러 가기';
  $('#adNotice').textContent = COUPANG_NOTICE;
  $('#gateNotice').textContent = COUPANG_NOTICE;
  // 배너를 눌러야 이용할 수 있다는 안내, 누른 뒤에는 이용 중 표시
  const locking = has && cfg.lock;
  const open = isUnlocked();
  document.body.classList.toggle('locked', !open);
  $('#adGo').textContent = !locking ? '바로가기 ▶' : open ? '이용 중 ✔' : '누르고 이용 ▶';
  $('#adHint').hidden = !locking;
  $('#adHint').className = 'ad-hint' + (open ? ' ok' : '');
  $('#adHint').textContent = open
    ? '✔ 사주풀이·토정비결·꿈해몽·작명 이용 중 (앱을 다시 켜면 배너를 한 번 더 눌러 주세요)'
    : '▲ 배너를 누르면 사주풀이·토정비결·꿈해몽·작명을 이용할 수 있어요';
}

$('#adBanner').addEventListener('click', openAd);
$('#gateAd').addEventListener('click', openAd);
$('#gateClose').addEventListener('click', () => { $('#gate').hidden = true; pendingAction = null; });

function fillSettings() {
  const cfg = settings();
  $('#setUrl').value = cfg.coupangUrl || '';
  $('#setText').value = cfg.bannerText || '';
  $('#setLock').value = cfg.lock ? '1' : '0';
  $('#setNotice').textContent = `배너 아래에 "${COUPANG_NOTICE}" 문구가 함께 표시됩니다.`;
}

$('#setSave').addEventListener('click', () => {
  const url = $('#setUrl').value.trim();
  if (url && !/^https?:\/\//.test(url)) { toast('링크는 https:// 로 시작해야 해요'); return; }
  const next = { coupangUrl: url, bannerText: $('#setText').value.trim(), lock: $('#setLock').value === '1' };
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { toast('저장할 수 없어요'); return; }
  unlocked = false;
  renderAd();
  toast(url ? '저장했어요. 위쪽에 배너가 보입니다' : '저장했어요. 링크를 비우면 기본 링크를 씁니다');
});
$('#setTest').addEventListener('click', () => {
  unlocked = false;
  renderAd();
  requireUnlock('사주풀이', () => toast('잠금이 풀렸어요'));
  if (isUnlocked()) toast('링크가 없거나 잠그지 않음으로 되어 있어요');
});

renderAd();
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  if (hiddenAt && Date.now() - hiddenAt > RELOCK_AFTER) { unlocked = false; if (LOCKED_VIEWS[navStack[navStack.length - 1]] || navStack[navStack.length - 1] === 'result') go('home'); }
  renderAd();
});

// ---------- PWA ----------
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
