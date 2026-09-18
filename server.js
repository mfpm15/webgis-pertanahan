/* =============================================================
 * server.js — Backend Web GIS Pertanahan (Node.js + googleapis)
 * -------------------------------------------------------------
 * - Menyajikan file frontend (index.html, css, js).
 * - REST API menyimpan data bidang sebagai file JSON di disk laptop:
 *     data/parcels.json
 * - Google Drive Sync (Service Account):
 *     POST /api/sync-to-drive  { parcelId, parcelData, files[] }
 *
 * Endpoint:
 *   GET    /api/health          -> { ok: true }
 *   GET    /api/parcels         -> { parcels: [...] }
 *   PUT    /api/parcels         -> simpan seluruh daftar (body: {parcels:[...]})
 *   POST   /api/parcels         -> tambah 1 bidang (body: parcel)
 *   DELETE /api/parcels/:id     -> hapus 1 bidang
 *   POST   /api/sync-to-drive   -> sync 1 bidang ke Google Drive (Service Account)
 *
 * Jalankan:  node server.js   (lalu buka http://localhost:3000)
 * ============================================================= */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "parcels.json");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".geojson": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// ---------------- Penyimpanan data (file JSON) ----------------
function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ parcels: [] }, null, 2), "utf-8");
  }
}

function readStore() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const obj = JSON.parse(raw);
    return Array.isArray(obj.parcels) ? obj.parcels : [];
  } catch (e) {
    console.error("Gagal baca store:", e.message);
    return [];
  }
}

function writeStore(parcels) {
  // Tulis atomik: tulis ke file sementara lalu rename (anti file korup).
  const tmp = DATA_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify({ parcels }, null, 2), "utf-8");
  fs.renameSync(tmp, DATA_FILE);
}

// ---------------- Helper HTTP ----------------
function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 10 * 1024 * 1024) reject(new Error("Body terlalu besar"));
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(new Error("JSON tidak valid"));
      }
    });
    req.on("error", reject);
  });
}

function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath.split("?")[0]);
  if (rel === "/") rel = "/index.html";
  // Cegah path traversal
  const filePath = path.normalize(path.join(ROOT, rel));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.readFile(filePath, (err, buf) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("404 Not Found");
    }
    const ext = path.extname(filePath).toLowerCase();
    const headers = { "Content-Type": MIME[ext] || "application/octet-stream" };
    // Service worker WAJIB selalu segar agar update app cepat sampai
    // (sama seperti konfigurasi Netlify). Tanpa ini browser meng-cache
    // sw.js lama dan CSS/JS lama ikut persist.
    if (rel === "/sw.js" || rel.endsWith("/sw.js")) {
      headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
      headers["Pragma"] = "no-cache";
    }
    // Halaman utama & manifest selalu segar (aset statis lainnya boleh di-cache)
    if (rel === "/" || rel === "/index.html" || rel.endsWith(".webmanifest")) {
      headers["Cache-Control"] = "no-cache";
    }
    res.writeHead(200, headers);
    res.end(buf);
  });
}

