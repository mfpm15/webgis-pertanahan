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
const { google } = require("googleapis");
const { URL } = require("url");

// Isi CLIENT_ID & CLIENT_SECRET Anda di sini, atau set via env var
// sebelum menjalankan script (lebih aman, tidak tertulis di file).
const CLIENT_ID = process.env.OAUTH_CLIENT_ID || "742688666266-ss5bvf0v34pepucpjhb1dkg0m26f6c0s.apps.googleusercontent.com";
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET || ""; // WAJIB diisi (jangan commit ke git)
const REDIRECT_URI = "http://localhost:8765/oauth2callback";
const PORT = 8765;

if (!CLIENT_SECRET) {
  console.error("\nERROR: CLIENT_SECRET belum diisi.");
  console.error("Jalankan begini (PowerShell):");
  console.error('  $env:OAUTH_CLIENT_SECRET="isi-client-secret-anda"; node scripts/get-refresh-token.js\n');
  process.exit(1);
}

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
    if (url.pathname !== "/oauth2callback") {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const code = url.searchParams.get("code");
    if (!code) {
      res.writeHead(400);
      res.end("Kode otorisasi tidak ditemukan di URL");
      return;
    }
    const { tokens } = await oAuth2Client.getToken(code);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h2>Berhasil! Kembali ke terminal untuk melihat refresh token Anda.</h2><p>Boleh tutup tab ini.</p>");

    console.log("\n=================================================================");
    console.log("BERHASIL. Refresh Token Anda (SIMPAN AMAN, jangan share):\n");
    console.log(tokens.refresh_token);
    console.log("\n=================================================================");
    console.log("Langkah selanjutnya:");
    console.log("1. Buka Netlify -> Site Settings -> Environment Variables");
    console.log("2. Tambah variable baru:");
    console.log("   Key   : GOOGLE_OAUTH_REFRESH_TOKEN");
    console.log("   Value : (paste refresh token di atas)");
    console.log("3. Tambah juga (jika belum ada):");
    console.log("   Key   : GOOGLE_OAUTH_CLIENT_ID");
    console.log("   Value : " + CLIENT_ID);
    console.log("   Key   : GOOGLE_OAUTH_CLIENT_SECRET");
    console.log("   Value : (client secret Anda)");
    console.log("4. Trigger deploy ulang di Netlify");
    console.log("=================================================================\n");

    setTimeout(() => { server.close(); process.exit(0); }, 1000);
  } catch (e) {
    console.error("Gagal tukar kode dengan token:", e.message);
    res.writeHead(500);
    res.end("Gagal: " + e.message);
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log(`Menunggu callback di http://localhost:${PORT} ...`);
});
