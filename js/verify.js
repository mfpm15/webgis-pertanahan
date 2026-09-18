/* =============================================================
 * verify.js — Logika halaman verifikasi publik
 * -------------------------------------------------------------
 * Membaca hash dari URL (#h=...&id=...), menampilkan status, dan
 * menyediakan pencocokan manual. Tidak memuat data bidang / koordinat.
 * ============================================================= */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  function parseHashParams() {
    const raw = (location.hash || "").replace(/^#/, "");
    const out = {};
    raw.split("&").forEach((kv) => {
      const [k, v] = kv.split("=");
      if (k) out[k] = decodeURIComponent(v || "");
    });
    return out;
  }

  function row(label, value, ok) {
    const cls = ok === true ? "ok" : ok === false ? "err" : "";
    return `<div class="vr-row ${cls}"><span class="vr-label">${label}</span><span class="vr-val">${value}</span></div>`;
  }

  function renderStatus(hash, id) {
    const box = $("verify-result");
    if (!hash) {
      box.innerHTML = `<p class="muted">Tidak ada hash pada tautan. Gunakan cek manual di bawah.</p>`;
      return;
    }
    box.innerHTML =
      row("Status tautan", "✅ Hash ditemukan") +
      row("ID Bidang", id || "—") +
      row("Hash tercatat", '<code class="vr-code">' + hash + "…</code>") +
      `<p class="hint">Hash lengkap diperlukan untuk pencocokan. Tempel hash dari Kartu Bukti di bawah.</p>`;
  }

  function bindCompare(fullHashFromUrl) {
    $("btn-compare").addEventListener("click", () => {
      const input = ($("hash-input").value || "").trim().toLowerCase();
      const target = (fullHashFromUrl || "").toLowerCase();
      const box = $("compare-result");
      if (!input) { box.innerHTML = `<p class="muted">Masukkan hash dulu.</p>`; return; }
      if (!/^[0-9a-f]{64}$/.test(input)) {
        box.innerHTML = `<p class="err-text">Format hash tidak valid (harus 64 karakter heksadesimal).</p>`;
        return;
      }
      if (!target) {
        box.innerHTML = row("Hash format", "✅ Valid", true) +
          `<p class="hint">Hash 64 karakter & format benar. Untuk memastikan keutuhan, bandingkan dengan hash asli dari pemilik.</p>`;
        return;
      }
      const match = input === target;
      box.innerHTML = match
        ? row("Hasil", "✅ COCOK — data utuh", true)
        : row("Hasil", "❌ TIDAK COCOK — data berubah / hash berbeda", false);
    });
  }

  function init() {
    const p = parseHashParams();
    const shortHash = p.h || "";
    renderStatus(shortHash, p.id);
    bindCompare(shortHash);
    const d = window.Report && window.Report.DISCLAIMER
      ? window.Report.DISCLAIMER
      : "Bukti digital membuktikan keutuhan & waktu, bukan kepemilikan. Acuan resmi tetap BPN.";
    const el = $("disclaimer");
    if (el) el.textContent = d;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
