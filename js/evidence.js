/* =============================================================
 * evidence.js — Lampiran dokumen & bukti foto (F3)
 * -------------------------------------------------------------
 * Menyimpan lampiran per bidang: scan dokumen (girik/letter C,
 * SPPT PBB, KTP/KK, akta), serta foto bertanggal.
 *
 * Prinsip:
 *   - Setiap file dihitung SHA-256-nya saat dimasukkan (F1).
 *   - Hash disimpan terpisah dari isi file.
 *   - Foto: dipakai sebagai bukti visual (patok, kondisi lahan).
 *   - Semua lokal (localStorage/IndexedDB) — tidak keluar dari perangkat.
 *
 * Kategori dokumen mengikuti daftar berkas yang lazim diminta BPN.
 *
 * window.Evidence = { CATEGORIES, addFile, removeFile, hashOf, summarize }
 * ============================================================= */
(function () {
  "use strict";

  // Kategori lampiran (selaras berkas yang biasa disiapkan untuk pendaftaran).
  const CATEGORIES = [
    { key: "girik", label: "Girik / Letter C / Petok D", icon: "📜" },
    { key: "sppt", label: "Riwayat SPPT PBB (bukti penguasaan)", icon: "🧾" },
    { key: "akta", label: "Akta Jual Beli / Hibah / Waris", icon: "📝" },
    { key: "pernyataan", label: "Surat Pernyataan Riwayat & Penguasaan", icon: "✅" },
    { key: "identitas", label: "KTP / KK Pemilik & Ahli Waris", icon: "🪪" },
    { key: "foto", label: "Foto Patok / Kondisi Lahan", icon: "📷" },
    { key: "video", label: "Video Jalan Keliling Batas", icon: "🎥" },
    { key: "lainnya", label: "Lainnya", icon: "📎" },
  ];

  function labelOf(key) {
    const c = CATEGORIES.find((x) => x.key === key);
    return c ? c.label : key;
  }

  function iconOf(key) {
    const c = CATEGORIES.find((x) => x.key === key);
    return c ? c.icon : "📎";
  }

  /** Tambah lampiran ke objek bidang (in-memory). File <= ~4MB aman utk localStorage. */
  async function addFile(parcel, file, category) {
    if (!parcel || !file) return { ok: false, error: "data tidak lengkap" };

    const hash = await window.DigitalProof.hashFile(file);
    const dataUrl = await readAsDataURL(file);

    const item = {
      id: "EV-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
      category: category || "lainnya",
      categoryLabel: labelOf(category || "lainnya"),
      filename: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      hash,
      addedAt: new Date().toISOString(),
      dataUrl,
      gps: parcel.attributes ? null : null,
    };

    if (!Array.isArray(parcel.evidence)) parcel.evidence = [];
    parcel.evidence.push(item);
    return { ok: true, item };
  }

  function removeFile(parcel, evidenceId) {
    if (!parcel || !Array.isArray(parcel.evidence)) return false;
    const before = parcel.evidence.length;
    parcel.evidence = parcel.evidence.filter((e) => e.id !== evidenceId);
    return parcel.evidence.length < before;
  }

  /** Cari lampiran berdasarkan hash (untuk verifikasi keutuhan). */
  function findByHash(parcel, hash) {
    if (!parcel || !Array.isArray(parcel.evidence)) return null;
    return parcel.evidence.find((e) => e.hash === hash) || null;
  }

  /** Ringkasan lampiran: jumlah, total ukuran, per kategori. */
  function summarize(parcel) {
    const list = (parcel && parcel.evidence) || [];
    const byCat = {};
    let total = 0;
    list.forEach((e) => {
      total += e.size || 0;
      byCat[e.category] = (byCat[e.category] || 0) + 1;
    });
    return { count: list.length, totalBytes: total, byCategory: byCat };
  }

  function readAsDataURL(file) {
    return new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(file);
    });
  }

  /** Format ukuran file. */
  function humanSize(bytes) {
    if (!bytes) return "0 B";
    const u = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0) + " " + u[i];
  }

  window.Evidence = { CATEGORIES, labelOf, iconOf, addFile, removeFile, findByHash, summarize, humanSize };
})();
