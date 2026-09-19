/* Insert dummy parcel ke Google Drive via endpoint live Netlify.
   Dipakai sekali untuk uji end-to-end; aman dihapus manual dari Drive. */
const https = require("https");

// JPEG 1x1 piksel valid (base64) — hanya utk uji
const TINY_JPEG_B64 =
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a" +
  "HBwgJC4nKCIsMDAwQEBAQEBAQEBAQEBAQEBAAP/bAEMAFAQGBwcKCAgICwsKCAwOEA4ODg8QDhIS" +
  "EBUVFxgSEhEXGBQWEhMWFxgaEBgYHB0aHR4fISIlJC0tLiYzKikqNSwvQ0NDQ0NDQ0NDQ0NDQ0ND" +
  "/9k= ";

const parcel = {
  id: "DUMMY-DEMO",
  name: "Dummy Uji Drive",
  attributes: {
    pemilik: "Nama Uji",
    jenisHak: "Sertifikat Hak Milik",
    luasM2: 1250,
    kecamatan: "Kebayoran Baru",
    provinsi: "DKI Jakarta",
    keterangan: "Bidang dummy untuk uji sinkronisasi Google Drive",
  },
  style: { color: "#2E7D32", fillColor: "#8BC34A", weight: 3 },
  latlngs: [
    [-6.2400, 106.7900],
    [-6.2400, 106.7920],
    [-6.2420, 106.7920],
    [-6.2420, 106.7900],
  ],
  proof: null,
  recordedAt: "2026-09-19T01:58:00+07:00",
  evidence: [
    {
      id: "EV-1",
      category: "surat",
      filename: "kutipan-surat-uji.txt",
      type: "text/plain",
      size: 20,
      hash: "demo-hash-001",
      addedAt: "2026-09-19T01:58:00+07:00",
      dataUrl: "data:text/plain;base64," + Buffer.from("Kutipan surat uji drive\n").toString("base64"),
    },
  ],
  visits: [
    {
      id: "V-1",
      at: "2026-09-19T08:00:00+07:00",
      note: "Kunjungan uji — batas timur tetap",
      lat: -6.241,
      lon: 106.791,
      photos: [
        { dataUrl: "data:image/jpeg;base64," + TINY_JPEG_B64.replace(/\s/g, "") },
      ],
    },
  ],
  pins: [],
  status: "berlangsung",
  reminders: null,
  lastVisit: "2026-09-19T08:00:00+07:00",
  pointPhotos: [
    { hash: "demo-ph-1", at: "2026-09-19T08:05:00+07:00", lat: -6.240, lon: 106.790, dataUrl: "data:image/jpeg;base64," + TINY_JPEG_B64.replace(/\s/g, "") },
    { hash: "demo-ph-2", at: "2026-09-19T08:07:00+07:00", lat: -6.240, lon: 106.792, dataUrl: "data:image/jpeg;base64," + TINY_JPEG_B64.replace(/\s/g, "") },
  ],
};

const body = JSON.stringify({ parcelId: parcel.id, parcel, files: [] });

const req = https.request(
  "https://webgistanah.netlify.app/api/sync-to-drive",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
  },
  (res) => {
    let data = "";
    res.on("data", (c) => (data += c));
    res.on("end", () => {
      console.log("HTTP " + res.statusCode);
      console.log("Response: " + data);
    });
  }
);
req.on("error", (e) => {
  console.error("Request error:", e.message);
  process.exit(1);
});
req.write(body);
req.end();
