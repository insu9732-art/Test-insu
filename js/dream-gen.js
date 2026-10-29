import { MORE_ACT, MORE_MOD, MORE_SYM, PERSON_TAGS } from './dream-gen-more.js';

// 꿈해몽 조합 풀이: [꿈에 나온 것] × [상황] × [모양]으로 풀이를 만든다
// 전통적으로 각 상징이 뜻하는 바(재물·귀인·근심 …)와 상황이 그 기운을 얻는지 잃는지로 길흉을 정한다.

// ---------- 조사 ----------
const hasBatchim = (w) => {
  const c = w.charCodeAt(w.length - 1) - 0xac00;
  return c >= 0 && c <= 11171 && c % 28 !== 0;
};
const isRieul = (w) => (w.charCodeAt(w.length - 1) - 0xac00) % 28 === 8;
export function josa(w, kind) {
  const b = hasBatchim(w);
  switch (kind) {
    case '이가': return w + (b ? '이' : '가');
    case '을를': return w + (b ? '을' : '를');
    case '은는': return w + (b ? '은' : '는');
    case '과와': return w + (b ? '과' : '와');
    case '으로': return w + (b && !isRieul(w) ? '으로' : '로');
    case '이랑': return w + (b ? '이랑' : '랑');
    default: return w + kind;
  }
}
const fill = (tpl, s) => tpl.replace(/\{S(?::([^}]+))?\}/g, (_, k) => (k ? josa(s, k) : s));

// ---------- 상징이 뜻하는 것 ----------
// pol 1: 좋은 기운(가까이 오면 길), -1: 나쁜 기운(멀어지면 길)
// come: 그 기운이 다가오거나 커질 때, go: 멀어지거나 잃을 때
const MEANING = {
  재물: { pol: 1, desc: '재물과 복', come: '뜻밖의 돈이나 수입이 생기고 살림이 넉넉해집니다.', go: '들어올 돈이 새거나 지출이 늘 수 있습니다.' },
  큰재물: { pol: 1, desc: '큰 재물과 사업 운', come: '규모가 큰 이익이나 사업 기회가 찾아옵니다.', go: '크게 기대한 수익이 줄어들 수 있습니다.' },
  귀인: { pol: 1, desc: '나를 돕는 귀인', come: '도와줄 사람이 나타나 일이 쉽게 풀립니다.', go: '믿던 도움이 멀어지니 스스로 길을 찾아야 합니다.' },
  권세: { pol: 1, desc: '권세와 높은 자리', come: '지위가 오르고 영향력이 커집니다.', go: '자리가 흔들리거나 힘을 잃을 수 있습니다.' },
  명예: { pol: 1, desc: '명예와 이름', come: '이름이 알려지고 인정을 받습니다.', go: '체면이 상하거나 평가가 낮아질 수 있습니다.' },
  인연: { pol: 1, desc: '좋은 인연과 사랑', come: '마음 맞는 사람을 만나거나 관계가 깊어집니다.', go: '가까운 사이에 거리가 생길 수 있습니다.' },
  자녀: { pol: 1, desc: '자녀와 새 생명(태몽)', come: '태몽이거나 자녀에게 기쁜 일이 있습니다.', go: '자녀나 아랫사람 일로 신경 쓸 일이 생깁니다.' },
  소식: { pol: 1, desc: '반가운 소식', come: '기다리던 연락이나 좋은 소식이 옵니다.', go: '기다리던 소식이 늦어질 수 있습니다.' },
  건강: { pol: 1, desc: '건강과 생명력', come: '기운이 살아나고 몸이 가벼워집니다.', go: '피로가 쌓였으니 건강을 챙기세요.' },
  지혜: { pol: 1, desc: '지혜와 배움', come: '공부나 시험, 판단에 좋은 결과가 있습니다.', go: '판단이 흐려질 수 있으니 중요한 결정은 미루세요.' },
  가정: { pol: 1, desc: '가정의 평안과 기반', come: '집안이 화목하고 살림의 기반이 단단해집니다.', go: '집안에 걱정거리가 생길 수 있습니다.' },
  일: { pol: 1, desc: '일과 사업의 흐름', come: '하는 일이 순조롭고 성과가 납니다.', go: '일이 막히거나 늦어질 수 있습니다.' },
  협력: { pol: 1, desc: '믿을 만한 협력자', come: '함께할 동료나 친구가 생깁니다.', go: '믿던 사람과 틈이 생길 수 있습니다.' },
  장수: { pol: 1, desc: '장수와 오래가는 복', come: '오래 이어질 복과 안정이 찾아옵니다.', go: '어른의 건강을 살피세요.' },
  기회: { pol: 1, desc: '새로운 기회', come: '새로운 길이나 기회가 열립니다.', go: '눈앞의 기회를 놓칠 수 있습니다.' },
  근심: { pol: -1, desc: '근심과 걱정거리', come: '걱정거리가 늘고 마음이 무거워질 수 있습니다.', go: '근심이 사라지고 마음이 가벼워집니다.' },
  질병: { pol: -1, desc: '병과 피로', come: '건강을 해칠 수 있으니 무리하지 마세요.', go: '아픈 곳이 낫고 기운을 되찾습니다.' },
  경쟁자: { pol: -1, desc: '경쟁자와 방해꾼', come: '나를 견제하는 사람이 다가오니 조심하세요.', go: '방해하던 사람이 물러납니다.' },
  구설: { pol: -1, desc: '구설과 뒷말', come: '말이 많아지고 오해가 생길 수 있습니다.', go: '오해가 풀리고 시비가 가라앉습니다.' },
  손실: { pol: -1, desc: '손실과 도난', come: '돈이나 물건을 잃을 수 있으니 단속하세요.', go: '잃을 뻔한 것을 지켜 냅니다.' },
  유혹: { pol: -1, desc: '유혹과 속임수', come: '달콤한 말이나 유혹에 넘어가기 쉽습니다.', go: '속임수를 알아채고 피해 갑니다.' },
  위험: { pol: -1, desc: '위험과 사고', come: '사고나 다툼을 조심해야 합니다.', go: '위험이 지나가고 안전해집니다.' },
};

