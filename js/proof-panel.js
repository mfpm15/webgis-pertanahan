/* =============================================================
 * proof-panel.js — Kontrol UI Jejak Digital (F1–F8)
 * -------------------------------------------------------------
 * Menghubungkan modul (DigitalProof, TimestampProof, Evidence,
 * Report, Geo) dengan panel "Jejak Digital" di sidebar.
 * Bergantung pada window.GIS (disediakan app.js).
 * ============================================================= */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  function toast(msg, kind) {
    if (window.GIS && window.GIS.toast) window.GIS.toast(msg, kind);
  }

  // ---------- Helpers ----------
  // Bangun entitas HTML via fromCharCode agar aman dari korupsi
  // karakter pada proses penulisan file.
  const AMP = String.fromCharCode(38);  // &
  const APOS = String.fromCharCode(39); // '
  const QUOT = String.fromCharCode(34); // "
  const LT = String.fromCharCode(60);   // <
  const GT = String.fromCharCode(62);   // >

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      if (c === AMP) return AMP + "amp;";
      if (c === LT) return LT + "lt;";
      if (c === GT) return GT + "gt;";
      if (c === QUOT) return QUOT + "quot;";
      return AMP + "#39;";
    });
  }

  function shortHash(h) { return h ? h.slice(0, 16) + "\u2026" : "\u2014"; }

  function findParcel(id) {
    return ((window.GIS && window.GIS.getParcels) ? (window.GIS.getParcels() || []) : [])
      .find(function (x) { return x.id === id; }) || null;
  }

  // ---------- Render panel ----------
  async function renderPanel(id) {
    const el = $("proof-panel");
    if (!el) return;
    const p = findParcel(id);
    if (!p) {
      el.innerHTML = '<p class="muted">Pilih bidang untuk melihat jejak digital.</p>';
      return;
    }

    const coords = p.latlngs || p.points || [];
    p.proof = p.proof || {};

    // F1: hitung sidik jari (canonical, deterministik)
    let fp = { hash: p.proof.hash, canonical: p.proof.canonical };
    if (window.DigitalProof && window.DigitalProof.fingerprint) {
      fp = await window.DigitalProof.fingerprint({
        id: p.id, name: p.name, attributes: p.attributes,
        style: p.style, points: coords, recordedAt: p.recordedAt,
      });
      p.proof.hash = fp.hash;
      p.proof.canonical = fp.canonical;
    }
    if (!p.recordedAt) p.recordedAt = p.proof.recordedAt || new Date().toISOString();

    // F3: ringkas lampiran
    const evCount = (p.evidence && p.evidence.length) ? p.evidence.length : 0;

    // F6/F7: ringkas kunjungan
    const visits = p.visits || [];
    const lastVisit = visits.length ? visits[visits.length - 1].at : (p.lastVisit || null);

    const otsState = p.proof.ots
      ? (p.proof.ots.status === "confirmed" ? "Terkonfirmasi" : "Menunggu Bitcoin")
      : "Belum dikunci";

    // Foto per titik (pointPhotos) — siapkan data untuk share
    const pointPhotos = (p.pointPhotos && p.pointPhotos.filter(function (ph) { return ph && ph.dataUrl; })) || [];
    const hasPointPhotos = pointPhotos.length > 0;

    el.innerHTML =
      '<div class="proof-grid">' +
        '<div class="proof-item"><div class="pi-label">Sidik Jari</div><div class="pi-val">' + esc(shortHash(fp.hash)) + '</div></div>' +
        '<div class="proof-item"><div class="pi-label">Dicatat</div><div class="pi-val">' + esc((p.recordedAt || "").replace("T", " ").slice(0, 16)) + '</div></div>' +
        '<div class="proof-item"><div class="pi-label">Lampiran</div><div class="pi-val">' + evCount + ' file</div></div>' +
        '<div class="proof-item"><div class="pi-label">Kunjungan</div><div class="pi-val">' + visits.length + (lastVisit ? " \u00b7 " + esc(lastVisit.slice(5, 10)) : "") + '</div></div>' +
        '<div class="proof-item"><div class="pi-label">Arsip Publik</div><div class="pi-val">' + esc(otsState) + '</div></div>' +
      '</div>' +
      '<div class="proof-actions">' +
        '<button class="btn btn-sm" id="pp-stamp">\ud83d\udd17 Kunci Bukti</button>' +
        '<button class="btn btn-sm btn-secondary" id="pp-verify">\u2705 Verifikasi</button>' +
        '<button class="btn btn-sm btn-secondary" id="pp-pdf">\ud83d\udcc4 Kartu PDF</button>' +
        (hasPointPhotos ? '<button class="btn btn-sm btn-secondary" id="pp-share-points">\ud83d\udce4 Share Foto Titik ke Drive</button>' : '') +
      '</div>' +
      '<div id="pp-status" class="pp-status"></div>' +
      '<p class="hint">Bukti ini membuktikan keutuhan & waktu, bukan kepemilikan. Acuan resmi tetap BPN.</p>';

    const on = function (id, ev2, fn) { const e = $(id); if (e) e.addEventListener(ev2, fn); };
    on("pp-stamp", "click", function () { stampProof(p); });
    on("pp-verify", "click", function () { verifyProof(p); });
    on("pp-pdf", "click", function () { makeProofCard(p); });
    if (hasPointPhotos) {
      on("pp-share-points", "click", function () { sharePointPhotos(p); });
    }
  }

  // ---------- Aksi ----------
  async function stampProof(p) {
    const st = $("pp-status"); if (st) st.textContent = "Mengirim hash ke arsip publik...";
    if (!window.TimestampProof || !p.proof.hash) { toast("Belum ada sidik jari", "err"); return; }
    const r = await window.TimestampProof.stamp(p.proof.hash);
    if (r && r.ok) {
      p.proof.ots = { status: "pending", proof: r.proof, calendar: r.calendar, at: r.at };
      toast("Bukti waktu terkirim - konfirmasi Bitcoin menyusul", "ok");
      renderPanel(p.id);
    } else {
      if (st) st.innerHTML = '<span class="err-text">Gagal: ' + esc(r ? r.error : "tidak diketahui") + "</span> (butuh internet)";
      toast("Kunci bukti gagal", "err");
    }
  }

  async function verifyProof(p) {
    const st = $("pp-status");
    if (!window.TimestampProof) { if (st) st.textContent = ""; return; }
    const r = await window.TimestampProof.verify(p);
    if (r && r.ok) {
      if (st) st.innerHTML = '<span class="ok-text">Data utuh - hash cocok dengan yang tercatat.</span>';
    } else {
      if (st) st.innerHTML = '<span class="err-text">' + esc(r ? r.reason : "belum ada bukti") + "</span>";
    }
  }

  async function makeProofCard(p) {
    if (!window.Report) { toast("Modul laporan belum siap", "err"); return; }
    const coords = p.latlngs || p.points || [];
    const metrics = window.Geo ? {
      area: window.Geo.area(coords),
      perimeter: window.Geo.perimeter(coords),
      centroid: window.Geo.centroid(coords),
    } : {};
    window.Report.proofCardPdf(Object.assign({}, p, { metrics: metrics, points: coords }), function (err) {
      if (err) { toast(err, "err"); } else { toast("Kartu bukti PDF dibuat", "ok"); }
    });
  }

  // ---------- Share foto titik ke Drive (Web Share API) ----------
  async function sharePointPhotos(p) {
    if (!window.PhotoCapture || !window.PhotoCapture.shareFile) {
      toast("Modul share belum siap", "err");
      return;
    }
    const photos = (p.pointPhotos || []).filter(function (ph) { return ph && ph.dataUrl; });
    if (!photos.length) { toast("Tidak ada foto untuk dibagikan", "err"); return; }
    const st = $("pp-status");
    if (st) st.textContent = "Membuka share sheet...";
    let okCount = 0;
    for (var i = 0; i < photos.length; i++) {
      var ph = photos[i];
      var fname = "foto-titik-" + (i + 1) + "-" + (p.id || "bidang") + ".jpg";
      var ok = await window.PhotoCapture.shareFile(ph.dataUrl, fname);
      if (ok) okCount++;
    }
    if (st) st.textContent = okCount + " dari " + photos.length + " foto dibuka di share sheet (pilih Drive di HP).";
    toast("Selesai: " + okCount + " foto", okCount ? "ok" : "err");
  }

  // ---------- Backup global ----------
  function bindBackup() {
    const btn = $("btn-backup");
    if (!btn || !window.Report) return;
    btn.addEventListener("click", function () {
      const parcels = (window.GIS.getParcels ? window.GIS.getParcels() : []) || [];
      toast("Membuat backup...", "ok");
      window.Report.backupZip(parcels, [], function (err, name) {
        if (err) { toast(err, "err"); } else { toast("Backup dibuat: " + name, "ok"); }
      });
    });
  }

  // ---------- Wiring utama ----------
  function wire() {
    const ready = window.GIS && window.DigitalProof && window.TimestampProof &&
                  window.Evidence && window.Report;
    if (!ready) { setTimeout(wire, 250); return; }
    if (window.GIS.on) {
      window.GIS.on("gis:select", function (e) {
        const id = (e && e.detail && e.detail.id) || null;
        if (id) renderPanel(id);
      });
    }
    bindBackup();
    const active = (window.GIS.getActive && window.GIS.getActive());
    if (active) renderPanel(active.id);
    else {
      const hint = $("proof-hint");
      if (hint) hint.textContent = "Pilih bidang untuk melihat sidik jari & bukti digital.";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
