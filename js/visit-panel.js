/* =============================================================
 * visit-panel.js — UI Riwayat Kunjungan Lapangan + Foto (F6/F7)
 * -------------------------------------------------------------
 * Menghubungkan window.Field (addVisit, detectShift) dengan panel
 * "Riwayat Kunjungan" di sidebar. Setiap kunjungan bisa punya
 * beberapa foto bertimestamp (via window.PhotoCapture) & catatan.
 * Bergantung pada window.GIS (app.js).
 * ============================================================= */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  function toast(msg, kind) {
    if (window.GIS && window.GIS.toast) window.GIS.toast(msg, kind);
  }

  const AMP = String.fromCharCode(38);
  const LT = String.fromCharCode(60);
  const GT = String.fromCharCode(62);
  const QUOT = String.fromCharCode(34);

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      if (c === AMP) return AMP + "amp;";
      if (c === LT) return LT + "lt;";
      if (c === GT) return GT + "gt;";
      if (c === QUOT) return QUOT + "quot;";
      return AMP + "#39;";
    });
  }

  function findParcel(id) {
    return ((window.GIS && window.GIS.getParcels) ? (window.GIS.getParcels() || []) : [])
      .find(function (x) { return x.id === id; }) || null;
  }

  // Foto-foto yang sedang dikumpulkan untuk kunjungan baru (belum disimpan).
  let draftPhotos = [];

  function renderDraftPhotos() {
    const wrap = $("visit-draft-photos");
    if (!wrap) return;
    wrap.innerHTML = "";
    draftPhotos.forEach(function (ph, i) {
      const div = document.createElement("div");
      div.className = "pp-photo-row";
      div.innerHTML = `<img class="pp-photo-thumb" src="${ph.dataUrl}" alt="Foto kunjungan" />` +
        `<button type="button" class="btn btn-danger pp-photo-del">\u2716</button>`;
      div.querySelector(".pp-photo-del").addEventListener("click", function () {
        draftPhotos.splice(i, 1);
        renderDraftPhotos();
      });
      wrap.appendChild(div);
    });
  }

  function renderVisitForm(p) {
    const el = $("visit-panel");
    draftPhotos = [];
    el.innerHTML =
      '<div class="visit-form">' +
        '<textarea id="visit-note" rows="2" placeholder="Catatan kunjungan (kondisi lahan, batas, dll.)"></textarea>' +
        '<div class="proof-actions">' +
          '<button type="button" class="btn btn-sm btn-secondary" id="visit-add-photo">\ud83d\udcf7 Tambah Foto</button>' +
          '<button type="button" class="btn btn-sm btn-secondary" id="visit-use-gps">\ud83c\udfaf Pakai Lokasi Saya</button>' +
        '</div>' +
        '<div id="visit-draft-photos" class="pp-photo-list"></div>' +
        '<div class="proof-actions">' +
          '<button type="button" class="btn btn-sm" id="visit-save">\u2705 Simpan Kunjungan</button>' +
          '<button type="button" class="btn btn-sm btn-secondary" id="visit-cancel">Batal</button>' +
        '</div>' +
      '</div>';

    let gpsCoords = null;
    let gpsAccuracy = null;

    $("visit-add-photo").addEventListener("click", function () {
      if (!window.PhotoCapture) { toast("Modul kamera belum siap", "err"); return; }
      window.PhotoCapture.captureTimestamped(gpsCoords, function (result) {
        if (!result) return;
        draftPhotos.push(result);
        renderDraftPhotos();
      });
    });

    $("visit-use-gps").addEventListener("click", function () {
      if (!navigator.geolocation) { toast("GPS tidak tersedia", "err"); return; }
      toast("Mengambil lokasi\u2026");
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          gpsCoords = [pos.coords.latitude, pos.coords.longitude];
          gpsAccuracy = pos.coords.accuracy || null;
          toast("Lokasi didapat (\u00b1" + Math.round(gpsAccuracy) + " m)", "ok");
        },
        function (err) { toast("Gagal ambil GPS: " + err.message, "err"); },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });

    $("visit-cancel").addEventListener("click", function () { renderPanel(p.id); });

    $("visit-save").addEventListener("click", async function () {
      window.Field.ensure(p);
      const visit = window.Field.addVisit(p, {
        note: $("visit-note").value.trim(),
        lat: gpsCoords ? gpsCoords[0] : null,
        lon: gpsCoords ? gpsCoords[1] : null,
        accuracy: gpsAccuracy,
        photos: draftPhotos.map(function (ph) { return { dataUrl: ph.dataUrl, hash: ph.hash, at: ph.at, lat: ph.lat, lon: ph.lon }; }),
      });
      if (gpsCoords) window.Field.detectShift(p);
      await window.GIS.persist();
      toast("Kunjungan tersimpan", "ok");
      renderPanel(p.id);
    });
  }

  function visitCard(v, idx) {
    const dt = (v.at || "").replace("T", " ").slice(0, 16);
    const shift = (v.shifts && v.shifts[0]) || null;
    let h = '<div class="visit-card">';
    h += '<div class="visit-card-head"><b>Kunjungan #' + idx + '</b><span class="visit-date">' + esc(dt) + '</span></div>';
    if (v.note) h += '<div class="visit-note">' + esc(v.note) + '</div>';
    if (v.lat != null) {
      h += '<div class="visit-meta">\ud83d\udccd ' + v.lat.toFixed(6) + ', ' + v.lon.toFixed(6) +
        (v.accuracy ? ' (\u00b1' + Math.round(v.accuracy) + ' m)' : '') + '</div>';
    }
    if (shift) {
      h += '<div class="visit-meta ' + (shift.flagged ? 'err-text' : 'ok-text') + '">' +
        (shift.flagged ? '\u26a0\ufe0f Pergeseran patok terdeteksi: ' : '\u2713 Posisi stabil: ') +
        shift.distance + ' m sejak kunjungan sebelumnya</div>';
    }
    if (v.photos && v.photos.length) {
      h += '<div class="visit-photo-grid">';
      v.photos.forEach(function (ph) {
        h += '<img class="visit-photo-thumb" src="' + ph.dataUrl + '" alt="Foto kunjungan" />';
      });
      h += '</div>';
    }
    h += '</div>';
    return h;
  }

  function renderPanel(id) {
    const el = $("visit-panel");
    if (!el) return;
    const p = findParcel(id);
    if (!p) { el.innerHTML = '<p class="muted">Pilih bidang untuk melihat riwayat kunjungan.</p>'; return; }
    window.Field.ensure(p);
    const visits = p.visits.slice().reverse();
    if (!visits.length) {
      el.innerHTML = '<p class="muted">Belum ada kunjungan tercatat untuk bidang ini.</p>';
      return;
    }
    el.innerHTML = visits.map(function (v, i) { return visitCard(v, visits.length - i); }).join("");
  }

  function wire() {
    const ready = window.GIS && window.Field && window.PhotoCapture;
    if (!ready) { setTimeout(wire, 250); return; }

    const addBtn = $("btn-visit-add");
    if (addBtn) {
      addBtn.addEventListener("click", function () {
        const p = window.GIS.getActive();
        if (!p) { toast("Pilih bidang dulu", "err"); return; }
        renderVisitForm(p);
      });
    }

    if (window.GIS.on) {
      window.GIS.on("gis:select", function (e) {
        const id = (e && e.detail && e.detail.id) || null;
        if (id) renderPanel(id);
      });
    }
    const active = window.GIS.getActive && window.GIS.getActive();
    if (active) renderPanel(active.id);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