// ---------- 상황(행동) ----------
// type: come(기운이 옴) go(떠남) win(이겨 냄/손에 넣음) chase(쫓아옴) rise(커지고 오름) fall(꺾임) mixed(죽음 등 양면) sign(조짐)
const ACT = {
  animal: [
    { t: '{S:이가} 집에 들어오는 꿈', k: '집,들어오,들어와,찾아오', type: 'come' },
    { t: '{S:이가} 집 밖으로 도망가는 꿈', k: '도망,나가,달아나,빠져나', type: 'go' },
    { t: '{S:이가} 나를 쫓아오는 꿈', k: '쫓아,쫓기,따라오,달려', type: 'chase' },
    { t: '{S:에게} 물리는 꿈', k: '물리,물어,물렸,무는,깨물', type: 'chase', tag: 'bite' },
    { t: '{S:을를} 품에 안는 꿈', k: '안는,안았,품,안기', type: 'come' },
    { t: '{S:을를} 잡는 꿈', k: '잡는,잡았,잡아,붙잡,사냥', type: 'win' },
    { t: '{S:을를} 잡았다 놓치는 꿈', k: '놓치,놓쳤,빠져', type: 'go' },
    { t: '{S:을를} 죽이는 꿈', k: '죽이,죽였,때려', type: 'win' },
    { t: '{S:이가} 죽어 있는 꿈', k: '죽는,죽은,죽어,죽었,시체', type: 'mixed' },
    { t: '{S:이가} 새끼를 낳는 꿈', k: '새끼,낳,출산', type: 'rise', noMod: ['새끼'] },
    { t: '{S:이가} 떼로 몰려오는 꿈', k: '떼,몰려,많이,여러,수십,우글', type: 'rise', noMod: ['두 마리', '새끼'] },
    { t: '{S:이가} 서로 싸우는 꿈', k: '서로싸,싸우는,다투', type: 'sign', note: '주변에서 다툼이나 경쟁이 벌어지는 모습입니다. 한발 물러서 지켜보면 이득을 봅니다.' },
    { t: '{S:과와} 싸워 이기는 꿈', k: '이기,이겼,싸워', type: 'win' },
    { t: '{S:이가} 사람처럼 말을 하는 꿈', k: '말을,말하,말했', type: 'sign', note: '꿈속의 말은 실제로 들을 소식이나 조언을 뜻합니다. 들은 말을 잘 기억해 두세요.' },
    { t: '{S:에게} 먹이를 주는 꿈', k: '먹이,밥을주,먹여', type: 'come', note: '정성을 들인 만큼 돌아오는 꿈입니다.' },
    { t: '{S:을를} 집에서 키우는 꿈', k: '키우,기르,길러', type: 'come' },
    { t: '{S:을를} 타고 달리는 꿈', k: '타고,타는,탔', type: 'rise', tag: 'big' },
    { t: '{S:이가} 하늘로 날아오르는 꿈', k: '날아,하늘,날개,날으', type: 'rise', tag: 'fly' },
    { t: '{S:이가} 물속에서 노니는 꿈', k: '물속,헤엄,수영,물에서', type: 'come', tag: 'water' },
    { t: '{S:이가} 몸에 기어오르는 꿈', k: '기어,몸에,붙', type: 'come', tag: 'small' },
    { t: '{S:이가} 우는 꿈', k: '우는,울음,짖,울부', type: 'sign' },
    { t: '{S:이가} 아파하는 꿈', k: '아프,아파,병든,다친', type: 'fall' },
    { t: '{S:이가} 사람으로 변하는 꿈', k: '변하,변신,사람이되', type: 'sign', note: '모습이 바뀌는 꿈은 상황이 크게 달라질 조짐입니다.' },
    { t: '{S:을를} 잃어버리는 꿈', k: '잃어,잃었,사라', type: 'go' },
    { t: '{S:을를} 남에게 파는 꿈', k: '팔,팔았,넘겨', type: 'go' },
    { t: '{S:을를} 사 오는 꿈', k: '사오,사는,샀', type: 'come' },
    { t: '{S:이가} 집 안을 어지럽히는 꿈', k: '어지럽,난장,망가', type: 'sign', note: '집안에 소란이 있지만 그 기운이 집 안에 머문다는 뜻이기도 합니다.' },
  ],
  person: [
    { t: '{S:이가} 집에 찾아오는 꿈', k: '찾아,집에,오는,왔', type: 'come' },
    { t: '{S:과와} 이야기를 나누는 꿈', k: '이야기,대화,말을', type: 'come' },
    { t: '{S:이가} 환하게 웃는 꿈', k: '웃는,웃었,웃음,미소', type: 'come' },
    { t: '{S:이가} 우는 꿈', k: '우는,울었,울음,눈물', type: 'sign', note: '꿈속의 울음은 실제로 근심이 풀리는 반대의 뜻으로 보기도 합니다.' },
    { t: '{S:이가} 화를 내는 꿈', k: '화를,화내,꾸짖,혼나', type: 'fall' },
    { t: '{S:과와} 다투는 꿈', k: '다투,싸우,싸움', type: 'fall' },
    { t: '{S:이가} 아픈 꿈', k: '아프,아픈,병', type: 'fall' },
    { t: '{S:이가} 죽는 꿈', k: '죽는,죽었,죽음,돌아가', type: 'mixed' },
    { t: '{S:에게} 선물을 받는 꿈', k: '선물,받는,받았,주는', type: 'come' },
    { t: '{S:에게} 돈을 받는 꿈', k: '돈을받,용돈,돈받', type: 'come' },
    { t: '{S:이가} 돈을 달라고 하는 꿈', k: '달라,빌려,꾸어', type: 'go' },
    { t: '{S:과와} 함께 밥을 먹는 꿈', k: '밥을,먹는,식사', type: 'come' },
    { t: '{S:과와} 결혼하는 꿈', k: '결혼,혼인,웨딩', type: 'rise' },
    { t: '{S:이가} 떠나가는 꿈', k: '떠나,떠났,이별,헤어', type: 'go' },
    { t: '{S:이가} 나를 부르는 꿈', k: '부르,불렀,부름', type: 'sign', note: '부르는 꿈은 그 사람과 관련된 일을 챙기라는 신호입니다.' },
    { t: '{S:이가} 나를 쫓아오는 꿈', k: '쫓아,쫓기,따라', type: 'chase' },
    { t: '{S:과와} 손을 잡는 꿈', k: '손을,손잡', type: 'come' },
    { t: '{S:이가} 나를 안아 주는 꿈', k: '안아,포옹,안기', type: 'come' },
    { t: '{S:을를} 길에서 우연히 만나는 꿈', k: '만나,만났,우연', type: 'come' },
    { t: '{S:이가} 내 이름을 크게 칭찬하는 꿈', k: '칭찬,인정', type: 'rise' },
  ],
  body: [
    { t: '{S:이가} 다치는 꿈', k: '다치,다쳤,상처', type: 'fall' },
    { t: '{S:에서} 피가 나는 꿈', k: '피가,피나,출혈', type: 'come', note: '꿈속의 피는 전통적으로 재물을 뜻합니다.' },
    { t: '{S:이가} 빠지거나 잘리는 꿈', k: '빠지,빠졌,잘리,잘렸', type: 'go' },
    { t: '{S:이가} 크고 튼튼해지는 꿈', k: '커지,자라,길어,튼튼', type: 'rise' },
    { t: '{S:을를} 깨끗이 씻는 꿈', k: '씻,닦', type: 'win' },
    { t: '{S:이가} 아픈 꿈', k: '아프,아픈,통증', type: 'fall' },
    { t: '{S:이가} 예뻐지는 꿈', k: '예뻐,예쁜,고와', type: 'rise' },
    { t: '{S:에} 상처가 낫는 꿈', k: '낫,나았,아물', type: 'win' },
    { t: '{S:이가} 썩거나 상하는 꿈', k: '썩,상하,곪', type: 'fall' },
    { t: '남의 {S:을를} 보는 꿈', k: '남의,다른사람', type: 'sign', noMod: true, note: '남의 몸을 보는 꿈은 그 사람과 관련된 일을 알게 된다는 뜻입니다.' },
    { t: '{S:이가} 여러 개로 늘어나는 꿈', k: '늘어,여러,많아', type: 'rise' },
  ],
  thing: [
    { t: '{S:을를} 얻는 꿈', k: '얻,생기', type: 'come' },
    { t: '{S:을를} 선물로 받는 꿈', k: '받는,받았,선물', type: 'come' },
    { t: '{S:을를} 길에서 줍는 꿈', k: '줍,주웠', type: 'come', note: '주운 것은 뜻밖의 기회이지만 남의 것을 탐하지는 마세요.' },
    { t: '{S:을를} 사는 꿈', k: '사는,샀,구입', type: 'come' },
    { t: '{S:을를} 잃어버리는 꿈', k: '잃어,잃었,분실,사라', type: 'go' },
    { t: '{S:이가} 깨지거나 부서지는 꿈', k: '깨지,깨졌,부서,망가,고장', type: 'fall' },
    { t: '{S:을를} 남에게 주는 꿈', k: '주는,줬,나눠', type: 'go' },
    { t: '{S:을를} 도둑맞는 꿈', k: '도둑,훔쳐,빼앗', type: 'go' },
    { t: '잃어버린 {S:을를} 다시 찾는 꿈', k: '다시찾,찾았,찾는', type: 'win' },
    { t: '{S:을를} 버리는 꿈', k: '버리,버렸', type: 'go' },
    { t: '{S:을를} 고치는 꿈', k: '고치,수리', type: 'win' },
    { t: '{S:이가} 산처럼 쌓여 있는 꿈', k: '쌓여,가득,많이', type: 'rise' },
    { t: '{S:이가} 환하게 빛나는 꿈', k: '빛나,반짝,빛이', type: 'rise' },
    { t: '{S:을를} 몸에 지니고 다니는 꿈', k: '지니,차고,가지고', type: 'come' },
    { t: '{S:을를} 팔아 버리는 꿈', k: '팔,팔았', type: 'go' },
  ],
  place: [
    { t: '{S:에} 들어가는 꿈', k: '들어가,들어갔,가는', type: 'come' },
    { t: '{S:에서} 길을 잃고 헤매는 꿈', k: '헤매,길을잃,잃고', type: 'fall' },
    { t: '{S:에} 갇히는 꿈', k: '갇히,갇혔,못나', type: 'fall' },
    { t: '{S:을를} 깨끗이 청소하는 꿈', k: '청소,치우,깨끗', type: 'win' },
    { t: '{S:이가} 무너지는 꿈', k: '무너,부서,붕괴', type: 'fall' },
    { t: '{S:에} 불이 나는 꿈', k: '불이,불나,타는,불탄', type: 'rise', note: '불길이 활활 타오르는 꿈은 번창을 뜻하는 길몽으로 봅니다.' },
    { t: '{S:에서} 살게 되는 꿈', k: '살게,이사,살아', type: 'come' },
    { t: '{S:이가} 밝고 깨끗한 꿈', k: '밝고,깨끗,환한', type: 'rise' },
    { t: '{S:이가} 어둡고 더러운 꿈', k: '어둡,더러,지저분', type: 'fall' },
    { t: '{S:의} 문이 잠겨 있는 꿈', k: '잠겨,잠긴,문이', type: 'fall' },
    { t: '{S:에} 사람이 가득한 꿈', k: '사람이,붐비,가득', type: 'rise' },
    { t: '{S:에서} 누군가를 기다리는 꿈', k: '기다리,기다렸', type: 'sign', note: '기다리는 꿈은 결과를 기다리는 마음입니다. 조금만 더 참으면 소식이 옵니다.' },
  ],
  nature: [
    { t: '{S:을를} 바라보는 꿈', k: '보는,보았,바라', type: 'sign' },
    { t: '{S:이가} 가득 넘치는 꿈', k: '넘치,가득,많', type: 'rise' },
    { t: '{S:이가} 나에게 다가오는 꿈', k: '다가,몰려,덮치', type: 'come' },
    { t: '{S:이가} 사라지는 꿈', k: '사라,없어,꺼지', type: 'go' },
    { t: '{S:이가} 맑고 환한 꿈', k: '맑,환하,밝', type: 'rise' },
    { t: '{S:이가} 흐리고 어두운 꿈', k: '흐리,어둡,탁', type: 'fall' },
    { t: '{S:이가} 품에 들어오는 꿈', k: '품에,안기', type: 'come' },
    { t: '{S:이가} 무너지거나 부서지는 꿈', k: '무너,부서,갈라', type: 'fall' },
    { t: '{S:속으로} 들어가는 꿈', k: '들어가,속으로', type: 'come' },
    { t: '{S:을를} 손으로 만지는 꿈', k: '만지,만졌', type: 'come' },
  ],
  food: [
    { t: '{S:을를} 맛있게 먹는 꿈', k: '먹는,먹었,맛있', type: 'come' },
    { t: '{S:을를} 배불리 먹는 꿈', k: '배불,많이먹,실컷', type: 'rise' },
    { t: '{S:을를} 받는 꿈', k: '받는,받았,선물', type: 'come' },
    { t: '{S:을를} 만드는 꿈', k: '만드,요리,굽', type: 'win' },
    { t: '상한 {S:을를} 먹는 꿈', k: '상한,썩은,상해', type: 'fall', noMod: true },
    { t: '{S:을를} 나누어 주는 꿈', k: '나누,나눠,주는', type: 'go', note: '나누는 꿈은 베푼 만큼 돌아오는 뜻도 있습니다.' },
    { t: '{S:을를} 사는 꿈', k: '사는,샀', type: 'come' },
    { t: '{S:을를} 쏟거나 버리는 꿈', k: '쏟,버리,흘리', type: 'go' },
    { t: '남이 {S:을를} 먹는 모습을 보는 꿈', k: '남이,다른사람', type: 'go' },
    { t: '{S:이가} 상에 가득 차려진 꿈', k: '가득,차려,잔칫', type: 'rise' },
  ],
};

