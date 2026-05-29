/* =============================================================
 * geo.js — Perhitungan geospasial mandiri (tanpa library eksternal)
 * Semua fungsi memakai koordinat [lat, lon] dalam derajat.
 * ============================================================= */

(function () {
  "use strict";

  const R = 6378137.0; // radius bumi WGS84 (meter)
  const rad = (d) => (d * Math.PI) / 180;

  /** Luas poligon bola (m²). Formula sama dengan Google Maps computeArea. */
  function area(latlngs) {
    const n = latlngs.length;
    if (n < 3) return 0;
    let total = 0;
    for (let i = 0; i < n; i++) {
      const [lat1, lon1] = latlngs[i];
      const [lat2, lon2] = latlngs[(i + 1) % n];
      total += rad(lon2 - lon1) * (2 + Math.sin(rad(lat1)) + Math.sin(rad(lat2)));
    }
    return Math.abs((total * R * R) / 2);
  }

  /** Jarak haversine antar dua titik (m). */
  function distance(a, b) {
    const dLat = rad(b[0] - a[0]);
    const dLon = rad(b[1] - a[1]);
    const lat1 = rad(a[0]);
    const lat2 = rad(b[0]);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  /** Keliling poligon tertutup (m). */
  function perimeter(latlngs) {
    const n = latlngs.length;
    if (n < 2) return 0;
    let total = 0;
    for (let i = 0; i < n; i++) {
      total += distance(latlngs[i], latlngs[(i + 1) % n]);
    }
    return total;
  }

  /** Centroid poligon (rata-rata berbobot luas) -> [lat, lon]. */
  function centroid(latlngs) {
    const n = latlngs.length;
    if (n === 0) return [0, 0];
    if (n < 3) {
      const la = latlngs.reduce((s, p) => s + p[0], 0) / n;
      const lo = latlngs.reduce((s, p) => s + p[1], 0) / n;
      return [la, lo];
    }
    const lat0 = latlngs.reduce((s, p) => s + p[0], 0) / n;
    // proyeksi lokal ke meter
    const xy = latlngs.map(([la, lo]) => [
      rad(lo) * R * Math.cos(rad(lat0)),
      rad(la) * R,
    ]);
    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < n; i++) {
      const [x1, y1] = xy[i];
      const [x2, y2] = xy[(i + 1) % n];
      const cross = x1 * y2 - x2 * y1;
      a += cross;
      cx += (x1 + x2) * cross;
      cy += (y1 + y2) * cross;
    }
    if (a === 0) {
      const la = latlngs.reduce((s, p) => s + p[0], 0) / n;
      const lo = latlngs.reduce((s, p) => s + p[1], 0) / n;
      return [la, lo];
    }
    a *= 0.5;
    cx /= 6 * a;
    cy /= 6 * a;
    // balik ke lat/lon
    const lat = (cy / R) * (180 / Math.PI);
    const lon = (cx / (R * Math.cos(rad(lat0)))) * (180 / Math.PI);
    return [lat, lon];
  }

  /** Urutkan titik searah mengelilingi centroid (anti poligon menyilang). */
  function sortClockwise(points) {
    const cx = points.reduce((s, p) => s + p[0], 0) / points.length;
    const cy = points.reduce((s, p) => s + p[1], 0) / points.length;
    return [...points].sort(
      (p, q) =>
        Math.atan2(q[0] - cx, q[1] - cy) - Math.atan2(p[0] - cx, p[1] - cy)
    );
  }

  /** Format luas ke m², ha, dan are (lokal Indonesia). */
  function formatArea(m2) {
    return {
      m2: m2.toLocaleString("id-ID", { maximumFractionDigits: 1 }),
      ha: (m2 / 10000).toLocaleString("id-ID", { maximumFractionDigits: 4 }),
      are: (m2 / 100).toLocaleString("id-ID", { maximumFractionDigits: 2 }),
    };
  }

  /** Panjang tiap sisi poligon (m) -> [{from,to,len}]. */
  function sideLengths(latlngs) {
    const n = latlngs.length;
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({ from: i + 1, to: ((i + 1) % n) + 1, len: distance(latlngs[i], latlngs[(i + 1) % n]) });
    }
    return out;
  }

  window.Geo = { area, distance, perimeter, centroid, sortClockwise, formatArea, sideLengths };
})();

