/* =============================================================
 * sw.js — Service Worker WebGIS Pertanahan
 * Cache aset agar aplikasi tetap jalan offline di lapangan.
 * Strategi:
 *   - App shell (HTML/CSS/JS lokal): cache-first.
 *   - Tile peta (Google/Esri/OSM): network-first, simpan salinan
 *     supaya area yang pernah dibuka tetap muncul saat offline.
 * ============================================================= */
const VERSION = "v6.2.0";
const SHELL_CACHE = "gis-shell-" + VERSION;
const TILE_CACHE = "gis-tiles-" + VERSION;

const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./css/style.css?v=61",
  "./js/geo.js?v=61",
  "./js/geocode.js?v=61",
  "./js/storage.js?v=61",
  "./js/data.js?v=61",
  "./js/crypto.js?v=61",
  "./js/timestamp.js?v=61",
  "./js/evidence.js?v=61",
  "./js/field.js?v=61",
  "./js/report.js?v=61",
  "./js/photo.js?v=61",
  "./js/gdrive-config.js?v=61",
  "./js/app.js?v=61",
  "./js/gps.js?v=61",
  "./js/proof-panel.js?v=61",
  "./js/visit-panel.js?v=61",
  "./js/gdrive.js?v=61",
  "./js/ui.js?v=61",
  "./verify.html",
  "./icons/icon.svg",
  "./manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  // Pra-prefetch shell utk offline, lalu aktifkan SW baru segera.
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((c) => c.addAll(SHELL_ASSETS))
      .catch(() => { /* offline-prefetch boleh gagal */ })
      .then(() => self.skipWaiting())
  );
});

// Terima SKIP_WAITING agar SW baru langsung diambil alih tanpa reload manual.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
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

  // ABAI request non-http(s) (mis. chrome-extension://, data:, file:).
  // caches.put() crash jika scheme tidak didukung.
  let scheme;
  try { scheme = new URL(req.url).protocol; } catch (e) { return; }
  if (scheme !== "https:" && scheme !== "http:") return;

  // Jangan campuri API backend (selalu butuh data terbaru).
  if (req.url.includes("/api/")) return;

  // Navigasi (halaman utama / index.html / verify.html) SELALU ambil fresh
  // dari network — JANGAN pernah sajikan HTML lama dari cache. Ini memutus
  // masalah "SW lama menyajikan index.html versi lama" saat update.
  // Cache HTML hanya dipakai saat truly offline (network gagal).
  const mode = req.mode;
  const url = new URL(req.url);
  const isNavigation =
    mode === "navigate" ||
    url.pathname === "/" ||
    url.pathname === "/index.html" ||
    url.pathname === "/verify.html";
  if (isNavigation) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            // simpan utk offline, tapi selalunya kita fetch ulang
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then(
            (c) =>
              c ||
              caches.match("/index.html").then((r) => r || Response.error())
          )
        )
    );
    return;
  }

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

  // network-first untuk app shell + lib CDN: online selalu ambil terbaru,
  // cache hanya jadi fallback saat offline. Ini menghilangkan bug
  // "layar lama karena cache" pada update CSS/JS.
  const isHtml = req.headers.get("accept") && req.headers.get("accept").includes("text/html");
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && (res.type === "basic" || res.type === "cors")) {
          const copy = res.clone();
          // html tidak di-cache permanen (agar selalu segar); aset lain di-cache utk offline
          if (!isHtml) caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then(
          (cached) =>
            cached ||
            (isHtml
              ? caches.match("./index.html").then((r) => r || Response.error())
              : Response.error())
        )
      )
  );
});