// 모양: 같은 상징이라도 색과 크기에 따라 뜻이 달라진다
const MOD = {
  animal: [
    { w: '', k: '' },
    { w: '흰', k: '흰,하얀,백', d: 1, pos: '흰빛은 깨끗함과 귀함을 뜻해 좋은 기운이 더 맑고 큽니다.', neg: '흰빛이라 해가 크지 않고 곧 지나갑니다.' },
    { w: '검은', k: '검은,까만,흑', d: -1, pos: '검은빛이라 좋은 일에 숨은 걱정이 섞일 수 있으니 꼼꼼히 살피세요.', neg: '검은빛이라 근심이 깊을 수 있으니 미리 대비하세요.' },
    { w: '황금', k: '황금,금빛,누런,노란', d: 1, pos: '황금빛은 큰 재물과 명예를 뜻해 운이 몇 배로 커집니다.', neg: '황금빛이 섞여 있어 걱정 끝에 이득이 남습니다.' },
    { w: '큰', k: '큰,커다란,거대,엄청큰', d: 0, pos: '크기가 클수록 들어오는 복의 규모도 큽니다.', neg: '크기가 클수록 부담도 크니 혼자 떠안지 마세요.' },
    { w: '새끼', k: '새끼,아기,어린', d: 0, pos: '새끼는 시작 단계의 일이나 자녀, 작지만 자라날 기회를 뜻합니다.', neg: '새끼는 아직 작은 문제라는 뜻이니 일찍 다루면 쉽게 풉니다.' },
  ],
  thing: [
    { w: '', k: '' },
    { w: '큰', k: '큰,커다란,거대', d: 0, pos: '크기가 클수록 얻는 것도 큽니다.', neg: '크기가 클수록 부담도 큽니다.' },
    { w: '새', k: '새,새로,새것,새로운', d: 1, pos: '새것은 새로운 시작과 좋은 변화를 뜻합니다.', neg: '새것이라 처음엔 낯설어도 곧 익숙해집니다.' },
    { w: '낡은', k: '낡은,헌,오래된,낡', d: -1, pos: '낡은 것이라 기대보다 작거나 손볼 곳이 있습니다.', neg: '낡은 것은 오래된 근심을 뜻하니 정리할 때입니다.' },
  ],
  place: [
    { w: '', k: '' },
    { w: '큰', k: '큰,커다란,넓은', d: 0, pos: '넓은 곳일수록 활동 무대도 커집니다.', neg: '넓은 곳이라 해결할 일이 많을 수 있습니다.' },
    { w: '새', k: '새,새로,새로운', d: 1, pos: '새로운 곳은 새 출발을 뜻합니다.', neg: '낯선 곳이라 적응할 시간이 필요합니다.' },
  ],
  food: [
    { w: '', k: '' },
    { w: '많은', k: '많은,가득,수북', d: 1, pos: '양이 많을수록 복도 넉넉합니다.', neg: '양이 많을수록 탈도 커지니 조심하세요.' },
  ],
  body: [
    { w: '', k: '' },
    { w: '가족의', k: '가족,엄마,아빠,남편,아내', d: 0, pos: '가족의 몸이니 그 사람에게 생길 일로 보세요.', neg: '가족의 몸이니 그 사람의 건강을 살펴 주세요.' },
  ],
};

