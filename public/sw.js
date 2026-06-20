const CACHE_NAME = "menu-qr-v1";
const PRECACHE = ["/", "/offline"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // No cachear API ni SSE
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/api/events")) return;

  e.respondWith(
    fetch(request)
      .then((res) => {
        // Cachear páginas y assets exitosos
        if (res.ok && (url.origin === self.location.origin)) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || caches.match("/offline"))
      )
  );
});
