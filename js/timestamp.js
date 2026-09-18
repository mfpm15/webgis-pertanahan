/* =============================================================
 * timestamp.js — Bukti waktu via OpenTimestamps (F2)
 * -------------------------------------------------------------
 * Menyandarkan "sidik jari" (SHA-256) ke arsip publik Bitcoin lewat
 * protokol OpenTimestamps. Gratis, tanpa API key, tanpa registrasi.
 *
 * Alur:
 *   1. stamp(hash)  -> kirim hash ke calendar server -> dapat bukti
 *   2. upgrade      -> ambil attestation Bitcoin (butuh waktu)
 *   3. verify       -> buktikan hash tercatat pada waktu tertentu
 *
 * Implementasi ringan: server calendar OpenTimestamps memakai protokol
 * HTTP sederhana (POST /digest) dan mengembalikan biner bukti.
 * Bila jaringan gagal / offline, fitur ini fail-safe: aplikasi tetap
 * jalan dan pengguna diberi tahu untuk mencoba lagi nanti.
 *
 * window.TimestampProof = { CALENDARS, stamp, upgrade, verify, isPending }
 * ============================================================= */
(function () {
  "use strict";

  // Calendar server publik OpenTimestamps (dicek aktif 200 OK).
  const CALENDARS = [
    "https://a.pool.opentimestamps.org",
    "https://b.pool.opentimestamps.org",
    "https://alice.btc.calendar.opentimestamps.org",
    "https://finney.calendar.eternitywall.com",
  ];

  /** Ubah hash hex -> ArrayBuffer 32 byte. */
  function hexToBytes(hex) {
    const clean = String(hex).replace(/[^0-9a-f]/gi, "");
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
    return out;
  }

  function bytesToHex(buf) {
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Kirim hash ke calendar server.
   * Mengembalikan { ok, calendar, proof(base64), at } atau { ok:false, error }.
   */
  async function stamp(hash) {
    const body = hexToBytes(hash);
    let lastErr = "tidak ada calendar yang dapat dihubungi";

    for (const base of CALENDARS) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 12000);
        const res = await fetch(base + "/digest", {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream", Accept: "application/octet-stream" },
          body,
          signal: ctrl.signal,
        });
        clearTimeout(t);
        if (!res.ok) {
          lastErr = "HTTP " + res.status + " dari " + base;
          continue;
        }
        const buf = await res.arrayBuffer();
        return {
          ok: true,
          calendar: base,
          proof: bytesToBase64(buf),
          at: new Date().toISOString(),
          status: "pending",
        };
      } catch (e) {
        lastErr = e.message || String(e);
      }
    }
    return { ok: false, error: lastErr };
  }

  function bytesToBase64(buf) {
    const bytes = new Uint8Array(buf);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function base64ToBytes(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  /**
   * Coba "naikkan" bukti menjadi attestation Bitcoin.
   * OpenTimestamps memerlukan waktu (menit-jam). Bila belum siap, tetap status pending.
   */
  async function upgrade(proofRecord) {
    if (!proofRecord || !proofRecord.proof) return { ok: false, error: "bukti kosong" };
    try {
      const base = proofRecord.calendar || CALENDARS[0];
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch(base + "/timestamp/" + encodeURIComponent(proofRecord.proof), {
        signal: ctrl.signal,
        headers: { Accept: "application/octet-stream" },
      });
      clearTimeout(t);
      if (!res.ok) return { ok: false, error: "HTTP " + res.status, status: "pending" };
      const buf = await res.arrayBuffer();
      return {
        ok: true,
        proof: bytesToBase64(buf),
        status: "confirmed",
        at: new Date().toISOString(),
      };
    } catch (e) {
      return { ok: false, error: e.message || String(e), status: "pending" };
    }
  }

  /**
   * Verifikasi lokal: hitung ulang hash & bandingkan dengan yang tercatat.
   * (Verifikasi penuh attestasi Bitcoin dilakukan lewat file .ots + alat
   *  resmi OpenTimestamps agar tidak bergantung pada server kita.)
   */
  async function verify(parcel) {
    if (!parcel || !parcel.proof) return { ok: false, reason: "belum ada bukti" };
    const recomputed = await window.DigitalProof.fingerprint(parcel);
    const sameHash = recomputed.hash === parcel.proof.hash;
    return {
      ok: sameHash,
      hash: recomputed.hash,
      storedHash: parcel.proof.hash,
      stampedAt: parcel.proof.stampedAt || null,
      status: parcel.proof.ots ? parcel.proof.ots.status : "none",
    };
  }

  function isPending(rec) {
    return !!(rec && rec.status === "pending");
  }

  /** Unduh file .ots (JSON ringkas) sebagai bukti yang bisa diverifikasi pihak lain. */
  function exportProofFile(parcel) {
    if (!parcel || !parcel.proof) return null;
    const payload = {
      version: 1,
      note:
        "Bukti waktu OpenTimestamps untuk bidang " + parcel.id +
        ". Verifikasi independen: hash ulang data kanonik lalu cek attestasi Bitcoin lewat alat resmi OpenTimestamps (opentimestamps.org).",
      parcelId: parcel.id,
      parcelName: parcel.name,
      hash: parcel.proof.hash,
      canonical: parcel.proof.canonical || null,
      stampedAt: parcel.proof.stampedAt || null,
      ots: parcel.proof.ots || null,
      disclaimer:
        "Membuktikan data TIDAK BERUBAH dan ADA SEJAK waktu tertentu. BUKAN pengakuan kepemilikan oleh negara. Acuan resmi tetap sertifikat & pengukuran BPN.",
    };
    return JSON.stringify(payload, null, 2);
  }

  window.TimestampProof = { CALENDARS, stamp, upgrade, verify, isPending, exportProofFile };
})();
