/* =============================================================
 * data.js — Data bidang tanah untuk Web GIS Pertanahan
 * -------------------------------------------------------------
 * Cara menambah bidang baru:
 *   1. Salin satu objek di dalam array LAND_PARCELS di bawah.
 *   2. Ganti id, name, dan atribut lainnya.
 *   3. Isi "points" dengan daftar koordinat [latitude, longitude].
 *      Urutan titik TIDAK harus rapi — aplikasi akan otomatis
 *      mengurutkannya mengelilingi titik pusat agar poligon
 *      tidak saling menyilang. Kalau ingin urutan manual,
 *      set "autoSort": false.
 *
 * Catatan koordinat:
 *   Format Google Maps "lat, lon" -> di sini ditulis [lat, lon].
 *   Contoh: 3.151451, 99.375556  ->  [3.151451, 99.375556]
 * ============================================================= */

const LAND_PARCELS = [
  {
    id: "GB-001",
    name: "Tanah Gunung Bayu",
    // Atribut legal/administratif — silakan edit sesuai dokumen asli.
    attributes: {
      pemilik: "-",            // Nama pemilik
      nib: "-",                // Nomor Induk Bidang
      noSertifikat: "-",       // Nomor sertifikat (SHM/HGB/dll)
      jenisHak: "-",           // Contoh: Hak Milik (SHM)
      status: "Belum diverifikasi",
      penggunaan: "-",         // Contoh: Perkebunan, Pemukiman
      desa: "Gunung Bayu",
      kecamatan: "Bosar Maligas",
      kabupaten: "Simalungun",
      provinsi: "Sumatera Utara",
      keterangan: "Data titik berasal dari pin Google Maps.",
    },
    style: {
      color: "#e8590c",        // warna garis batas
      fillColor: "#ffa94d",    // warna isi
      fillOpacity: 0.35,
    },
    autoSort: true,
    // Daftar titik [latitude, longitude] sesuai tikor yang diberikan.
    points: [
      [3.151451, 99.375556],
      [3.151450, 99.375599],
      [3.151594, 99.375268],
      [3.151961, 99.375263],
    ],
  },
];

// Ekspor ke global agar bisa dipakai app.js (tanpa modul/bundler).
window.LAND_PARCELS = LAND_PARCELS;
