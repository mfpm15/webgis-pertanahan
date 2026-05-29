/* =============================================================
 * data.js — Data contoh (dummy) bidang tanah
 * -------------------------------------------------------------
 * Ini hanya data dummy untuk demo. Ganti/hapus lewat aplikasi,
 * atau edit array di bawah lalu klik "Muat Ulang Data Awal".
 *
 * Format titik: [latitude, longitude].
 * autoSort: true  -> titik diurutkan otomatis agar tidak menyilang.
 * ============================================================= */

const LAND_PARCELS = [
  {
    id: "DEMO-001",
    name: "Bidang Contoh A",
    attributes: {
      pemilik: "Budi Santoso",
      nib: "12.34.05.06.00123",
      noSertifikat: "SHM 00123",
      jenisHak: "Hak Milik (SHM)",
      status: "Aktif",
      penggunaan: "Pemukiman",
      desa: "Desa Contoh",
      kecamatan: "Kecamatan Contoh",
      kabupaten: "Kabupaten Contoh",
      provinsi: "Provinsi Contoh",
      keterangan: "Data dummy untuk keperluan demo.",
    },
    style: { color: "#e8590c", fillColor: "#ffa94d", fillOpacity: 0.35 },
    autoSort: true,
    points: [
      [-6.200000, 106.816666],
      [-6.200000, 106.817200],
      [-6.200500, 106.817200],
      [-6.200500, 106.816666],
    ],
  },
  {
    id: "DEMO-002",
    name: "Bidang Contoh B",
    attributes: {
      pemilik: "Siti Aminah",
      nib: "12.34.05.06.00124",
      noSertifikat: "HGB 00045",
      jenisHak: "Hak Guna Bangunan (HGB)",
      status: "Dijual",
      penggunaan: "Perkebunan",
      desa: "Desa Contoh",
      kecamatan: "Kecamatan Contoh",
      kabupaten: "Kabupaten Contoh",
      provinsi: "Provinsi Contoh",
      keterangan: "Data dummy untuk keperluan demo.",
    },
    style: { color: "#1971c2", fillColor: "#74c0fc", fillOpacity: 0.35 },
    autoSort: true,
    points: [
      [-6.201000, 106.818000],
      [-6.201000, 106.818800],
      [-6.201700, 106.818800],
      [-6.201700, 106.818000],
    ],
  },
];

// Ekspor ke global agar bisa dipakai app.js (tanpa modul/bundler).
window.LAND_PARCELS = LAND_PARCELS;
