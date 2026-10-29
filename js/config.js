// 앱 기본 설정. 쿠팡 파트너스 링크를 받으면 여기에 넣고 다시 빌드한다.
// (앱의 설정 화면에서 바꾼 값이 있으면 그 값이 우선)
export const APP_CONFIG = {
  coupangUrl: 'https://link.coupang.com/a/hTSmW4HeI8',
  bannerText: '오늘의 특가 보러 가기',
  // true면 앱을 켤 때마다 배너를 한 번 눌러야 사주풀이·토정비결·꿈해몽·작명을 쓸 수 있다
  lock: true,
  // 원격 배너 목록: 이 파일(저장소의 ads.json)을 고치면 앱을 다시 만들지 않아도 링크가 바뀐다
  adsUrl: 'https://raw.githubusercontent.com/insu9732-art/Test-insu/claude/saju-mobile-app-jxaxvl/ads.json',
};

// 쿠팡 파트너스 활동 고지 문구 (파트너스 링크를 쓰는 곳에 반드시 표시)
export const COUPANG_NOTICE = '이 앱은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.';