// ---------- 꿈에 나온 것 ----------
// [이름(쉼표로 다른 말), 종류, 뜻, 태그(big 탈 것, fly 나는 것, water 물에 사는 것, small 작은 것)]
const SYM_RAW = [
  // 동물
  ['돼지,멧돼지', 'animal', '재물', 'big'], ['소,황소,젖소', 'animal', '재물', 'big'], ['말,백마', 'animal', '권세', 'big'],
  ['호랑이,범', 'animal', '권세', 'big'], ['사자', 'animal', '권세', 'big'], ['용,청룡', 'animal', '권세', 'big fly water'],
  ['뱀,구렁이', 'animal', '재물', ''], ['곰', 'animal', '큰재물', 'big'], ['코끼리', 'animal', '큰재물', 'big'],
  ['개,강아지', 'animal', '협력', ''], ['고양이', 'animal', '유혹', ''], ['쥐,생쥐', 'animal', '손실', 'small'],
  ['토끼', 'animal', '기회', ''], ['원숭이', 'animal', '유혹', ''], ['여우', 'animal', '유혹', ''], ['늑대,이리', 'animal', '경쟁자', ''],
  ['사슴,노루', 'animal', '명예', 'big'], ['양,염소', 'animal', '가정', ''], ['닭,수탉', 'animal', '소식', 'fly'], ['병아리', 'animal', '자녀', 'small'],
  ['오리', 'animal', '가정', 'fly water'], ['거위', 'animal', '가정', 'water'], ['새,참새', 'animal', '소식', 'fly small'], ['까치', 'animal', '소식', 'fly'],
  ['까마귀', 'animal', '근심', 'fly'], ['비둘기', 'animal', '소식', 'fly'], ['독수리,매', 'animal', '권세', 'fly big'], ['학,두루미', 'animal', '장수', 'fly'],
  ['봉황', 'animal', '명예', 'fly'], ['공작', 'animal', '명예', 'fly'], ['부엉이,올빼미', 'animal', '지혜', 'fly'], ['앵무새', 'animal', '소식', 'fly'],
  ['물고기,고기', 'animal', '재물', 'water'], ['잉어', 'animal', '자녀', 'water'], ['붕어', 'animal', '재물', 'water small'], ['금붕어', 'animal', '재물', 'water small'],
  ['메기', 'animal', '큰재물', 'water'], ['장어', 'animal', '건강', 'water'], ['고래', 'animal', '큰재물', 'water big'], ['상어', 'animal', '경쟁자', 'water big'],
  ['거북,거북이', 'animal', '장수', 'water'], ['자라', 'animal', '장수', 'water'], ['게,꽃게', 'animal', '재물', 'water small'], ['새우', 'animal', '재물', 'water small'],
  ['문어', 'animal', '기회', 'water'], ['오징어', 'animal', '기회', 'water'], ['조개', 'animal', '재물', 'water small'], ['개구리', 'animal', '소식', 'water small'],
  ['두꺼비', 'animal', '재물', 'small'], ['악어', 'animal', '위험', 'water big'], ['박쥐', 'animal', '근심', 'fly small'], ['나비', 'animal', '인연', 'fly small'],
  ['벌,꿀벌', 'animal', '재물', 'fly small'], ['말벌', 'animal', '위험', 'fly small'], ['개미', 'animal', '일', 'small'], ['거미', 'animal', '일', 'small'],
  ['지네', 'animal', '재물', 'small'], ['구더기', 'animal', '재물', 'small'], ['바퀴벌레', 'animal', '근심', 'small'], ['파리', 'animal', '구설', 'fly small'],
  ['모기', 'animal', '구설', 'fly small'], ['벌레,애벌레', 'animal', '근심', 'small'], ['지렁이', 'animal', '재물', 'small'], ['달팽이', 'animal', '일', 'small'],
  ['도마뱀', 'animal', '기회', 'small'], ['다람쥐', 'animal', '재물', 'small'], ['하마', 'animal', '큰재물', 'big water'], ['기린', 'animal', '명예', 'big'],
  ['낙타', 'animal', '일', 'big'], ['얼룩말', 'animal', '기회', 'big'], ['펭귄', 'animal', '가정', 'water'], ['판다', 'animal', '귀인', 'big'],
  ['너구리', 'animal', '유혹', ''], ['족제비', 'animal', '손실', 'small'], ['고슴도치', 'animal', '경쟁자', 'small'], ['물개,바다표범', 'animal', '재물', 'water'],
  ['백조', 'animal', '인연', 'fly water'], ['원앙', 'animal', '인연', 'fly water'], ['기러기', 'animal', '소식', 'fly'], ['제비', 'animal', '소식', 'fly small'],
  ['꿩', 'animal', '명예', 'fly'], ['갈매기', 'animal', '소식', 'fly water'], ['해파리', 'animal', '위험', 'water small'], ['불가사리', 'animal', '기회', 'water small'],
  // 사람
  ['조상', 'person', '귀인'], ['할아버지', 'person', '귀인'], ['할머니', 'person', '귀인'], ['아버지,아빠', 'person', '귀인'], ['어머니,엄마', 'person', '가정'],
  ['남편', 'person', '가정'], ['아내', 'person', '가정'], ['아들', 'person', '자녀'], ['딸', 'person', '자녀'], ['아기,갓난아기', 'person', '자녀'],
  ['형,오빠', 'person', '협력'], ['누나,언니', 'person', '협력'], ['동생', 'person', '협력'], ['친구', 'person', '협력'], ['애인,연인', 'person', '인연'],
  ['전 애인,전남친,전여친', 'person', '인연'], ['짝사랑', 'person', '인연'], ['선생님', 'person', '지혜'], ['직장 상사,사장님', 'person', '권세'], ['직장 동료', 'person', '협력'],
  ['대통령', 'person', '권세'], ['왕,임금', 'person', '권세'], ['연예인', 'person', '명예'], ['스님', 'person', '귀인'], ['목사,신부', 'person', '귀인'],
  ['의사', 'person', '건강'], ['경찰', 'person', '권세'], ['군인', 'person', '권세'], ['도둑', 'person', '손실'], ['강도', 'person', '위험'],
  ['귀신', 'person', '근심'], ['저승사자', 'person', '위험'], ['낯선 사람', 'person', '기회'], ['노인', 'person', '장수'], ['거지', 'person', '손실'],
  ['죽은 사람', 'person', '재물'], ['외국인', 'person', '기회'], ['신선,산신령', 'person', '귀인'], ['부처님,예수님', 'person', '귀인'], ['쌍둥이', 'person', '자녀'],
  ['시어머니,시아버지', 'person', '가정'], ['장모,장인', 'person', '가정'], ['사촌,친척', 'person', '협력'], ['이웃', 'person', '협력'], ['손님', 'person', '소식'],
  // 신체
  ['이빨,치아,이', 'body', '가정'], ['머리카락', 'body', '건강'], ['얼굴', 'body', '명예'], ['눈', 'body', '지혜'], ['코', 'body', '재물'],
  ['입', 'body', '소식'], ['귀', 'body', '소식'], ['손', 'body', '일'], ['손가락', 'body', '가정'], ['손톱', 'body', '건강'],
  ['발', 'body', '기회'], ['다리', 'body', '일'], ['배', 'body', '재물'], ['가슴', 'body', '인연'], ['등', 'body', '귀인'],
  ['피부', 'body', '건강'], ['수염', 'body', '권세'], ['혀', 'body', '구설'], ['뼈', 'body', '가정'], ['심장', 'body', '건강'],
  // 물건
  ['돈,지폐', 'thing', '재물'], ['동전', 'thing', '근심'], ['돈다발', 'thing', '큰재물'], ['수표', 'thing', '큰재물'], ['통장', 'thing', '재물'],
  ['금,금덩이', 'thing', '큰재물'], ['금반지', 'thing', '인연'], ['반지', 'thing', '인연'], ['목걸이', 'thing', '명예'], ['귀걸이', 'thing', '소식'],
  ['보석,다이아몬드', 'thing', '큰재물'], ['진주', 'thing', '자녀'], ['시계', 'thing', '기회'], ['열쇠', 'thing', '기회'], ['자물쇠', 'thing', '근심'],
  ['지갑', 'thing', '재물'], ['가방', 'thing', '일'], ['신발,구두', 'thing', '인연'], ['옷', 'thing', '명예'], ['모자', 'thing', '권세'],
  ['안경', 'thing', '지혜'], ['거울', 'thing', '인연'], ['휴대폰,핸드폰', 'thing', '소식'], ['편지', 'thing', '소식'], ['책', 'thing', '지혜'],
  ['도장', 'thing', '권세'], ['문서,계약서', 'thing', '재물'], ['복권,로또', 'thing', '기회'], ['상장,트로피', 'thing', '명예'], ['칼', 'thing', '권세'],
  ['총', 'thing', '권세'], ['우산', 'thing', '귀인'], ['이불', 'thing', '가정'], ['그릇', 'thing', '재물'], ['항아리,독', 'thing', '재물'],
  ['자동차,차', 'thing', '일'], ['자전거', 'thing', '일'], ['오토바이', 'thing', '기회'], ['배(타는 배)', 'thing', '일'], ['비행기', 'thing', '기회'],
  ['꽃다발', 'thing', '인연'], ['선물상자', 'thing', '소식'], ['촛불,초', 'thing', '귀인'], ['등불,전등', 'thing', '지혜'], ['인형', 'thing', '자녀'],
  ['카드', 'thing', '재물'], ['컴퓨터', 'thing', '일'], ['텔레비전', 'thing', '소식'], ['냉장고', 'thing', '재물'], ['쌀자루', 'thing', '재물'],
  ['관', 'thing', '큰재물'], ['부적', 'thing', '귀인'], ['사진', 'thing', '인연'], ['머리빗,빗', 'thing', '건강'], ['약', 'thing', '건강'],
  // 장소
  ['집', 'place', '가정'], ['새집', 'place', '가정'], ['옛날 집', 'place', '가정'], ['아파트', 'place', '가정'], ['화장실', 'place', '재물'],
  ['부엌', 'place', '재물'], ['방', 'place', '가정'], ['학교', 'place', '지혜'], ['회사,직장', 'place', '일'], ['시장', 'place', '재물'],
  ['은행', 'place', '재물'], ['병원', 'place', '건강'], ['절', 'place', '귀인'], ['교회,성당', 'place', '귀인'], ['무덤,산소', 'place', '재물'],
  ['궁궐', 'place', '권세'], ['감옥', 'place', '근심'], ['동굴', 'place', '기회'], ['다리(건너는 다리)', 'place', '기회'], ['계단', 'place', '권세'],
  ['엘리베이터', 'place', '권세'], ['기차역,역', 'place', '기회'], ['공항', 'place', '기회'], ['바닷가', 'place', '재물'], ['시골', 'place', '가정'],
  ['고향', 'place', '가정'], ['식당', 'place', '재물'], ['백화점', 'place', '재물'], ['결혼식장', 'place', '인연'], ['장례식장', 'place', '재물'],
  // 자연
  ['해,태양', 'nature', '명예'], ['달,보름달', 'nature', '인연'], ['별', 'nature', '자녀'], ['무지개', 'nature', '기회'], ['구름', 'nature', '근심'],
  ['하늘', 'nature', '권세'], ['비', 'nature', '재물'], ['눈(내리는 눈)', 'nature', '가정'], ['바람', 'nature', '소식'], ['태풍', 'nature', '위험'],
  ['천둥,번개', 'nature', '명예'], ['안개', 'nature', '근심'], ['물,맑은 물', 'nature', '재물'], ['흙탕물', 'nature', '근심'], ['바다', 'nature', '큰재물'],
  ['강', 'nature', '기회'], ['호수', 'nature', '가정'], ['우물', 'nature', '재물'], ['폭포', 'nature', '권세'], ['산', 'nature', '권세'],
  ['바위', 'nature', '가정'], ['돌', 'nature', '근심'], ['흙,땅', 'nature', '재물'], ['불,불길', 'nature', '큰재물'], ['연기', 'nature', '근심'],
  ['꽃', 'nature', '인연'], ['나무', 'nature', '가정'], ['숲', 'nature', '협력'], ['풀,잔디', 'nature', '기회'], ['나뭇잎,낙엽', 'nature', '소식'],
  ['얼음', 'nature', '근심'], ['홍수', 'nature', '큰재물'], ['지진', 'nature', '위험'], ['모래', 'nature', '손실'], ['소금', 'nature', '재물'],
  // 음식
  ['밥,쌀밥', 'food', '재물'], ['떡', 'food', '재물'], ['고기', 'food', '재물'], ['생선', 'food', '재물'], ['과일', 'food', '자녀'],
  ['사과', 'food', '자녀'], ['복숭아', 'food', '장수'], ['감', 'food', '자녀'], ['밤', 'food', '재물'], ['수박', 'food', '가정'],
  ['포도', 'food', '자녀'], ['딸기', 'food', '인연'], ['고추', 'food', '자녀'], ['마늘', 'food', '건강'], ['국수,면', 'food', '장수'],
  ['빵', 'food', '재물'], ['케이크', 'food', '명예'], ['사탕,과자', 'food', '유혹'], ['술', 'food', '유혹'], ['우유', 'food', '건강'],
  ['달걀,계란', 'food', '자녀'], ['김치', 'food', '가정'], ['국,찌개', 'food', '가정'], ['라면', 'food', '일'], ['약밥,약재', 'food', '건강'],
  ['인삼,산삼', 'food', '건강'], ['꿀', 'food', '재물'], ['잔칫상', 'food', '명예'], ['커피,차', 'food', '소식'], ['아이스크림', 'food', '유혹'],
];

