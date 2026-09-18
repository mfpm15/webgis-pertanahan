/* =============================================================
 * server.js — Backend Web GIS Pertanahan (Node.js stdlib, 0 dependency)
 * -------------------------------------------------------------
 * - Menyajikan file frontend (index.html, css, js).
 * - REST API menyimpan data bidang sebagai file JSON di disk laptop:
 *     data/parcels.json
 *
 * Endpoint:
 *   GET    /api/health          -> { ok: true }
 *   GET    /api/parcels         -> { parcels: [...] }
 *   PUT    /api/parcels         -> simpan seluruh daftar (body: {parcels:[...]})
 *   POST   /api/parcels         -> tambah 1 bidang (body: parcel)
 *   DELETE /api/parcels/:id     -> hapus 1 bidang
 *
 * Jalankan:  node server.js   (lalu buka http://localhost:3000)
 * ============================================================= */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

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
