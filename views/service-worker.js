'use strict';

var CACHE = '<%= locals.cachebuster %>';

const CACHE_LIST = [
    '/',
    '/images/launch.png',
    '/images/apple-touch-icon-57x57.png',
    '/images/apple-touch-icon-60x60.png',
    '/images/apple-touch-icon-72x72.png',
    '/images/apple-touch-icon-76x76.png',
    '/images/apple-touch-icon-114x114.png',
    '/images/apple-touch-icon-120x120.png',
    '/images/apple-touch-icon-144x144.png',
    '/images/apple-touch-icon-152x152.png',
    '/images/apple-touch-icon-180x180.png',
    '/images/favicon-32x32.png',
    '/images/android-chrome-192x192.png',
    '/images/favicon-96x96.png',
    '/images/favicon-16x16.png',
    '/manifest.json',
    '/images/favicon.ico',
    '/images/mstile-144x144.png',
    '/css/ui-darkness/jquery-ui.min.css',
    '/css/jquery.tooltips.css',
    '/audio/alarm.mp3',
    '/audio/alarm2.mp3',
    '/css/ui-darkness/images/ui-icons_ffffff_256x240.png',
    '/css/ui-darkness/images/ui-icons_cccccc_256x240.png',
    '/css/ui-darkness/images/ui-bg_inset-soft_25_000000_1x100.png',
    '/css/ui-darkness/images/ui-bg_gloss-wave_25_333333_500x100.png',
    '/css/main.css',
    '/bundle/js/bundle.app.js',
    '/bundle/js/bundle.clock.js',
    '/bundle/js/bundle.report.js',
    '/socket.io/socket.io.js',
    '/js/client.js',
    '/images/logo2.png'
];

// Open a cache and use `addAll()` with an array of assets to add all of them
// to the cache. Return a promise resolving when all the assets are added.
function precache() {
  return caches.open(CACHE).then(function (cache) {
    // if any cache requests fail, don't interrupt other requests in progress
    return Promise.allSettled(
      CACHE_LIST.map((url) => {
        // `no-store` in case of partial content responses and
        // because we're making our own cache
        let request = new Request(url, { cache: 'no-store' });
        return fetch(request).then((response) => {
          // console.log('Caching response', url, response);
          cache.put(url, response);
        }).catch((err) => {
          console.log('Could not precache asset', url, err);
        });
      })
    );
  });
}

// Open the cache where the assets were stored and search for the requested
// resource. Notice that in case of no matching, the promise still resolves
// but it does with `undefined` as value.
function fromCache(request) {
  return caches.open(CACHE).then(function (cache) {
    return cache.match(request).then(function (matching) {
      return matching || Promise.reject('no-match');
    });
  });
}

// Update consists in opening the cache, performing a network request and
// storing the new response data.
function update(request) {
  return caches.open(CACHE).then(function (cache) {
    return fetch(request).then(function (response) {
      return cache.put(request, response);
    });
  });
}

// Try to read the requested resource from cache.
// If the requested resource does not exist in the cache, fetch it from
// network and cache the response.
function fromCacheOrUpdate(request) {
  return caches.open(CACHE).then(function (cache) {
    return cache.match(request).then(function (cacheResponse) {
      return cacheResponse || fetch(request).then(function (netResponse) {
        cache.put(request, netResponse.clone());
        return netResponse;
      });
    });
  });
}

// On install, cache some resources.
self.addEventListener('install', function(evt) {
  console.log('The service worker is being installed.');
  evt.waitUntil(precache());
});

function inCache(request) {
  let found = false;
  CACHE_LIST.forEach( function (e) {
    if (request.url.endsWith(e)) {
      found = true;
    }
  });
  return found;
}

self.addEventListener('fetch', function(evt) {
  if (!evt.request.url.startsWith(self.location.origin) || CACHE === 'developmentMode' || !inCache(evt.request) || evt.request.method !== 'GET') {
    // console.log('Skipping cache for', evt.request.url);
    evt.respondWith(fetch(evt.request));
  } else {
    var request = evt.request;
    if (evt.request.headers.has('Range')) {
      // Firefox will give an error if it tries to store partial content (206) responses in the cache.
      // To mitigate this, strip the `Range` header from the request so a full document (200) is returned.
      var strippedHeaders = new Headers(evt.request.headers).delete('Range');
      request = new Request(evt.request, { headers: strippedHeaders });
    }
    // console.log('Using cache for', evt.request);
    evt.respondWith(fromCacheOrUpdate(request));
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return cacheNames.filter((cacheName) => CACHE !== cacheName);
    }).then((unusedCaches) => {
      //console.log('DESTROYING CACHE', unusedCaches.join(','));
      return Promise.all(unusedCaches.map((unusedCache) => {
        return caches.delete(unusedCache);
      }));
    }).then(() => self.clients.claim())
  );
});