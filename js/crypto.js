/* =============================================================
 * crypto.js — Sidik jari digital & audit trail (F1)
 * -------------------------------------------------------------
 * Lapisan "jejak digital anti-palsu". Semua lokal, tanpa server.
 *
 *   - canonicalize(parcel)  -> bentuk data stabil (deterministik)
 *   - sha256Hex(text)       -> hash SHA-256 (WebCrypto, fallback murni)
 *   - fingerprint(parcel)   -> { canonical, hash }
 *   - hashFile(file)        -> hash isi file (dokumen / foto)
 *   - verifyParcel(p)       -> cocokkan hash tersimpan vs hitung ulang
 *
 * Audit trail (append-only, ala Merkle chain):
 *   - auditAppend(event)    -> rantai hash tak terputus
 *   - auditVerify(chain)    -> deteksi bila riwayat diubah
 *
 * window.DigitalProof = { ... }
 * ============================================================= */
(function () {
  "use strict";

  const COORD_DECIMALS = 7; // ~1 cm, cukup & stabil

  // ---------- Utilitas ----------
  function round(n, d) {
    const p = Math.pow(10, d);
    return Math.round(Number(n) * p) / p;
  }

  /** Urutkan kunci objek & bulatkan koordinat agar hash deterministik. */
  function canonicalize(parcel) {
    const attrs = parcel.attributes || {};
    const sortedAttrs = {};
    Object.keys(attrs)
      .sort()
      .forEach((k) => {
        sortedAttrs[k] = String(attrs[k] == null ? "" : attrs[k]).trim();
      });

    const pts = (parcel.points || parcel.latlngs || []).map((c) => [
      round(c[0], COORD_DECIMALS),
      round(c[1], COORD_DECIMALS),
    ]);

    const style = parcel.style
      ? {
          color: parcel.style.color || null,
          fillColor: parcel.style.fillColor || null,
          fillOpacity: parcel.style.fillOpacity == null ? null : parcel.style.fillOpacity,
        }
      : null;

    return {
      id: parcel.id || "",
      name: String(parcel.name || "").trim(),
      attributes: sortedAttrs,
      points: pts,
      style: style,
      recordedAt: parcel.recordedAt || null,
    };
  }

  /** SHA-256 hex. Pakai WebCrypto; fallback implementasi murni (offline/HTTP). */
  async function sha256Hex(text) {
    const str = typeof text === "string" ? text : JSON.stringify(text);
    if (window.crypto && window.crypto.subtle && window.isSecureContext) {
      const buf = new TextEncoder().encode(str);
      const digest = await window.crypto.subtle.digest("SHA-256", buf);
      return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    return sha256Fallback(str);
  }

  // ---- SHA-256 murni (untuk http:// / file:// tanpa secure context) ----
  function sha256Fallback(ascii) {
    function rightRotate(v, a) { return (v >>> a) | (v << (32 - a)); }
    const maxWord = Math.pow(2, 32);
    let result = "";
    const words = [];
    const asciiBitLength = ascii.length * 8;
    let hash = (sha256Fallback.h = sha256Fallback.h || []);
    let k = (sha256Fallback.k = sha256Fallback.k || []);
    let primeCounter = k.length;

    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    ascii += "\x80";
    while ((ascii.length % 64) - 56) ascii += "\x00";
    for (let i = 0; i < ascii.length; i++) {
      const j = ascii.charCodeAt(i);
      if (j >> 8) return "";
      words[i >> 2] |= j << (((3 - i) % 4) * 8);
    }
    words[words.length] = (asciiBitLength / maxWord) | 0;
    words[words.length] = asciiBitLength;

    for (let j = 0; j < words.length; ) {
      const w = words.slice(j, (j += 16));
      const oldHash = hash.slice(0, 8);
      for (let i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2];
        const a = hash[0], e = hash[4];
        const temp1 =
          hash[7] +
          (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
          ((e & hash[5]) ^ (~e & hash[6])) +
          k[i] +
          (w[i] =
            i < 16
              ? w[i]
              : (w[i - 16] +
                  (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                  w[i - 7] +
                  (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
                0);
        const temp2 =
          (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
          ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (let i = 0; i < 8; i++) {
      for (let j = 3; j + 1; j--) {
        const b = (hash[i] >> (j * 8)) & 255;
        result += (b < 16 ? "0" : "") + b.toString(16);
      }
    }
    return result;
  }

  /** Sidik jari satu bidang. */
  async function fingerprint(parcel) {
    const canonical = JSON.stringify(canonicalize(parcel));
    const hash = await sha256Hex(canonical);
    return { canonical, hash };
  }

  /** Hash isi file (dokumen/foto) — dipakai F3. */
  async function hashFile(file) {
    if (window.crypto && window.crypto.subtle && window.isSecureContext) {
      const buf = await file.arrayBuffer();
      const digest = await window.crypto.subtle.digest("SHA-256", buf);
      return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    // fallback: baca sebagai text (kurang ideal untuk biner, tapi tetap berguna)
    const text = await file.text().catch(() => "");
    return sha256Hex(text + "|" + file.size + "|" + file.name);
  }

  /** Cocokkan hash tersimpan vs hitung ulang. */
  async function verifyParcel(parcel) {
    if (!parcel || !parcel.proof || !parcel.proof.hash) return { ok: false, reason: "belum ada sidik jari" };
    const { hash } = await fingerprint(parcel);
    return {
      ok: hash === parcel.proof.hash,
      stored: parcel.proof.hash,
      computed: hash,
    };
  }

  // ---------- Audit trail (append-only, ala Merkle chain) ----------
  const GENESIS = "GENESIS";

  async function auditHash(prevHash, event) {
    return sha256Hex(prevHash + "|" + JSON.stringify(event));
  }

  async function auditAppend(chain, event) {
    const list = Array.isArray(chain) ? chain.slice() : [];
    const prev = list.length ? list[list.length - 1].hash : GENESIS;
    const entry = {
      at: event.at || new Date().toISOString(),
      action: event.action,
      parcelId: event.parcelId || null,
      by: event.by || "pemilik",
      detail: event.detail || "",
    };
    entry.hash = await auditHash(prev, entry);
    entry.prev = prev;
    list.push(entry);
    return list;
  }

  async function auditVerify(chain) {
    const list = Array.isArray(chain) ? chain : [];
    let prev = GENESIS;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.prev !== prev) return { ok: false, at: i, reason: "rantai terputus (prev tidak cocok)" };
      const copy = { at: e.at, action: e.action, parcelId: e.parcelId, by: e.by, detail: e.detail };
      const h = await auditHash(prev, copy);
      if (h !== e.hash) return { ok: false, at: i, reason: "isi entri diubah" };
      prev = e.hash;
    }
    return { ok: true, count: list.length };
  }

  window.DigitalProof = {
    canonicalize,
    sha256Hex,
    fingerprint,
    hashFile,
    verifyParcel,
    auditAppend,
    auditVerify,
  };
})();
