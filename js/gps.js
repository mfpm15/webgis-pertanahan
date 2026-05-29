/* =============================================================
 * gps.js — GPS & Tagging Lapangan
 * -------------------------------------------------------------
 * Dua kemampuan:
 *   1. "Lokasi Saya" — pusatkan peta ke posisi GPS + lingkaran akurasi.
 *   2. "Mode Tagging" — saat di lapangan, tekan tombol di tiap sudut
 *      tanah untuk merekam titik GPS. Setelah ≥3 titik, simpan jadi
 *      bidang baru.
 *
 * Memakai window.GIS (disediakan app.js): map, addParcelFromLatlngs,
 * toast, focusParcel.
 * ============================================================= */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  let watchId = null;
  let meMarker = null;
  let meCircle = null;
  let tagging = false;
  let tagPoints = [];
  let tagMarkers = [];
  let tagLine = null;

  function gisReady() {
    return window.GIS && window.GIS.map;
  }

  function toast(msg, kind) {
    if (window.GIS && window.GIS.toast) window.GIS.toast(msg, kind);
  }

  // ---------------- Lokasi Saya ----------------
  function locateMe() {
    if (!navigator.geolocation) {
      toast("Perangkat tidak mendukung GPS", "err");
      return;
    }
    toast("Mencari sinyal GPS…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const map = window.GIS.map;
        if (meMarker) map.removeLayer(meMarker);
        if (meCircle) map.removeLayer(meCircle);
        meCircle = L.circle([latitude, longitude], {
          radius: accuracy, color: "#1971c2", fillColor: "#4dabf7", fillOpacity: 0.15, weight: 1,
        }).addTo(map);
        const icon = L.divIcon({
          className: "", html: '<div class="me-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9],
        });
        meMarker = L.marker([latitude, longitude], { icon })
          .addTo(map)
          .bindPopup(`Posisi Anda<br>±${accuracy.toFixed(0)} m`);
        map.setView([latitude, longitude], 19);
        toast(`Lokasi ditemukan (±${accuracy.toFixed(0)} m)`, "ok");
      },
      (err) => toast("Gagal ambil GPS: " + err.message, "err"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  // ---------------- Mode Tagging ----------------
  function startTagging() {
    if (!navigator.geolocation) {
      toast("Perangkat tidak mendukung GPS", "err");
      return;
    }
    tagging = true;
    tagPoints = [];
    clearTagLayers();
    updateTagUI();
    toast("Mode tagging aktif. Berjalanlah ke tiap sudut tanah.", "ok");
  }

  function addTagPoint() {
    if (!tagging) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        tagPoints.push([latitude, longitude]);
        const idx = tagPoints.length;
        const icon = L.divIcon({
          className: "", html: `<div class="tag-dot">${idx}</div>`, iconSize: [24, 24], iconAnchor: [12, 12],
        });
        const mk = L.marker([latitude, longitude], { icon })
          .addTo(window.GIS.map)
          .bindPopup(`Titik ${idx}<br>±${accuracy.toFixed(0)} m`);
        tagMarkers.push(mk);
        redrawTagLine();
        window.GIS.map.setView([latitude, longitude]);
        updateTagUI();
        toast(`Titik ${idx} direkam (±${accuracy.toFixed(0)} m)`, "ok");
      },
      (err) => toast("GPS gagal: " + err.message, "err"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function redrawTagLine() {
    if (tagLine) window.GIS.map.removeLayer(tagLine);
    if (tagPoints.length >= 2) {
      tagLine = L.polyline(tagPoints, { color: "#e8590c", weight: 2, dashArray: "5,5" }).addTo(window.GIS.map);
    }
  }

  function finishTagging() {
    if (tagPoints.length < 3) {
      toast("Butuh minimal 3 titik untuk membentuk bidang", "err");
      return;
    }
    const pts = tagPoints.slice();
    stopTagging();
    if (window.GIS.addParcelFromLatlngs) {
      window.GIS.addParcelFromLatlngs(pts, { fromGPS: true });
      toast("Bidang dari GPS dibuat — lengkapi infonya", "ok");
    }
  }

  function cancelTagging() {
    stopTagging();
    toast("Tagging dibatalkan");
  }

  function stopTagging() {
    tagging = false;
    clearTagLayers();
    updateTagUI();
  }

  function clearTagLayers() {
    const map = window.GIS && window.GIS.map;
    if (!map) return;
    tagMarkers.forEach((m) => map.removeLayer(m));
    tagMarkers = [];
    if (tagLine) {
      map.removeLayer(tagLine);
      tagLine = null;
    }
  }

  function updateTagUI() {
    const panel = $("tag-panel");
    const count = $("tag-count");
    if (count) count.textContent = tagPoints.length;
    if (panel) panel.classList.toggle("hidden", !tagging);
    const startBtn = $("btn-tag-start");
    if (startBtn) startBtn.classList.toggle("hidden", tagging);
  }

  // ---------------- Wiring ----------------
  function wire() {
    if (!gisReady()) {
      setTimeout(wire, 300);
      return;
    }
    const bind = (id, fn) => { const el = $(id); if (el) el.addEventListener("click", fn); };
    bind("btn-locate", locateMe);
    bind("btn-tag-start", startTagging);
    bind("btn-tag-add", addTagPoint);
    bind("btn-tag-finish", finishTagging);
    bind("btn-tag-cancel", cancelTagging);
    updateTagUI();
  }

  wire();
})();
