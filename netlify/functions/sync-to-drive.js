/* =============================================================
 * netlify/functions/sync-to-drive.js — Netlify Function
 * -------------------------------------------------------------
 * Serverless equivalent of server.js's /api/sync-to-drive endpoint.
 * Dipakai saat situs di-deploy ke Netlify (server.js Node biasa
 * TIDAK berjalan di Netlify — hanya situs statis + Functions).
 *
 * Env vars (Netlify Site Settings -> Environment Variables):
 *   GOOGLE_SERVICE_ACCOUNT_KEY   -> isi JSON service-account (1 baris)
 *   GOOGLE_DRIVE_ROOT_FOLDER_ID  -> ID folder root Drive
 * ============================================================= */
"use strict";

const { google } = require("googleapis");

let driveClient = null;

function initDriveClient() {
  if (driveClient) return driveClient;
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY belum diset di Netlify env vars");
  const credentials = JSON.parse(keyJson);
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  driveClient = google.drive({ version: "v3", auth });
  return driveClient;
}

async function findOrCreateFolder(drive, name, parentId) {
  const q = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${parentId}' in parents`;
  const res = await drive.files.list({ q, fields: "files(id,name)", spaces: "drive" });
  if (res.data.files && res.data.files.length) return res.data.files[0].id;
  const meta = { name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] };
  const cr = await drive.files.create({ resource: meta, fields: "id" });
  return cr.data.id;
}

async function uploadFile(drive, folderId, fileName, mimeType, base64Data) {
  const buffer = Buffer.from(base64Data, "base64");
  const meta = { name: fileName, parents: [folderId] };
  const media = { mimeType, body: require("stream").Readable.from(buffer) };
  const res = await drive.files.create({ resource: meta, media, fields: "id" });
  return res.data.id;
}

exports.handler = async function (event) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "JSON tidak valid" }) };
  }

  const { parcelId, parcel } = body;
  if (!parcelId || !parcel) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "parcelId dan parcel wajib" }) };
  }

  try {
    const drive = initDriveClient();
    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "";
    if (!rootFolderId) throw new Error("GOOGLE_DRIVE_ROOT_FOLDER_ID belum diset");

    const parcelFolderName = `${parcel.id} - ${(parcel.name || "Tanah").replace(/[\\/:*?"<>|]/g, "_")}`;
    const parcelFolderId = await findOrCreateFolder(drive, parcelFolderName, rootFolderId);

    // 1. data.json
    const cleanParcel = {
      id: parcel.id, name: parcel.name, attributes: parcel.attributes, style: parcel.style,
      points: parcel.latlngs || parcel.points,
      proof: parcel.proof || null, recordedAt: parcel.recordedAt || null,
      evidence: (parcel.evidence || []).map((e) => ({ id: e.id, category: e.category, filename: e.filename, type: e.type, size: e.size, hash: e.hash, addedAt: e.addedAt })),
      visits: parcel.visits || [], pins: parcel.pins || [], status: parcel.status || "belum",
      reminders: parcel.reminders || null, lastVisit: parcel.lastVisit || null,
      pointPhotos: (parcel.pointPhotos || []).map((ph) => (ph ? { hash: ph.hash, at: ph.at, lat: ph.lat, lon: ph.lon } : null)),
    };
    await uploadFile(drive, parcelFolderId, "data.json", "application/json", Buffer.from(JSON.stringify(cleanParcel, null, 2)).toString("base64"));

    // 2. pointPhotos
    const photos = (parcel.pointPhotos || []).filter((ph) => ph && ph.dataUrl);
    for (let i = 0; i < photos.length; i++) {
      const base64 = photos[i].dataUrl.split(",")[1];
      await uploadFile(drive, parcelFolderId, `foto-titik-${i + 1}.jpg`, "image/jpeg", base64);
    }

    // 3. Evidence
    const evidences = (parcel.evidence || []).filter((e) => e.dataUrl);
    for (const ev of evidences) {
      const base64 = ev.dataUrl.split(",")[1];
      const safeName = ev.filename || `evidence-${ev.id}.${(ev.type || "application/octet-stream").split("/")[1] || "bin"}`;
      await uploadFile(drive, parcelFolderId, safeName, ev.type || "application/octet-stream", base64);
    }

    // 4. Visit photos
    const visits = parcel.visits || [];
    for (let vi = 0; vi < visits.length; vi++) {
      const vPhotos = (visits[vi].photos || []).filter((ph) => ph && ph.dataUrl);
      for (let pi = 0; pi < vPhotos.length; pi++) {
        const base64 = vPhotos[pi].dataUrl.split(",")[1];
        await uploadFile(drive, parcelFolderId, `kunjungan-${vi + 1}-foto-${pi + 1}.jpg`, "image/jpeg", base64);
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, folderId: parcelFolderId }) };
  } catch (e) {
    console.error("Sync to Drive error:", e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
