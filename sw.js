/** TETA Service Worker — offline caching */

const CACHE_NAME = 'teta-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/css/tokens.css',
  '/css/base.css',
  '/css/components.css',
  '/css/screens.css',
  '/css/animations.css',
  '/js/app.js',
  '/js/core/app-controller.js',
  '/js/core/router.js',
  '/js/core/state.js',
  '/js/core/storage.js',
  '/js/core/event-bus.js',
  '/js/core/i18n.js',
  '/js/engine/trainer.js',
  '/js/engine/difficulty.js',
  '/js/engine/number-generator.js',
  '/js/engine/session.js',
  '/js/engine/bsi-calculator.js',
  '/js/screens/splash-screen.js',
  '/js/screens/training-screen.js',
  '/js/screens/complete-screen.js',
  '/js/screens/home-screen.js',
  '/js/screens/settings-screen.js',
  '/js/screens/onboarding-screen.js',
  '/js/components/theta-logo.js',
  '/js/components/numpad.js',
  '/js/components/pro-modal.js',
  '/js/components/swipe-slider.js',
  '/js/audio/audio-manager.js',
  '/js/utils/timing.js',
  '/js/utils/math.js',
  '/js/data/locales/uk.js',
  '/js/data/locales/en.js',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Update cache with fresh response
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
