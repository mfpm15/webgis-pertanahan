/* =============================================================
 * ui.js — Sentuhan untuk pengguna umum
 *   - Daftarkan service worker (PWA / offline).
 *   - Tombol "Pasang aplikasi" saat browser menawarkan install.
 *   - Modal Bantuan / panduan singkat untuk pengguna baru.
 * ============================================================= */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  // ---------- Service Worker ----------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch((e) => {
        console.warn("SW gagal didaftarkan:", e);
      });
    });
  }

  // ---------- Install PWA ----------
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = $("btn-install");
    if (btn) btn.classList.remove("hidden");
  });

  function bindInstall() {
    const btn = $("btn-install");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      btn.classList.add("hidden");
    });
  }

  window.addEventListener("appinstalled", () => {
    const btn = $("btn-install");
    if (btn) btn.classList.add("hidden");
  });

  // ---------- Modal Bantuan ----------
  function openHelp() { const m = $("help-backdrop"); if (m) m.classList.remove("hidden"); }
  function closeHelp() { const m = $("help-backdrop"); if (m) m.classList.add("hidden"); }

  function bindHelp() {
    const open = $("btn-help");
    if (open) open.addEventListener("click", openHelp);
    const close = $("help-close");
    if (close) close.addEventListener("click", closeHelp);
    const back = $("help-backdrop");
    if (back) back.addEventListener("click", (e) => { if (e.target === back) closeHelp(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeHelp(); });

    // Tampilkan bantuan otomatis pada kunjungan pertama.
    try {
      if (!localStorage.getItem("gis_help_seen")) {
        openHelp();
        localStorage.setItem("gis_help_seen", "1");
      }
    } catch (e) { /* abaikan */ }
  }

  function init() {
    bindInstall();
    bindHelp();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
