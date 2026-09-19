/* =============================================================
 * gdrive-config.js — Konfigurasi Google Drive API (CLIENT-SIDE)
 * -------------------------------------------------------------
 * FILE INI AMAN DI-COMMIT (tidak mengandung secret/credential).
 * Jalur utama: "Sinkronkan via Server" (Netlify Function) —
 *   tidak butuh OAuth per-device sama sekali.
 *
 * OPSIONAL — untuk OAuth per-device (tombol "Masuk ke Drive"):
 * 1. Isi CLIENT_ID dari Google Cloud Console
 *    (https://console.cloud.google.com/apis/credentials)
 * 2. Pastikan Authorized origins: https://webgistanah.netlify.app
 *    dan Authorized redirect URI: http://localhost:3000
 * ============================================================= */
window.GDriveConfig = {
  // Kosongkan = jalur OAuth per-device tidak aktif (Server Sync tetap jalan).
  CLIENT_ID: "",
  SCOPES: "https://www.googleapis.com/auth/drive.file",
  ROOT_FOLDER_NAME: "WebGIS Pertanahan",
};
