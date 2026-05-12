const CACHE_NAME = "kademe-pwa-v3";
const OFFLINE_URL = "/offline";
/** Sadece bu yollar precache + (istege bagli) ag basarisizliginda cache'den sunulur. */
const STATIC_ASSETS = ["/", OFFLINE_URL, "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

/**
 * Next.js App Router + Server Actions / RSC ile uyum:
 * Dinamik sayfa HTML'ini cache'lemeyin; aksi halde eski build'deki action ID'leri
 * yeni deployment'ta "Failed to find Server Action" hatasina yol acar.
 * Sadece GET + listedeki statik varliklar ve navigate offline fallback.
 */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const isApiRequest = url.pathname.startsWith("/api/");
  const expectsJson = request.headers.get("accept")?.includes("application/json");
  const isNextData = url.pathname.startsWith("/_next/");
  const isNavigation = request.mode === "navigate";

  if (!sameOrigin || isApiRequest || expectsJson || isNextData) {
    return;
  }

  const path = url.pathname;
  const isStaticPrecache = STATIC_ASSETS.some(
    (p) => path === p || (p !== "/" && path.startsWith(p)),
  );

  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(async () => {
          const cached = await caches.match(OFFLINE_URL);
          if (cached) return cached;
          return new Response("Offline", {
            status: 503,
            statusText: "Offline",
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }),
    );
    return;
  }

  if (!isStaticPrecache) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response("Offline", {
          status: 503,
          statusText: "Offline",
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }),
  );
});