// ---------------- Router API ----------------
async function handleApi(req, res, urlPath) {
  const method = req.method.toUpperCase();

  if (method === "OPTIONS") return sendJson(res, 204, {});

  if (urlPath === "/api/health" && method === "GET") {
    return sendJson(res, 200, { ok: true, store: DATA_FILE });
  }

  if (urlPath === "/api/parcels") {
    if (method === "GET") {
      return sendJson(res, 200, { parcels: readStore() });
    }
    if (method === "PUT") {
      const body = await readBody(req);
      const parcels = Array.isArray(body.parcels) ? body.parcels : [];
      writeStore(parcels);
      return sendJson(res, 200, { ok: true, count: parcels.length });
    }
    if (method === "POST") {
      const parcel = await readBody(req);
      const parcels = readStore();
      parcels.push(parcel);
      writeStore(parcels);
      return sendJson(res, 201, { ok: true, parcel });
    }
  }

  const m = urlPath.match(/^\/api\/parcels\/([^/]+)$/);
  if (m && method === "DELETE") {
    const id = decodeURIComponent(m[1]);
    const parcels = readStore().filter((p) => p.id !== id);
    writeStore(parcels);
    return sendJson(res, 200, { ok: true, count: parcels.length });
  }

  if (urlPath === "/api/sync-to-drive" && method === "POST") {
    return handleSyncToDrive(req, res);
  }

  // ---------------- Google Drive Sync (OAuth refresh token) ----------------
  // Service Account personal TIDAK punya kuota storage Drive sendiri,
  // jadi dipakai OAuth refresh token milik akun Google Anda.
  // Dapatkan sekali via: node scripts/get-refresh-token.js
  //
  // Konfigurasi via environment variables:
  // GOOGLE_OAUTH_CLIENT_ID      -> Client ID OAuth Web Application
  // GOOGLE_OAUTH_CLIENT_SECRET  -> Client Secret OAuth
  // GOOGLE_OAUTH_REFRESH_TOKEN  -> dari scripts/get-refresh-token.js
  // GOOGLE_DRIVE_ROOT_FOLDER_ID -> ID folder root di Drive (contoh: 1jddk1kywV5DW69T_iqn2DM3qaT_BRORn)
  let driveClient = null;
  let driveRootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "1jddk1kywV5DW69T_iqn2DM3qaT_BRORn";

  function initDriveClient() {
    if (driveClient) return true;
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
    if (!clientId || !clientSecret || !refreshToken) {
      console.warn("GOOGLE_OAUTH_CLIENT_ID / SECRET / REFRESH_TOKEN belum diset — Drive sync dinonaktifkan. Jalankan: node scripts/get-refresh-token.js");
      return false;
    }
    const auth = new google.auth.OAuth2(clientId, clientSecret);
    auth.setCredentials({ refresh_token: refreshToken });
    driveClient = google.drive({ version: "v3", auth });
    return true;
  }

  async function findOrCreateDriveFolder(name, parentId) {
    if (!driveClient) throw new Error("Drive client belum init");
    const q = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${parentId}' in parents`;
    const res = await driveClient.files.list({ q, fields: "files(id,name)", spaces: "drive" });
    if (res.data.files && res.data.files.length) return res.data.files[0].id;
    const meta = { name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] };
    const cr = await driveClient.files.create({ resource: meta, fields: "id" });
    return cr.data.id;
  }

  async function uploadDriveFile(folderId, fileName, mimeType, base64Data) {
    if (!driveClient) throw new Error("Drive client belum init");
    const buffer = Buffer.from(base64Data, "base64");
    const meta = { name: fileName, parents: [folderId] };
    const media = { mimeType, body: require("stream").Readable.from(buffer) };
    const res = await driveClient.files.create({ resource: meta, media, fields: "id" });
    return res.data.id;
  }

  async function handleSyncToDrive(req, res) {
    if (!initDriveClient()) {
      return sendJson(res, 503, { error: "Drive sync belum dikonfigurasi (GOOGLE_SERVICE_ACCOUNT_KEY)" });
    }
    const body = await readBody(req);
    const { parcelId, parcel, files } = body;
    if (!parcelId || !parcel) {
      return sendJson(res, 400, { error: "parcelId dan parcel wajib" });
    }
    try {
      // Root folder -> parcel folder
      const parcelFolderName = `${parcel.id} - ${(parcel.name || "Tanah").replace(/[\\/:*?"<>|]/g, "_")}`;
      const parcelFolderId = await findOrCreateDriveFolder(parcelFolderName, driveRootFolderId);

      // 1. data.json
      const cleanParcel = {
        id: parcel.id, name: parcel.name, attributes: parcel.attributes, style: parcel.style,
        points: parcel.latlngs || parcel.points,
        proof: parcel.proof || null, recordedAt: parcel.recordedAt || null,
        evidence: (parcel.evidence || []).map(e => ({ id: e.id, category: e.category, filename: e.filename, type: e.type, size: e.size, hash: e.hash, addedAt: e.addedAt })),
        visits: parcel.visits || [], pins: parcel.pins || [], status: parcel.status || "belum",
        reminders: parcel.reminders || null, lastVisit: parcel.lastVisit || null,
        pointPhotos: (parcel.pointPhotos || []).map(ph => ph ? { hash: ph.hash, at: ph.at, lat: ph.lat, lon: ph.lon } : null),
      };
      await uploadDriveFile(parcelFolderId, "data.json", "application/json", Buffer.from(JSON.stringify(cleanParcel, null, 2)).toString("base64"));

      // 2. pointPhotos
      const photos = (parcel.pointPhotos || []).filter(ph => ph && ph.dataUrl);
      for (let i = 0; i < photos.length; i++) {
        const ph = photos[i];
        const base64 = ph.dataUrl.split(",")[1];
        await uploadDriveFile(parcelFolderId, `foto-titik-${i + 1}.jpg`, "image/jpeg", base64);
      }

      // 3. Evidence files
      const evidences = (parcel.evidence || []).filter(e => e.dataUrl);
      for (const ev of evidences) {
        const base64 = ev.dataUrl.split(",")[1];
        const safeName = ev.filename || `evidence-${ev.id}.${(ev.type || "application/octet-stream").split("/")[1] || "bin"}`;
        await uploadDriveFile(parcelFolderId, safeName, ev.type || "application/octet-stream", base64);
      }

      // 4. Visit photos
      const visits = parcel.visits || [];
      for (let vi = 0; vi < visits.length; vi++) {
        const v = visits[vi];
        const vPhotos = (v.photos || []).filter(ph => ph && ph.dataUrl);
        for (let pi = 0; pi < vPhotos.length; pi++) {
          const ph = vPhotos[pi];
          const base64 = ph.dataUrl.split(",")[1];
          await uploadDriveFile(parcelFolderId, `kunjungan-${vi + 1}-foto-${pi + 1}.jpg`, "image/jpeg", base64);
        }
      }

      return sendJson(res, 200, { ok: true, folderId: parcelFolderId });
    } catch (e) {
      console.error("Sync to Drive error:", e);
      return sendJson(res, 500, { error: e.message });
    }
  }

  return sendJson(res, 404, { error: "Endpoint tidak ditemukan" });
}

// ---------------- Server ----------------
ensureStore();

const server = http.createServer(async (req, res) => {
  const urlPath = req.url.split("?")[0];
  try {
    if (urlPath.startsWith("/api/")) {
      await handleApi(req, res, urlPath);
    } else {
      serveStatic(req, res, req.url);
    }
  } catch (e) {
    sendJson(res, 400, { error: e.message });
  }
});

server.listen(PORT, () => {
  console.log("=================================================");
  console.log("  Web GIS Pertanahan — Backend aktif");
  console.log("  URL   : http://localhost:" + PORT);
  console.log("  Data  : " + DATA_FILE);
  console.log("=================================================");
});
