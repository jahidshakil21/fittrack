const CACHE_NAME = 'fittrack-shell-v10';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './assets/icons/favicon.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-512-maskable.png',
  './assets/vendor/chart.umd.min.js',
  './css/tokens.css',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './js/app.js',
  './js/db/indexeddb.js',
  './js/data/exercises.js',
  './js/data/workoutPlans.js',
  './js/utils/calculations.js',
  './js/utils/date.js',
  './js/utils/validation.js',
  './js/utils/ui.js',
  './js/views/dashboard.js',
  './js/views/workouts.js',
  './js/views/weight.js',
  './js/views/nutrition.js',
  './js/views/water.js',
  './js/views/exercises.js',
  './js/views/plans.js',
  './js/views/timer.js',
  './js/views/profile.js',
  './js/views/settings.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