for (const [k, list] of Object.entries(MORE_ACT)) ACT[k].push(...list);
for (const [k, list] of Object.entries(MORE_MOD)) MOD[k] = MOD[k] ? [...MOD[k], ...list] : list;
SYM_RAW.push(...MORE_SYM);
for (const row of SYM_RAW) {
  const first = row[0].split(',')[0];
  if (row[1] === 'person' && PERSON_TAGS[first]) row[3] = PERSON_TAGS[first];
}

export const SYMBOLS = SYM_RAW.map(([names, kind, meaning, tags = '']) => {
  const keys = names.split(',');
  const name = keys[0].replace(/\(.*\)/, '');
  return { name, keys: keys.map((k) => k.replace(/\(.*\)|\s/g, '')), kind, meaning, tags: tags.split(' ').filter(Boolean) };
});

const KIND_LABEL = { animal: '동물', person: '사람', body: '신체', thing: '물건', place: '장소', nature: '자연', food: '음식' };
export const GEN_CATEGORIES = Object.values(KIND_LABEL);
export const kindLabel = (k) => KIND_LABEL[k];

function tagOk(a, sym) {
  if (!a.tag || a.tag === 'bite') return true;
  if (a.tag === 'land') return !sym.tags.includes('water');
  return sym.tags.includes(a.tag);
}
// 모양과 어울리지 않는 상황은 뺀다 (새끼 돼지가 새끼를 낳는 꿈 등)
const modOk = (a, mod) => !mod || !mod.w || !a.noMod || (a.noMod !== true && !a.noMod.includes(mod.w));

