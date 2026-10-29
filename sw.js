// 오프라인 캐시 — 파일을 바꾸면 VERSION을 올려 주세요
const VERSION = 'saju-v8';
const ASSETS = [
  './',
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'js/app.js',
  'js/config.js',
  'js/saju.js',
  'js/lunar-data.js',
  'js/content.js',
  'js/reading.js',
  'js/tojung.js',
  'js/tojung-data.js',
  'js/zodiac-life.js',
  'js/dreams.js',
  'js/dreams-animals.js',
  'js/dreams-people.js',
  'js/dreams-world.js',
  'js/hanja-data.js',
  'js/naming.js',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
