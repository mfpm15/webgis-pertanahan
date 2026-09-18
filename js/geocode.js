/* =============================================================
 * geocode.js — Reverse geocoding (Nominatim / OpenStreetMap)
 * -------------------------------------------------------------
 * Mengubah koordinat -> nama lokasi (desa/kecamatan/kab/prov).
 * Dipakai untuk auto-isi atribut bidang yang dibuat dari GPS.
 *
 * - Gratis, tanpa API key (Nominatim OSM).
 * - Cache di localStorage + rate-limit (1 req / 1,1 dtk) agar
 *   sopan terhadap usage policy Nominatim.
 * - Best-effort: bila offline / gagal, dipanggil tetap aman.
 *
 * window.GeoCode = { fetchReverse(lat, lon) -> { address, cached } }
 * ============================================================= */
(function () {
  "use strict";

  const CACHE_KEY = "webgis_geocode_cache";
  let lastCall = 0;

  function loadCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveCache(c) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch (e) { /* kuota penuh, abaikan */ }
  }

  /** Jaga jarak antar request (policy Nominatim: maks ~1 req/detik). */
  function rateLimit() {
    const wait = Math.max(0, (lastCall + 1100) - Date.now());
    lastCall = Date.now();
    return new Promise((r) => setTimeout(r, wait));
  }

  /**
   * Reverse geocode lat/lon. Mengembalikan { address, cached }.
   * address = { desa, kecamatan, kabupaten, provinsi, negara, displayName }
   */
  async function fetchReverse(lat, lon) {
    const cache = loadCache();
    const key = (Math.round(lat * 1e5) / 1e5) + "," + (Math.round(lon * 1e5) / 1e5);
    if (cache[key]) return { address: cache[key], cached: true };

    await rateLimit();
    const url =
      "https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=" +
      encodeURIComponent(lat) + "&lon=" + encodeURIComponent(lon);

    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Nominatim HTTP " + res.status);
    const data = await res.json();
    const a = data.address || {};

    // Pemetaan heuristik struktur admin OSM Indonesia.
    // OSM tidak konsisten antar wilayah (mis. DKI: provinsi ada di key "city",
    // kecamatan bisa di "district" atau "suburb"), jadi pakai urutan prioritas.
    const prov = a.state || a.city || a.region || "";
    const kab =
      a.county ||
      ((/^(kota|kab)/i.test(a.city || "")) && a.city !== prov ? a.city : "") ||
      a.city_district ||
      (a.city && a.city !== prov ? a.city : "") ||
      "";
    const kec = a.district || (a.village ? a.suburb : "") || a.suburb || "";
    const desa = a.village || (a.district ? a.suburb : "") || a.hamlet || a.suburb || "";

    const address = {
      desa: desa,
      kecamatan: kec,
      kabupaten: kab,
      provinsi: prov,
      negara: a.country || "",
      displayName: data.display_name || "",
    };

    cache[key] = address;
    saveCache(cache);
    return { address, cached: false };
  }

  window.GeoCode = { fetchReverse };
})();
