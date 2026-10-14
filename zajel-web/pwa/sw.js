const BUILD_VERSION = "__BUILD_VERSION__";
const SHELL_CACHE = "zajel-pwa-shell-" + BUILD_VERSION;
const ASSET_CACHE = "zajel-pwa-assets-" + BUILD_VERSION;
const SHELL_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icons/zajel-192.png",
  "/icons/zajel-icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith("zajel-pwa-") &&
          key !== SHELL_CACHE && key !== ASSET_CACHE)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Operational data and authentication must always come live from the server.
  if (url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/auth/") ||
      url.pathname.includes("/login") ||
      url.pathname.includes("/token")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put("/", copy)).catch(() => {});
          }
          return response;
        })
        .catch(async () => (await caches.match("/")) || Response.error())
    );
    return;
  }

  const isStatic = url.pathname.startsWith("/_expo/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    /\.(?:js|css|png|jpg|jpeg|svg|webp|woff2?|ttf)$/i.test(url.pathname);

  if (!isStatic) return;
  // Network-first keeps published web bundles current; cached assets are offline fallback only.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(async () => (await caches.match(request)) || Response.error())
  );
});
