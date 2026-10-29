import {
  STEMS, STEMS_KO, BRANCHES, BRANCHES_KO, ZODIAC, ELEMENTS_HANJA, BRANCH_ELEMENT, BRANCH_MAIN_STEM,
  stemElement, calculateSaju, lunarToSolar, solarToLunar, tenGod, pillarName,
  yearPillarOf, todayPillar,
} from './saju.js';
import { lifeReading, sinsal, relations, monthlyFortune, daewoonReading, dailyDetail } from './reading.js';
import { DAY_MASTER, ELEMENT_INFO, TEN_GOD_INFO, STRENGTH_INFO, PILLAR_MEANING } from './content.js';

const $ = (s) => document.querySelector(s);
const STORAGE_KEY = 'saju.profiles.v1';

const form = $('#sajuForm');
const views = { input: $('#inputView'), result: $('#resultView'), saved: $('#savedView') };
let current = null; // { profile, saju }
let activeTab = 'chart';

// ---------- 화면 전환 ----------

function show(name) {
  for (const [k, el] of Object.entries(views)) el.hidden = k !== name;
  $('#backBtn').style.visibility = name === 'input' ? 'hidden' : 'visible';
  window.scrollTo(0, 0);
}

$('#backBtn').style.visibility = 'hidden';
$('#backBtn').addEventListener('click', () => show(current && !views.result.hidden ? 'input' : current ? 'result' : 'input'));
$('#savedBtn').addEventListener('click', async () => { show('saved'); await renderSaved(); });
$('#newBtn').addEventListener('click', () => show('input'));

// 안드로이드 뒤로 가기 버튼: 앱 안에서 이전 화면으로, 첫 화면이면 false (앱 종료)
window.handleAndroidBack = () => {
  if (!views.input.hidden) return false;
  $('#backBtn').click();
  return true;
};

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
  const ok = openProfile(profile);
  if (!ok) fail('해당 음력 날짜를 찾을 수 없어요. 윤달 여부를 확인해 주세요.');
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
  activeTab = 'chart';
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
  const html = { chart: tabChart, elements: tabElements, personality: tabPersonality, life: tabLife, daewoon: tabDaewoon, fortune: tabFortune }[activeTab]();
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
    </div>`;
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
    try { await navigator.share({ title: '사주풀이', text, url: location.href }); return; } catch (e) {
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
    if (p) openProfile(p);
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

// ---------- PWA ----------
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
