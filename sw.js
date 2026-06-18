const CACHE_NAME = "attendance-cache-v1";
const FILES_TO_CACHE = [
  "scanner.html",
  "scanner.js",
  "supabase.js",
  "auth.js",
  "offline-db.js",
  "sync.js",
  "style.css",
  "manifest.json",
  "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});