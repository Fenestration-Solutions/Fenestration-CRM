const CACHE_NAME = 'fenestration-v2';
const STATIC_ASSETS = [
    './index.html', './offline.html', './src/styles.css',
    './src/app.js', './src/db.js', './src/api.js', './src/canvas.js',
    './manifest.json',
    'https://cdn.jsdelivr.net/npm/idb@8/build/umd.js',
    'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
});

self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request).then(res => res || caches.match('./offline.html')))
    );
});