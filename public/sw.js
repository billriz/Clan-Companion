const CACHE_VERSION = "plateplan-static-v1";
const STATIC_CACHE = CACHE_VERSION;
const CACHE_PREFIX = "plateplan-static-";

const PRECACHE_URLS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-192.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(PRECACHE_URLS);
    })(),
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== STATIC_CACHE)
          .map((key) => caches.delete(key)),
      );

      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  if (request.cache === "only-if-cached" && request.mode !== "same-origin") {
    return;
  }

  const requestUrl = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  if (shouldBypassCaching(request, requestUrl)) {
    return;
  }

  if (!isCacheableStaticAsset(request, requestUrl)) {
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

function shouldBypassCaching(request, requestUrl) {
  if (request.headers.has("authorization")) {
    return true;
  }

  if (requestUrl.origin !== self.location.origin) {
    return true;
  }

  const pathname = requestUrl.pathname;

  if (pathname.startsWith("/api/")) {
    return true;
  }

  if (pathname.startsWith("/_next/image")) {
    return true;
  }

  if (pathname.startsWith("/auth/")) {
    return true;
  }

  if (pathname === "/sw.js") {
    return true;
  }

  return false;
}

function isCacheableStaticAsset(request, requestUrl) {
  const pathname = requestUrl.pathname;

  if (pathname.startsWith("/_next/static/")) {
    return true;
  }

  if (
    pathname === "/manifest.webmanifest" ||
    pathname === "/offline.html" ||
    pathname === "/apple-touch-icon.png" ||
    pathname === "/icon-192.png" ||
    pathname === "/icon-512.png" ||
    pathname === "/icon-maskable-192.png" ||
    pathname === "/icon-maskable-512.png" ||
    pathname === "/favicon.ico"
  ) {
    return true;
  }

  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "font" ||
    request.destination === "worker"
  ) {
    return true;
  }

  return /\.(?:css|js|mjs|woff2?|ttf|otf|eot|ico|webmanifest)$/i.test(pathname);
}

async function handleNavigationRequest(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(STATIC_CACHE);
    const offlineResponse = await cache.match("/offline.html");

    if (offlineResponse) {
      return offlineResponse;
    }

    return new Response("You are offline.", {
      status: 503,
      statusText: "Offline",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  const networkResponsePromise = fetch(request)
    .then((response) => {
      if (!response || !response.ok || response.type !== "basic") {
        return response;
      }

      const cacheControl = response.headers.get("cache-control");
      if (cacheControl && /no-store|private/i.test(cacheControl)) {
        return response;
      }

      cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await networkResponsePromise;

  if (networkResponse) {
    return networkResponse;
  }

  return new Response("Network unavailable.", {
    status: 504,
    statusText: "Gateway Timeout",
  });
}
