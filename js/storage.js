/* =============================================================
 * storage.js — Lapisan penyimpanan data bidang
 * -------------------------------------------------------------
 * Strategi:
 *   1. Coba backend (REST API /api/parcels) — data tersimpan sebagai
 *      file JSON di laptop (data/parcels.json).
 *   2. Jika backend tidak aktif (mis. dibuka via python http.server atau
 *      file://), otomatis fallback ke localStorage browser.
 *
 * Semua method mengembalikan Promise agar pemanggil seragam (async).
 * window.Storage = { init, load, saveAll, remove, mode }
 * ============================================================= */
(function () {
  "use strict";

  const LS_KEY = "webgis_pertanahan_v3";

  let mode = "local"; // "backend" | "local"

  async function detectBackend() {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 1500);
      const res = await fetch("/api/health", { signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) {
        const j = await res.json();
        if (j && j.ok) {
          mode = "backend";
          return true;
        }
      }
    } catch (e) {
      /* backend tidak ada — pakai local */
    }
    mode = "local";
    return false;
  }

  // ---------------- localStorage helpers ----------------
  function lsLoad() {
    try {
      const s = localStorage.getItem(LS_KEY);
      if (s) return JSON.parse(s);
    } catch (e) {
      console.warn("localStorage baca gagal:", e);
    }
    return null;
  }

  function lsSave(parcels) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(parcels));
      return true;
    } catch (e) {
      console.warn("localStorage simpan gagal:", e);
      return false;
    }
  }

  // ---------------- API publik ----------------
  async function init() {
    await detectBackend();
    return mode;
  }

  /** Muat semua bidang. Mengembalikan array (boleh kosong) atau null bila
   *  belum ada data sama sekali (agar pemanggil bisa pakai seed). */
  async function load() {
    if (mode === "backend") {
      try {
        const res = await fetch("/api/parcels");
        const j = await res.json();
        return Array.isArray(j.parcels) ? j.parcels : [];
      } catch (e) {
        console.warn("Backend load gagal, fallback local:", e);
        mode = "local";
      }
    }
    return lsLoad();
  }

  /** Simpan seluruh daftar bidang. */
  async function saveAll(parcels) {
    // selalu cerminkan ke localStorage sebagai cadangan
    lsSave(parcels);
    if (mode === "backend") {
      try {
        const res = await fetch("/api/parcels", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parcels }),
        });
        return res.ok;
      } catch (e) {
        console.warn("Backend simpan gagal, tersimpan ke local:", e);
        mode = "local";
        return false;
      }
    }
    return true;
  }

  /** Hapus 1 bidang berdasarkan id (sisi server). */
  async function remove(id) {
    if (mode === "backend") {
      try {
        await fetch("/api/parcels/" + encodeURIComponent(id), { method: "DELETE" });
      } catch (e) {
        console.warn("Backend hapus gagal:", e);
      }
    }
    // localStorage diperbarui oleh saveAll yang dipanggil setelah ini
  }

  function clearLocal() {
    try {
      localStorage.removeItem(LS_KEY);
    } catch (e) {
      /* abaikan */
    }
  }

  window.Storage = {
    init,
    load,
    saveAll,
    remove,
    clearLocal,
    get mode() {
      return mode;
    },
  };
})();
