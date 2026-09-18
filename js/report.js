/* =============================================================
 * report.js — Laporan PDF, QR verifikasi, backup & audit (F4/F5)
 * -------------------------------------------------------------
 *   - buildQrDataUrl(text)  -> QR (via CDN qrcode, fallback sederhana)
 *   - verifyUrl(parcel)     -> tautan halaman verifikasi (hash saja)
 *   - proofCardPdf(parcel)  -> "Kartu Bukti Bidang" PDF
 *   - backupZip(parcels)    -> arsip ZIP (JSON + bukti + audit)
 *
 * Memakai library dari CDN bila tersedia (jsPDF, qrcode, JSZip);
 * bila CDN tidak termuat (offline), fungsi memberi tahu dengan jelas.
 *
 * window.Report = { ... }
 * ============================================================= */
(function () {
  "use strict";

  const DISCLAIMER =
    "Bukti digital ini membuktikan DATA TIDAK BERUBAH dan ADA SEJAK waktu pencatatan. " +
    "Ini BUKAN pengakuan kepemilikan oleh negara. Acuan resmi tetap sertifikat & pengukuran BPN.";

  function hasQr() { return typeof window.QRCode !== "undefined"; }
  function hasPdf() { return typeof window.jspdf !== "undefined" || typeof window.jsPDF !== "undefined"; }
  function hasZip() { return typeof window.JSZip !== "undefined"; }

  /** URL halaman verifikasi (hanya hash yang dibagikan, bukan isi/koordinat). */
  function verifyUrl(parcel) {
    const base = location.origin + location.pathname.replace(/[^/]*$/, "") + "verify.html";
    const h = (parcel && parcel.proof && parcel.proof.hash) || "";
    return base + "#h=" + encodeURIComponent(h.slice(0, 32)) + "&id=" + encodeURIComponent(parcel ? parcel.id : "");
  }

  /** QR sebagai data URL (butuh qrcode CDN). */
  function buildQrDataUrl(text, cb) {
    if (!hasQr()) { cb(null); return; }
    try {
      const holder = document.createElement("div");
      new window.QRCode(holder, { text: text, width: 160, height: 160, correctLevel: 2 });
      setTimeout(() => {
        const cv = holder.querySelector("canvas");
        if (cv) return cb(cv.toDataURL("image/png"));
        const img = holder.querySelector("img");
        cb(img ? img.src : null);
      }, 60);
    } catch (e) {
      cb(null);
    }
  }

  /** Kartu Bukti Bidang (PDF). onDone(err, filename). */
  function proofCardPdf(parcel, onDone) {
    if (!hasPdf()) { onDone && onDone("Library PDF belum termuat (butuh internet sekali untuk cache)."); return; }
    const JsPDF = window.jspdf ? window.jspdf.jsPDF : window.jsPDF;
    const doc = new JsPDF({ unit: "mm", format: "a4" });
    const W = 210, M = 16;
    let y = 18;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("KARTU BUKTI BIDANG TANAH", M, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Dokumen pendukung jejak penguasaan — bukan pengganti sertifikat BPN", M, y);
    y += 8;

    doc.setDrawColor(200);
    doc.line(M, y, W - M, y);
    y += 6;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Identitas Bidang", M, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const info = [
      ["Nama Bidang", parcel.name || "-"],
      ["ID", parcel.id || "-"],
      ["Luas (m2)", fmt(parcel.metrics && parcel.metrics.area)],
      ["Keliling (m)", fmt(parcel.metrics && parcel.metrics.perimeter)],
      ["Jumlah Titik", String((parcel.points || parcel.latlngs || []).length)],
      ["Titik Pusat", centroidText(parcel.points || parcel.latlngs)],
    ];
    info.forEach(([k, v]) => {
      doc.text(String(k), M, y);
      doc.text(": " + String(v), M + 38, y);
      y += 5.5;
    });

    y += 2;
    doc.setFont("helvetica", "bold");
    doc.text("Atribut", M, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    Object.keys(parcel.attributes || {}).forEach((k) => {
      if (!parcel.attributes[k]) return;
      doc.text(pretty(k), M, y);
      doc.text(": " + String(parcel.attributes[k]), M + 38, y);
      y += 5.5;
      if (y > 240) { doc.addPage(); y = 20; }
    });

    y += 2;
    doc.setDrawColor(200);
    doc.line(M, y, W - M, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Bukti Digital", M, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const p = parcel.proof || {};
    const proofLines = [
      ["Sidik jari (SHA-256)", p.hash || "(belum dibuat)"],
      ["Waktu dicatat", p.recordedAt || "-"],
      ["Timestamp OTS", p.ots ? (p.ots.status || "-") + " • " + (p.stampedAt || "") : "(belum)"],
      ["Jumlah lampiran", String(((parcel.evidence || []).length))],
    ];
    proofLines.forEach(([k, v]) => {
      doc.text(String(k), M, y);
      doc.text(": " + String(v), M + 38, y);
      y += 5.5;
    });

    // Hash panjang: pecah agar muat
    if (p.hash) {
      doc.setFontSize(8);
      const chunks = p.hash.match(/.{1,58}/g) || [p.hash];
      chunks.forEach((c) => { doc.text(c, M, y); y += 4; });
      doc.setFontSize(11);
    }

    if (y > 200) { doc.addPage(); y = 20; }
    buildQrDataUrl(verifyUrl(parcel), (qr) => {
      if (qr) {
        try {
          doc.addImage(qr, "PNG", W - M - 38, y, 38, 38);
          doc.setFontSize(8);
          doc.text("Scan untuk verifikasi", W - M - 38, y + 42);
        } catch (e) { /* abaikan */ }
      }
      y = Math.max(y + 46, y);
      doc.setFontSize(8);
      doc.setTextColor(120);
      const dLines = doc.splitTextToSize(DISCLAIMER, W - M * 2);
      doc.text(dLines, M, y);
      doc.setTextColor(0);
      doc.save("kartu-bukti-" + (parcel.id || "bidang") + ".pdf");
      onDone && onDone(null);
    });
  }

  /** Backup ZIP: data + bukti + audit. onDone(err, filename). */
  function backupZip(parcels, auditChain, onDone) {
    if (!hasZip()) { onDone && onDone("Library ZIP belum termuat (butuh internet sekali)."); return; }
    const zip = new window.JSZip();
    const folder = zip.folder("webgis-pertanahan-backup");

    const clean = (parcels || []).map((p) => ({
      id: p.id, name: p.name, attributes: p.attributes, style: p.style,
      points: p.points || p.latlngs, proof: p.proof || null,
      evidence: (p.evidence || []).map((e) => ({
        id: e.id, category: e.category, filename: e.filename, type: e.type,
        size: e.size, hash: e.hash, addedAt: e.addedAt, dataUrl: e.dataUrl,
      })),
      visits: p.visits || [], pins: p.pins || [], status: p.status || "belum",
    }));

    folder.file("parcels.json", JSON.stringify(clean, null, 2));
    folder.file("audit-log.json", JSON.stringify(auditChain || [], null, 2));
    folder.file(
      "BACA-SAYA.txt",
      [
        "BACKUP WEBGIS PERTANAHAN",
        "Dibuat: " + new Date().toISOString(),
        "",
        "Isi:",
        "  parcels.json   - seluruh data bidang (termasuk bukti hash & lampiran)",
        "  audit-log.json - riwayat perubahan (append-only)",
        "",
        "SIMPAN DI MINIMAL 2-3 LOKASI BERBEDA (cloud A, cloud B, hard drive fisik).",
        "",
        DISCLAIMER,
      ].join("\n")
    );

    zip.generateAsync({ type: "blob", compression: "DEFLATE" }).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "webgis-backup-" + new Date().toISOString().slice(0, 10) + ".zip";
      a.click();
      URL.revokeObjectURL(url);
      onDone && onDone(null, a.download);
    }).catch((e) => onDone && onDone("Gagal membuat ZIP: " + e.message));
  }

  // ---------- util kecil ----------
  function fmt(n) { return n == null ? "-" : Number(n).toLocaleString("id-ID", { maximumFractionDigits: 1 }); }
  function pretty(k) { return k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()); }
  function centroidText(pts) {
    const list = pts || [];
    if (!list.length) return "-";
    const la = list.reduce((s, p) => s + p[0], 0) / list.length;
    const lo = list.reduce((s, p) => s + p[1], 0) / list.length;
    return la.toFixed(6) + ", " + lo.toFixed(6);
  }

  window.Report = { DISCLAIMER, verifyUrl, buildQrDataUrl, proofCardPdf, backupZip, hasQr, hasPdf, hasZip };
})();