export function actionsFor(sym, mod) {
  return ACT[sym.kind].filter((a) => tagOk(a, sym) && modOk(a, mod));
}
export function modifiersFor(sym) {
  return (MOD[sym.kind] || [{ w: '', k: '' }])
    .filter((m) => (!m.notTag || !sym.tags.includes(m.notTag)) && (!m.onlyTag || sym.tags.includes(m.onlyTag)));
}
/** 상징 하나로 만들 수 있는 풀이 수 */
export function comboCount(sym) {
  return modifiersFor(sym).reduce((n, m) => n + actionsFor(sym, m).length, 0);
}

export const GEN_COUNT = SYMBOLS.reduce((a, s) => a + comboCount(s), 0);

// ---------- 풀이 만들기 ----------

const genHash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const pick = (arr, seed) => arr[seed % arr.length];

const ADVICE = {
  good: ['좋은 흐름이니 미루던 일을 시작해 보세요.', '기회가 왔을 때 망설이지 말고 잡으세요.', '주변에 감사하는 마음을 가지면 복이 더 커집니다.', '들뜨지 말고 차분히 준비하면 결과가 더 좋습니다.'],
  bad: ['큰 결정은 잠시 미루고 주변을 살피세요.', '지출과 약속을 꼼꼼히 확인하세요.', '무리하지 말고 한 걸음 물러서 지켜보세요.', '미리 대비하면 큰 탈 없이 지나갑니다.'],
  mid: ['좋고 나쁨이 섞여 있으니 신중하게 처신하세요.', '흐름을 지켜보며 차분히 대응하세요.'],
};

