/* =============================================================
 * photo.js — Ambil foto (kamera/galeri) + tanda waktu (watermark)
 * -------------------------------------------------------------
 * Dipakai untuk: foto per titik GPS/tagging & foto kunjungan lapangan.
 * Semua lokal (tidak keluar dari perangkat), hash via DigitalProof.
 *
 * window.PhotoCapture = { pickPhoto, watermark, captureTimestamped }
 * ============================================================= */
(function () {
  "use strict";

  /** Buka dialog kamera/galeri. onDone(file|null). */
  function pickPhoto(onDone) {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "image/*";
    inp.setAttribute("capture", "environment");
    inp.style.display = "none";
    document.body.appendChild(inp);
    inp.addEventListener("change", function () {
      const file = inp.files && inp.files[0];
      document.body.removeChild(inp);
      onDone(file || null);
    });
    // Fallback: jika user membatalkan (tidak ada event 'change'), tidak ada cara
    // standar untuk mendeteksinya di semua browser — biarkan input tertinggal
    // di DOM tersembunyi jika tidak pernah dipilih (dibersihkan saat reload).
    inp.click();
  }

  function readAsDataURL(file) {
    return new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  /** Tempel teks waktu/koordinat di sudut kiri-bawah foto (canvas). */
  async function watermark(dataUrl, lines) {
    try {
      const img = await loadImage(dataUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const pad = Math.max(10, Math.round(img.width * 0.02));
      const fontSize = Math.max(14, Math.round(img.width * 0.028));
      ctx.font = fontSize + "px monospace";
      const boxH = lines.length * (fontSize + 6) + pad;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, img.height - boxH, img.width, boxH);
      ctx.fillStyle = "#fff";
      lines.forEach(function (line, i) {
        ctx.fillText(line, pad, img.height - boxH + pad + (i + 1) * (fontSize + 4) - 6);
      });
      return canvas.toDataURL("image/jpeg", 0.85);
    } catch (e) {
      return dataUrl; // gagal watermark -> tetap kembalikan foto asli
    }
  }

  /**
   * Ambil foto lalu beri tanda waktu (+koordinat bila ada).
   * coords: [lat, lon] atau null.
   * onDone({dataUrl, hash, at, lat, lon}) | onDone(null) bila dibatalkan.
   */
  async function captureTimestamped(coords, onDone) {
    pickPhoto(async function (file) {
      if (!file) { onDone(null); return; }
      const rawUrl = await readAsDataURL(file);
      if (!rawUrl) { onDone(null); return; }
      const at = new Date();
      const stamp = at.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "medium" });
      const lines = [stamp];
      if (coords && coords.length === 2 && coords[0] != null) {
        lines.push("Lat " + coords[0].toFixed(6) + ", Lon " + coords[1].toFixed(6));
      }
      const dataUrl = await watermark(rawUrl, lines);
      const hash = window.DigitalProof ? await window.DigitalProof.hashFile(file) : null;
      onDone({
        dataUrl: dataUrl, hash: hash, at: at.toISOString(),
        lat: coords ? coords[0] : null, lon: coords ? coords[1] : null,
      });
    });
  }

  /**
   * Bagikan foto via Web Share API (mis. ke "Google Drive" lewat share-sheet
   * Android/iOS) — tanpa OAuth/API key. Bila tidak didukung, kembalikan false
   * agar pemanggil bisa fallback (mis. buka tab baru untuk unduh manual).
   */
  async function shareFile(dataUrl, filename) {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], filename || "foto.jpg", { type: blob.type || "image/jpeg" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename || "Foto bukti" });
        return true;
      }
    } catch (e) {
      /* dibatalkan pengguna atau tidak didukung */
    }
    return false;
  }

  window.PhotoCapture = { pickPhoto, readAsDataURL, watermark, captureTimestamped, shareFile };
})();
