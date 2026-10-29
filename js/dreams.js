// 꿈해몽 사전과 검색
import { DREAMS_ANIMALS } from './dreams-animals.js';
import { DREAMS_PEOPLE } from './dreams-people.js';
import { DREAMS_WORLD } from './dreams-world.js';

export const DREAM_CATEGORIES = ['동물', '사람', '신체', '자연', '물건·장소', '행동·상황'];

export const DREAMS = [...DREAMS_ANIMALS, ...DREAMS_PEOPLE, ...DREAMS_WORLD].map(([category, keys, list]) => ({
  category,
  keys: keys.split(','),
  title: keys.split(',')[0],
  situations: list.map(([title, luck, text]) => ({ title, luck, text })),
}));

export const DREAM_COUNT = DREAMS.reduce((a, d) => a + d.situations.length, 0);

// 조사·어미를 걷어 낸 검색어
function normalize(q) {
  return (q || '')
    .replace(/\s+/g, '')
    .replace(/꿈(을|이|에서|속)?$/, '')
    .replace(/(는|은|을|를|이|가|에게|에서|으로|로|와|과|하는|되는|한)$/, '');
}

// 두 글자씩 잘라 겹치는 정도 (상황 문장과의 유사도)
function overlap(rest, text) {
  if (!rest) return 0;
  if (rest.length === 1) return text.includes(rest) ? 1 : 0;
  let n = 0;
  for (let i = 0; i < rest.length - 1; i++) if (text.includes(rest.slice(i, i + 2))) n++;
  return n;
}

/**
 * @returns {{category, title, keys, situations:{title,luck,text,hit:boolean}[]}[]}
 */
export function searchDreams(query, category) {
  const q = normalize(query);
  const pool = DREAMS.filter((d) => !category || d.category === category);
  if (!q) return pool.map((d) => ({ ...d, situations: d.situations.map((s) => ({ ...s, hit: false })) }));

  const out = [];
  for (const d of pool) {
    // 검색어 안에 상징 낱말이 있거나(돼지가도망) 낱말 일부를 쳤을 때(돼)
    const key = d.keys.find((k) => q.includes(k)) || d.keys.find((k) => k.startsWith(q));
    const rest = key ? q.replace(key, '') : q;
    const scored = d.situations.map((s) => {
      const score = overlap(rest, s.title.replace(/\s/g, '')) * 2 + overlap(rest, s.text);
      return { ...s, score };
    });
    const best = Math.max(...scored.map((s) => s.score));
    if (!key && best < 2) continue; // 상징이 다르면 상황이 꽤 비슷할 때만
    const situations = scored
      .map((s) => ({ ...s, hit: rest.length > 0 && s.score > 0 && s.score >= best - 1 }))
      .sort((a, b) => b.hit - a.hit || b.score - a.score);
    out.push({ ...d, situations, rank: (key ? 100 : 0) + best });
  }
  // 상징 낱말이 맞은 결과가 있으면, 다른 상징은 상황이 아주 비슷할 때만 남긴다
  const keyed = out.some((d) => d.rank >= 100);
  return out.filter((d) => !keyed || d.rank >= 100 || d.rank >= 4).sort((a, b) => b.rank - a.rank);
}