function luckOf(type, pol) {
  switch (type) {
    case 'come': case 'rise': return pol > 0 ? 2 : 0;
    case 'go': case 'fall': return pol > 0 ? 0 : 2;
    case 'win': return 2;
    case 'chase': return pol > 0 ? 2 : 0;
    case 'mixed': return pol > 0 ? 1 : 2;
    default: return 1;
  }
}

function effectLine(type, m, subj, person) {
  const pos = m.pol > 0;
  switch (type) {
    case 'come': return pos ? `${josa(m.desc, '이가')} 나에게 들어오는 모양입니다. ${m.come}` : `${josa(m.desc, '이가')} 가까이 다가오는 모양입니다. ${m.come}`;
    case 'rise': return pos ? `${josa(m.desc, '이가')} 크게 불어나는 꿈입니다. ${m.come}` : `${josa(m.desc, '이가')} 커지는 꿈이니 조심해야 합니다. ${m.come}`;
    case 'go': return pos ? `${josa(m.desc, '이가')} 빠져나가는 모양입니다. ${m.go}` : `${josa(m.desc, '이가')} 멀어지는 모양입니다. ${m.go}`;
    case 'fall': return pos ? `${josa(m.desc, '이가')} 약해지는 꿈입니다. ${m.go}` : `${josa(m.desc, '이가')} 힘을 잃는 꿈입니다. ${m.go}`;
    case 'win': return pos ? `${josa(m.desc, '을를')} 내 손에 넣는 꿈입니다. ${m.come}` : `${josa(m.desc, '을를')} 이겨 내는 꿈입니다. ${m.go}`;
    case 'chase': return pos ? `${josa(m.desc, '이가')} 나를 따라오는 꿈입니다. 피하지 말고 받아들이면 ${m.come}` : `${josa(m.desc, '이가')} 나를 압박하는 꿈입니다. ${m.come}`;
    case 'mixed': if (person) return `꿈에서 사람이 죽는 것은 실제로는 그 사람이 오래 살고 묵은 근심이 끝나 새로 시작한다는 반대의 뜻으로 풀이합니다. ${m.come}`;
      return pos
      ? `${josa(subj, '이가')} 죽는 꿈은 그 기운이 다해 약해진다는 풀이와, 그 복이 내 것으로 확정된다는 풀이가 함께 있습니다. 내가 거둔 것이라면 길하고, 저절로 잃은 것이라면 ${m.go}`
      : `${josa(m.desc, '이가')} 끝나는 꿈입니다. ${m.go}`;
    default: return `${josa(m.desc, '과와')} 관련된 일이 생길 조짐입니다.`;
  }
}

