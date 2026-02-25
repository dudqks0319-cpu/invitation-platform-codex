const CACHE_VERSION = "invitation-pwa-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const STATIC_ASSETS = [
  "/",
  "/styles.css",
  "/manifest.json",
  "/favicon.svg",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/js/pwa.js",
  "/js/templates.js",
  "/js/builder.js",
  "/js/invite-view.js",
  "/js/admin.js",
  "/index.html",
  "/invite.html",
  "/admin.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key.startsWith("invitation-pwa-") && key !== STATIC_CACHE)
        .map((key) => caches.delete(key)),
    )),
  );
  self.clients.claim();
});

async function networkFirst(request, fallbackPath = "/") {
  const cache = await caches.open(STATIC_CACHE);

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    const cached = await cache.match(request);
    if (cached) return cached;
    const fallback = await cache.match(fallbackPath);
    return fallback || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    });

  if (cached) {
    networkPromise.catch(() => undefined);
    return cached;
  }

  try {
    return await networkPromise;
  } catch (_) {
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate" || url.pathname.startsWith("/i/")) {
    event.respondWith(networkFirst(request, "/index.html"));
    return;
  }

  const isStaticAsset = ["style", "script", "image", "font", "manifest"].includes(request.destination);

  if (isStaticAsset) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(networkFirst(request));
});
