/* =============================================================
 * sw.js — Service Worker WebGIS Pertanahan
 * Cache aset agar aplikasi tetap jalan offline di lapangan.
 * Strategi:
 *   - App shell (HTML/CSS/JS lokal): cache-first.
 *   - Tile peta (Google/Esri/OSM): network-first, simpan salinan
 *     supaya area yang pernah dibuka tetap muncul saat offline.
 * ============================================================= */
const VERSION = "v3.1.0";
const SHELL_CACHE = "gis-shell-" + VERSION;
const TILE_CACHE = "gis-tiles-" + VERSION;

const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/geo.js",
  "./js/storage.js",
  "./js/data.js",
  "./js/app.js",
  "./js/gps.js",
  "./js/ui.js",
  "./icons/icon.svg",
  "./manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== TILE_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

function isTile(url) {
  return /tile|mt[0-9]\.google|server\.arcgisonline|tile\.openstreetmap/i.test(url);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Jangan campuri API backend (selalu butuh data terbaru).
  if (req.url.includes("/api/")) return;

  if (isTile(req.url)) {
    // network-first untuk tile
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(TILE_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // cache-first untuk app shell + lib CDN
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && (res.type === "basic" || res.type === "cors")) {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
