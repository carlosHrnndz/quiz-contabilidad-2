const CACHE_NAME = 'contaquiz2-v1';

const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './css/style.css',
    './js/app.js',
];

const DATA_ASSETS = [
    './data/questions_index.json',
    './data/unidad-1.json',
    './data/unidad-2.json',
    './data/unidad-3.json',
    './data/unidad-4.json',
    './data/unidad-5.json',
    './data/unidad-6.json',
    './data/unidad-7.json',
    './data/unidad-8.json',
    './data/unidad-9.json',
    './data/unidad-10.json',
    './data/unidad-11.json',
    './data/unidad-12.json',
    './data/unidad-13.json',
    './data/unidad-14.json',
    './data/unidad-15.json',
];

// Install — cache everything
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            cache.addAll([...STATIC_ASSETS, ...DATA_ASSETS])
        )
    );
});

// Activate — clear old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// Fetch — cache-first for static & data, network-first for Firebase
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Always go to network for Firebase (auth, db, analytics)
    if (url.hostname.includes('firebaseio.com') || url.hostname.includes('googleapis.com')) {
        return; // let browser handle it normally
    }

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                // Cache new successful responses
                if (response && response.status === 200 && response.type === 'basic') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => {
                // Offline fallback for navigation
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