/** 상징·상황·모양 하나의 풀이 */
export function interpret(sym, act, mod = { w: '' }) {
  const m = MEANING[sym.meaning];
  const subj = !mod.w ? sym.name : mod.after ? `${sym.name} ${mod.w}` : `${mod.w} ${sym.name}`;
  const title = fill(act.t, subj).replace('  ', ' ');
  let luck = act.type === 'mixed' && sym.kind === 'person' ? 2 : luckOf(act.type, m.pol);
  if (mod.d && luck !== 1) luck = Math.max(0, Math.min(2, luck + (luck === 2 && mod.d < 0 ? -1 : luck === 0 && mod.d > 0 ? 1 : 0)));
  const seed = genHash(title);
  const parts = [
    `${josa(sym.name, '은는')} ${josa(m.desc, '을를')} 상징합니다.`,
    effectLine(act.type, m, subj, sym.kind === 'person'),
  ];
  if (act.note) parts.push(act.note);
  if (mod.w) parts.push(m.pol > 0 && luck > 0 ? mod.pos : mod.neg);
  parts.push(pick(luck === 2 ? ADVICE.good : luck === 0 ? ADVICE.bad : ADVICE.mid, seed));
  return { title, luck, text: parts.join(' ') };
}

// ---------- 검색 ----------

function genNormalize(q) {
  return (q || '').replace(/\s+/g, '').replace(/꿈(을|이|에서|속)?$/, '').replace(/(으면|면)$/, '');
}

// 모양 낱말(흰·황금·새끼 …)을 앞에서 떼어 낸다
const MOD_WORDS = [...new Set(Object.values(MOD).flat().flatMap((m) => (m.k ? m.k.split(',') : [])))].sort((a, b) => b.length - a.length);
function stripMod(token) {
  for (const w of MOD_WORDS) if (token.length > w.length && token.startsWith(w)) return token.slice(w.length);
  return token;
}

const ONE_JOSA = new Set(['', '이', '가', '을', '를', '은', '는', '에', '에서', '에게', '의', '와', '과', '도', '만', '랑', '이랑', '으로', '로', '한테', '꿈']);

// 낱말 앞머리가 상징 이름과 맞는 것 (뱀에게 → 뱀, 에게의 '게'는 맞추지 않는다)
function findSymbols(query) {
  const tokens = (query || '').split(/\s+/).filter(Boolean).map(stripMod);
  const out = [];
  for (const t of tokens) {
    let best = null;
    for (const sym of SYMBOLS) for (const k of sym.keys) {
      if (t.startsWith(k) && (k.length > 1 || ONE_JOSA.has(t.slice(1))) && (!best || k.length > best.key.length)) best = { sym, key: k };
    }
    if (best) for (const sym of SYMBOLS) if (sym.keys.includes(best.key)) out.push({ sym, key: best.key });
  }
  // 띄어쓰기 없이 친 경우: 가장 긴 낱말이 들어 있는 상징
  if (!out.length) {
    const q = genNormalize(query);
    for (const sym of SYMBOLS) {
      const key = sym.keys.filter((k) => q.includes(k)).sort((a, b) => b.length - a.length)[0];
      if (key) out.push({ sym, key });
    }
    const maxLen = Math.max(0, ...out.map((f) => f.key.length));
    return out.filter((f) => f.key.length === maxLen);
  }
  return out;
}

/**
 * 검색어에서 상징·모양·상황을 찾아 맞는 풀이를 돌려준다
 * @returns {{sym, mod, results:{title,luck,text,hit}[]}[]}
 */
export function searchGenerated(query, limit = 6) {
  const q = genNormalize(query);
  if (!q) return [];
  const found = [];
  for (const f of findSymbols(query)) if (!found.some((x) => x.sym === f.sym)) found.push(f);
  const groups = found.slice(0, 4).map(({ sym, key }) => {
    const mods = modifiersFor(sym);
    let modWord = '';
    const mod = mods.find((md) => md.w && md.k.split(',').some((w) => q.includes(w) && (modWord = w))) || mods[0];
    // 상황은 상징·모양 낱말을 뺀 나머지로 찾는다 (돌아가신 할머니 → '돌아가'를 죽음으로 보지 않게)
    const rest = q.replace(key, '').replace(modWord, '');
    const scored = actionsFor(sym, mod).map((a) => {
      const score = a.k.split(',').reduce((n, w) => n + (rest.includes(w) ? w.length : 0), 0);
      return { a, score };
    }).sort((x, y) => y.score - x.score);
    const best = scored[0].score;
    const chosen = best > 0 ? scored.filter((x) => x.score > 0).slice(0, limit) : scored.slice(0, limit);
    return {
      sym, mod, best,
      results: chosen.map(({ a, score }) => ({ ...interpret(sym, a, mod), hit: best > 0 && score === best })),
    };
  });
  // 처음 나온 상징이 주인공, 뒤에 나온 상징은 상황까지 맞을 때만 덧붙인다
  return groups.filter((g, i) => i === 0 || (g.best > 0 && g.sym.keys.some((k) => groups[0].sym.keys.includes(k))));
}
