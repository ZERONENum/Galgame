// Service Worker for 栖式特调 - 离线缓存
const CACHE_NAME = 'qishiteqiao-v1';
const CACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/main.js',
  './js/assets.js',
  './js/engine.js',
  './js/story.js',
  './js/story/_registry.js',
  './js/story/prologue.js',
  './js/story/common_01.js',
  './js/story/common_02.js',
  './js/story/chap_03_march.js',
  './js/story/common_04.js',
  './js/story/common_05.js',
  './js/story/chap_06_june.js',
  './js/story/common_07.js',
  './js/story/chap_08_august.js',
  './js/story/common_09.js',
  './js/story/chap_10_october.js',
  './js/story/common_11.js',
  './js/story/common_12.js',
  './js/story/common_split.js',
  './js/story/route_shiraishi.js',
  './js/story/route_sato.js',
  './js/story/route_saionji.js',
  './js/story/route_mizuno.js',
  './js/story/finale.js',
  './js/story/childhood/_registry.js',
  './js/story/childhood/childhood_01_rainbow.js',
  './js/story/childhood/childhood_02_tears.js',
  './js/story/childhood/childhood_03_silverwing.js',
  './js/story/childhood/childhood_04_enamel.js',
  './js/story/childhood/childhood_05_rooster.js',
  './js/story/childhood/childhood_end.js',
  './js/story/childhood/childhood_side01_candybox.js',
  './js/story/childhood/childhood_side02_lemon.js',
  './js/story/childhood/childhood_side03_plane.js',
  './js/story/childhood/childhood_side04_button.js',
  './js/story/childhood/story.js'
];

// 安装阶段
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(CACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// 激活阶段
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// 拦截请求，优先从缓存读取
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // 只缓存同源请求
  if (url.origin !== location.origin) return;
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // 有缓存：先返回缓存，然后后台更新
          const fetchPromise = fetch(event.request)
            .then((response) => {
              if (response && response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => cache.put(event.request, responseClone));
              }
              return response;
            })
            .catch(() => cachedResponse);
          return cachedResponse;
        }
        
        // 无缓存：尝试网络请求，失败则返回首页
        return fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(event.request, responseClone));
            }
            return response;
          })
          .catch(() => {
            return caches.match('./index.html');
          });
      })
  );
});