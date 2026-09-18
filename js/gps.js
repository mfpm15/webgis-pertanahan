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
  let liveWatchId = null;
  let liveAcc = null;

  // ---- Tuning akurasi GPS (sesuaikan bila perlu) ----
  const AVG_SAMPLES = 6;     // jumlah sampel GPS yang dirata-ratakan
  const AVG_WINDOW_MS = 6000; // durasi pengambilan sampel (ms)
  const MAX_ACCURACY = 25;   // sampel > 25 m dianggap sinyal lemah
  const MIN_ACCURACY = 5;    // akurasi "aman" utk hint UI

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

  // ---------------- Sampling GPS presisi ----------------
  // Rata-rata (weighted) beberapa sampel untuk meredam noise GPS.
  // Sampel ber-akurasi besar (> MAX_ACCURACY) diberi bobot kecil.
  function samplePosition(onDone) {
    if (!navigator.geolocation) {
      onDone(null, "Perangkat tidak mendukung GPS");
      return;
    }
    const samples = [];
    const start = Date.now();
    let watch = null;

    const stop = (reason) => {
      if (watch != null) navigator.geolocation.clearWatch(watch);
      watch = null;

      if (reason && samples.length === 0) {
        onDone(null, reason);
        return;
      }
      if (!samples.length) {
        // fallback: sekali baca saja
        navigator.geolocation.getCurrentPosition(
          (pos) => onDone({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy || 0, n: 1 }),
          (err) => onDone(null, err.message),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
        return;
      }

      // bobot: akurasi kecil = bobot besar
      let wLat = 0, wLon = 0, wSum = 0, accSum = 0;
      samples.forEach((s) => {
        const w = 1 / Math.max(s.accuracy, 1);
        wLat += s.lat * w;
        wLon += s.lon * w;
        wSum += w;
        accSum += s.accuracy;
      });
      const best = Math.min.apply(null, samples.map((s) => s.accuracy));
      onDone({
        lat: wLat / wSum,
        lon: wLon / wSum,
        accuracy: Math.min(Math.round(accSum / samples.length), best), // akurasi teroptimis (terbaik)
        n: samples.length,
      });
    };

    watch = navigator.geolocation.watchPosition(
      (pos) => {
        const a = pos.coords.accuracy || 0;
        // lewati sampel sinyal buruk (jaga agar noise besar tidak mengotori rata-rata)
        if (a && a > MAX_ACCURACY) {
          if (Date.now() - start >= AVG_WINDOW_MS) stop();
          return;
        }
        samples.push({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: a });
        // selesai jika sampel cukup ATAU waktu habis
        if (samples.length >= AVG_SAMPLES || Date.now() - start >= AVG_WINDOW_MS) stop();
      },
      (err) => stop(samples.length ? null : err.message),
      { enableHighAccuracy: true, maximumAge: 0 }
    );
    // pengaman: jangan lebih dari jendela + margin
    setTimeout(() => stop(), AVG_WINDOW_MS + 2000);
  }

  // ---------------- Indikator sinyal live ----------------
  function startLiveSignal() {
    stopLiveSignal();
    const el = $("gps-signal");
    if (!el) return;
    el.classList.remove("hidden");
    el.textContent = "Sinyal GPS: mencari…";
    liveWatchId = navigator.geolocation && navigator.geolocation.watchPosition(
      (pos) => {
        const a = Math.round(pos.coords.accuracy || 0);
        liveAcc = a;
        const q = a <= MIN_ACCURACY ? "bagus" : (a <= 15 ? "cukup" : "lemah");
        el.textContent = "Sinyal GPS ±" + a + " m (" + q + ")";
        el.className = "gps-signal " + (a <= MIN_ACCURACY ? "good" : a <= 15 ? "mid" : "bad");
      },
      () => {
        el.textContent = "Sinyal GPS: tak tersedia";
        el.className = "gps-signal bad";
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  }

  function stopLiveSignal() {
    if (liveWatchId != null && navigator.geolocation) navigator.geolocation.clearWatch(liveWatchId);
    liveWatchId = null;
    const el = $("gps-signal");
    if (el) el.classList.add("hidden");
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
    startLiveSignal();
    toast("Mode tagging aktif. Berjalanlah ke tiap sudut tanah.", "ok");
  }

  function addTagPoint() {
    if (!tagging) return;
    toast("Mengambil sampel GPS (averaging)…");
    samplePosition(function (res, err) {
      if (!res) { toast(err || "GPS gagal", "err"); return; }
      // Gating: sinyal masih buruk -> jangan rekam titik
      if (res.accuracy > MAX_ACCURACY) {
        toast("Sinyal lemah (±" + res.accuracy + " m). Pindah ke area terbuka lalu coba lagi.", "err");
        return;
      }
      tagPoints.push([res.lat, res.lon]);
      const idx = tagPoints.length;
      const icon = L.divIcon({
        className: "", html: `<div class="tag-dot">${idx}</div>`, iconSize: [24, 24], iconAnchor: [12, 12],
      });
      const mk = L.marker([res.lat, res.lon], { icon })
        .addTo(window.GIS.map)
        .bindPopup(`Titik ${idx}<br>±${res.accuracy} m (${res.n} sampel)`);
      tagMarkers.push(mk);
      redrawTagLine();
      window.GIS.map.setView([res.lat, res.lon]);
      updateTagUI();
      toast(`Titik ${idx} direkam (±${res.accuracy} m, ${res.n} sampel)`, "ok");
    });
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
    stopLiveSignal();
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
