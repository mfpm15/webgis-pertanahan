/* =============================================================
 * field.js — Jalur lapangan: kunjungan, pin, reminder, deteksi (F6/F7/F8)
 * -------------------------------------------------------------
 *   - Kunjungan berkala ("kunjungi lagi") + log riwayat per bidang
 *   - Pin berkategori warna (batas, titik kontrol BPN, pohon, mencurigakan)
 *   - Reminder PBB & jadwal kunjungan
 *   - Deteksi pergeseran patok antar kunjungan (> toleransi)
 *   - Voice note (rekam suara) per kunjungan
 *   - Impor KML/GPX (tanpa library berat; parser sederhana)
 *
 * window.Field = { PIN_TYPES, ... }
 * ============================================================= */
(function () {
  "use strict";

  const PIN_TYPES = [
    { key: "batas", label: "Batas / Patok", color: "#e8590c", icon: "📍" },
    { key: "kontrol", label: "Titik Kontrol (patok BPN)", color: "#1971c2", icon: "🎯" },
    { key: "pohon", label: "Pohon Batas", color: "#2b8a3e", icon: "🌳" },
    { key: "masalah", label: "Kejadian Mencurigakan", color: "#c92a2a", icon: "⚠️" },
    { key: "lainnya", label: "Lainnya", color: "#495057", icon: "📌" },
  ];

  const SHIFT_TOLERANCE_M = 2.5; // toleransi pergeseran patok (meter)

  function pinType(key) {
    return PIN_TYPES.find((p) => p.key === key) || PIN_TYPES[0];
  }

  function ensure(parcel) {
    if (!Array.isArray(parcel.visits)) parcel.visits = [];
    if (!Array.isArray(parcel.pins)) parcel.pins = [];
    if (!parcel.status) parcel.status = "belum";
    if (!parcel.reminders) parcel.reminders = { pbb: null, visit: null };
    return parcel;
  }

  // ---------- Jarak (haversine, meter) ----------
  function distanceM(a, b) {
    const R = 6378137.0;
    const rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(b[0] - a[0]);
    const dLon = rad(b[1] - a[1]);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  // ---------- Kunjungan ----------
  function addVisit(parcel, data) {
    ensure(parcel);
    const visit = {
      id: "V-" + Date.now().toString(36),
      at: data.at || new Date().toISOString(),
      by: data.by || "pemilik",
      lat: data.lat == null ? null : data.lat,
      lon: data.lon == null ? null : data.lon,
      accuracy: data.accuracy == null ? null : data.accuracy,
      note: data.note || "",
      audio: data.audio || null, // dataURL voice note
      photos: data.photos || [], // [{dataUrl,hash,lat,lon}]
      shifts: [], // hasil deteksi pergeseran
    };
    parcel.visits.push(visit);
    parcel.lastVisit = visit.at;
    return visit;
  }

  function planNextVisit(parcel, dateIso) {
    ensure(parcel);
    parcel.reminders.visit = dateIso || null;
    return parcel.reminders.visit;
  }

  function setPbbReminder(parcel, dateIso) {
    ensure(parcel);
    parcel.reminders.pbb = dateIso || null;
    return parcel.reminders.pbb;
  }

  /** Reminder jatuh tempo: PBB & kunjungan. */
  function dueSoon(parcel, daysAhead) {
    const days = daysAhead == null ? 30 : daysAhead;
    const now = Date.now();
    const soon = now + days * 86400000;
    const parse = (s) => {
      if (!s) return null;
      const t = new Date(s + "T00:00:00").getTime();
      return isNaN(t) ? null : t;
    };
    const out = [];
    const pbb = parse(parcel.reminders && parcel.reminders.pbb);
    const vis = parse(parcel.reminders && parcel.reminders.visit);
    if (pbb && pbb <= soon) out.push({ kind: "pbb", at: parcel.reminders.pbb, overdue: pbb < now });
    if (vis && vis <= soon) out.push({ kind: "visit", at: parcel.reminders.visit, overdue: vis < now });
    return out;
  }

  // ---------- Deteksi pergeseran patok ----------
  /** Bandingkan titik kunjungan terbaru vs kunjungan sebelumnya. */
  function detectShift(parcel, tolerance) {
    ensure(parcel);
    const tol = tolerance == null ? SHIFT_TOLERANCE_M : tolerance;
    const withPos = parcel.visits.filter((v) => v.lat != null && v.lon != null);
    if (withPos.length < 2) return [];
    const cur = withPos[withPos.length - 1];
    const prev = withPos[withPos.length - 2];
    const d = distanceM([prev.lat, prev.lon], [cur.lat, cur.lon]);
    const flagged = d > tol;
    const rec = { from: prev.at, to: cur.at, distance: Math.round(d * 10) / 10, flagged, tolerance: tol };
    cur.shifts = [rec];
    return [rec];
  }

  // ---------- Pin ----------
  function addPin(parcel, pin) {
    ensure(parcel);
    const item = {
      id: "P-" + Date.now().toString(36),
      type: pin.type || "lainnya",
      lat: pin.lat,
      lon: pin.lon,
      at: pin.at || new Date().toISOString(),
      note: pin.note || "",
    };
    parcel.pins.push(item);
    return item;
  }

  // ---------- Voice note (perekam sederhana) ----------
  function recordVoice(onDone) {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      onDone && onDone("Perangkat tidak mendukung perekaman suara");
      return null;
    }
    let recorder = null;
    let chunks = [];
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: "audio/webm" });
          const fr = new FileReader();
          fr.onload = () => {
            stream.getTracks().forEach((t) => t.stop());
            onDone && onDone(null, fr.result, blob.size);
          };
          fr.readAsDataURL(blob);
        };
        recorder.start();
      })
      .catch((e) => onDone && onDone("Gagal akses mikrofon: " + e.message));
    return {
      stop: () => { if (recorder && recorder.state !== "inactive") recorder.stop(); },
    };
  }

  // ---------- Impor KML / GPX (parser ringan) ----------
  function parseCoordsPairs(text) {
    // Ambil pasangan "lon,lat[,alt]" -> [lat, lon]
    const out = [];
    const re = /(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)(?:\s*,\s*-?\d+\.?\d*)?/g;
    let m;
    while ((m = re.exec(text))) {
      const lon = parseFloat(m[1]);
      const lat = parseFloat(m[2]);
      if (!isNaN(lat) && !isNaN(lon)) out.push([lat, lon]);
    }
    return out;
  }

  function importKmlGpx(text, filename) {
    const name = (filename || "").toLowerCase();
    const isKml = name.endsWith(".kml") || /<kml/i.test(text);
    const isGpx = name.endsWith(".gpx") || /<gpx/i.test(text);
    if (!isKml && !isGpx) return { ok: false, error: "Bukan file KML/GPX yang dikenali" };

    const feats = [];
    if (isKml) {
      const re = /<Placemark[\s\S]*?<\/Placemark>/gi;
      let pm;
      while ((pm = re.exec(text))) {
        const block = pm[0];
        const nm = (block.match(/<name>([\s\S]*?)<\/name>/i) || [])[1] || "Bidang KML";
        const ring = block.match(/<coordinates>([\s\S]*?)<\/coordinates>/i);
        if (ring) {
          const pts = parseCoordsPairs(ring[1]);
          if (pts.length >= 3) feats.push({ name: nm.trim(), points: pts });
        }
      }
    } else {
      const re = /<trkseg>([\s\S]*?)<\/trkseg>|<rte>([\s\S]*?)<\/rte>/gi;
      let seg;
      while ((seg = re.exec(text))) {
        const block = seg[1] || seg[2] || "";
        const pts = [];
        const pre = /<trkpt[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"/gi;
        let p;
        while ((p = pre.exec(block))) pts.push([parseFloat(p[1]), parseFloat(p[2])]);
        if (pts.length >= 3) feats.push({ name: "Jalur GPX", points: pts });
      }
    }
    if (!feats.length) return { ok: false, error: "Tidak ada poligon/jalur ditemukan" };
    return { ok: true, features: feats };
  }

  // ---------- Dashboard ringkas ----------
  const STATUS_LABELS = {
    belum: "Belum diproses",
    ptsl: "Sedang PTSL",
    shm: "Sudah SHM",
    masalah: "Ada indikasi masalah",
  };

  function dashboardStats(parcels) {
    const stats = { total: 0, byStatus: {}, totalArea: 0, overdue: 0, dueSoon: 0, lastVisitDays: null };
    let latest = 0;
    (parcels || []).forEach((p) => {
      ensure(p);
      stats.total++;
      stats.byStatus[p.status] = (stats.byStatus[p.status] || 0) + 1;
      if (p.metrics && p.metrics.area) stats.totalArea += p.metrics.area;
      const dues = dueSoon(p, 30);
      dues.forEach((d) => { if (d.overdue) stats.overdue++; else stats.dueSoon++; });
      if (p.lastVisit) latest = Math.max(latest, new Date(p.lastVisit).getTime());
    });
    if (latest) stats.lastVisitDays = Math.floor((Date.now() - latest) / 86400000);
    return stats;
  }

  window.Field = {
    PIN_TYPES, pinType, SHIFT_TOLERANCE_M, STATUS_LABELS,
    ensure, addVisit, planNextVisit, setPbbReminder, dueSoon,
    detectShift, addPin, recordVoice, importKmlGpx, dashboardStats, distanceM,
  };
})();
