/* =============================================================
 * scripts/get-refresh-token.js — Ambil OAuth Refresh Token (SEKALI JALAN)
 * -------------------------------------------------------------
 * Tujuan: dapatkan refresh_token dari akun Google Anda (yang punya
 * kuota Drive) supaya server (Netlify Function) bisa upload otomatis
 * ke Drive Anda TANPA perlu tim lapangan login berulang kali.
 *
 * Jalankan sekali di laptop Anda:
 *   node scripts/get-refresh-token.js
 *
 * Butuh CLIENT_ID + CLIENT_SECRET dari OAuth Client Web Application
 * yang sudah dibuat di Google Cloud Console (Credentials).
 * Isi di bawah, atau lewat environment variable.
 * ============================================================= */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const { URL } = require("url");

const LOG_FILE = path.join(__dirname, "..", "oauth-debug.log");
function log(msg) {
  const line = "[" + new Date().toISOString() + "] " + msg;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}
fs.writeFileSync(LOG_FILE, ""); // reset tiap run

// Isi CLIENT_ID & CLIENT_SECRET Anda di sini, atau set via env var
// sebelum menjalankan script (lebih aman, tidak tertulis di file).
// .trim() penting: `set VAR=xxx && command` di cmd.exe Windows sering
// menyertakan spasi trailing ke dalam nilai variabel, membuat Google
// menolaknya sebagai "invalid_client" walau secret aslinya benar.
const CLIENT_ID = (process.env.OAUTH_CLIENT_ID || "742688666266-ss5bvf0v34pepucpjhb1dkg0m26f6c0s.apps.googleusercontent.com").trim();
const CLIENT_SECRET = (process.env.OAUTH_CLIENT_SECRET || "").trim(); // WAJIB diisi (jangan commit ke git)
// PENTING: redirect URI harus PERSIS sama dengan yang terdaftar di Google
// Cloud Console (Authorized redirect URIs). Untuk client ini terdaftar
// "http://localhost:3000" TANPA path tambahan -> pakai port 3000, tanpa
// path /oauth2callback. Pastikan server.js (node server.js) TIDAK sedang
// berjalan di port 3000 saat menjalankan script ini.
const REDIRECT_URI = "http://localhost:3000";
const PORT = 3000;

if (!CLIENT_SECRET) {
  console.error("\nERROR: CLIENT_SECRET belum diisi.");
  console.error("Jalankan begini (PowerShell):");
  console.error('  $env:OAUTH_CLIENT_SECRET="isi-client-secret-anda"; node scripts/get-refresh-token.js\n');
  process.exit(1);
}

// Debug: pastikan nilai yang benar-benar dipakai (secret disensor sebagian)
console.log("DEBUG CLIENT_ID    :", CLIENT_ID);
console.log("DEBUG CLIENT_SECRET:", CLIENT_SECRET.slice(0, 10) + "..." + CLIENT_SECRET.slice(-4), "(length=" + CLIENT_SECRET.length + ")");
console.log("DEBUG REDIRECT_URI :", REDIRECT_URI);

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: "offline", // wajib, supaya dapat refresh_token
  prompt: "consent", // paksa munculkan consent screen -> pasti dapat refresh_token
  scope: ["https://www.googleapis.com/auth/drive"],
});

console.log("\n=================================================================");
console.log("1. Buka link berikut di browser, login dengan akun Google Anda:");
console.log("\n   " + authUrl + "\n");
console.log("2. Setujui akses -> Anda akan diarahkan ke localhost:8765");
console.log("   (halaman mungkin terlihat gagal load, itu normal — cek terminal ini)");
console.log("=================================================================\n");

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const code = url.searchParams.get("code");
    if (!code) {
      // request lain (favicon.ico dll) -> abaikan diam-diam
      res.writeHead(204);
      res.end();
      return;
    }
    if (!code) {
      res.writeHead(400);
      res.end("Kode otorisasi tidak ditemukan di URL");
      return;
    }
    const { tokens } = await oAuth2Client.getToken(code);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h2>Berhasil! Refresh token tersimpan di file oauth-result.txt</h2><p>Boleh tutup tab ini.</p>");

    const resultFile = path.join(__dirname, "..", "oauth-result.txt");
    fs.writeFileSync(resultFile,
      "REFRESH_TOKEN=" + tokens.refresh_token + "\n" +
      "CLIENT_ID=" + CLIENT_ID + "\n" +
      "ACCESS_TOKEN_SAMPLE=" + (tokens.access_token || "").slice(0, 20) + "...\n"
    );
    log("BERHASIL — refresh token ditulis ke " + resultFile);

    setTimeout(() => { server.close(); process.exit(0); }, 1000);
  } catch (e) {
    log("=== DETAIL ERROR LENGKAP ===");
    log("message: " + e.message);
    if (e.response && e.response.data) {
      log("response.data: " + JSON.stringify(e.response.data, null, 2));
    }
    if (e.response && e.response.status) {
      log("response.status: " + e.response.status);
    }
    if (e.code) log("code: " + e.code);
    log("stack: " + e.stack);
    log("============================");
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Gagal: " + e.message + "\n\nCek file oauth-debug.log untuk detail.");
    setTimeout(() => process.exit(1), 500);
  }
});

server.listen(PORT, () => {
  console.log(`Menunggu callback di http://localhost:${PORT} ...`);
});
