# WebGIS Pertanahan

Aplikasi peta untuk mencatat bidang tanah: ukur luas dan keliling, tandai sudut
lewat GPS saat di lapangan, lalu simpan datanya. Jalan di browser, tanpa biaya
server, dan bisa dipakai di HP maupun komputer.

Dibuat dengan Leaflet dan JavaScript biasa (tanpa framework), jadi ringan dan
gampang dipasang.

## Fitur

- Empat peta dasar: Google Hybrid, Google Satelit, Esri Satelit, dan OpenStreetMap.
- Gambar bidang langsung di peta (poligon atau persegi), bisa diedit dan dihapus.
- Tandai sudut tanah lewat GPS saat survei di lokasi.
- Hitung otomatis: luas (m², ha, are), keliling, panjang tiap sisi, dan titik tengah.
- Delapan pilihan warna supaya tiap bidang gampang dibedakan.
- Cari bidang dari nama, pemilik, nomor sertifikat, atau NIB.
- Ringkasan: jumlah bidang dan total luas.
- Simpan otomatis — ke file lewat backend, atau ke browser kalau dihosting statis.
- Impor dan ekspor GeoJSON (bisa dibuka di QGIS atau ArcGIS).
- Tampilan menyesuaikan layar HP.

## Cara pakai singkat

| Mau apa | Caranya |
|---------|---------|
| Tambah bidang di kantor | Klik ikon gambar di kiri atas peta, klik titik-titik, tutup di titik awal |
| Tambah bidang di lapangan | GPS Lapangan → Mulai Tagging → jalan ke tiap sudut → Rekam Titik → Selesai |
| Lihat ukuran dan info | Klik poligon atau item di daftar |
| Ganti warna / atribut | Pilih bidang → Edit Info → pilih warna → Simpan |
| Bagikan data | Export GeoJSON, lalu kirim filenya |

## Menjalankan

### Mode backend (data disimpan jadi file)

```bash
cd web-gis-pertanahan
node server.js
```

Buka http://localhost:3000. Data tersimpan di `data/parcels.json`. Mau backup
atau pindah komputer? Salin saja file itu.

### Mode statis (tanpa Node)

```bash
cd web-gis-pertanahan
python -m http.server 8000
```

Buka http://localhost:8000. Data disimpan di browser (localStorage).

## Deploy ke Netlify

Karena aplikasinya statis, hostingnya gratis di Netlify. Kalau sudah online,
data tiap orang tersimpan di browsernya masing-masing — tidak ada server pusat,
jadi data antar pengguna terpisah.

Dari GitHub:

1. Push repo ini ke GitHub.
2. Buka Netlify → Add new site → Import an existing project.
3. Pilih repo-nya.
4. Build command dikosongkan, publish directory diisi titik (`.`). Sudah diatur di `netlify.toml`.
5. Klik Deploy.

Atau lewat drag-and-drop: buka app.netlify.com/drop, lalu seret folder
`web-gis-pertanahan` ke sana.

Catatan: di Netlify fitur simpan-ke-file tidak aktif (tidak ada server), dan itu
memang yang diharapkan — tiap pengguna pegang datanya sendiri. Untuk berbagi,
pakai Export/Import GeoJSON.

## Struktur file

```
web-gis-pertanahan/
├── index.html        # halaman utama
├── server.js         # backend Node (REST API + penyajian file)
├── netlify.toml      # konfigurasi deploy statis
├── package.json
├── css/style.css
├── js/
│   ├── geo.js        # hitung luas, keliling, sisi, titik tengah
│   ├── storage.js    # pilih simpan ke backend atau ke browser
│   ├── gps.js        # lokasi & tagging GPS lapangan
│   ├── data.js       # data contoh (dummy)
│   └── app.js        # logika peta dan tampilan
└── data/parcels.json # data tersimpan (dibuat otomatis oleh backend)
```

## API backend

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| GET | `/api/health` | Cek server hidup |
| GET | `/api/parcels` | Ambil semua bidang |
| PUT | `/api/parcels` | Simpan seluruh daftar |
| POST | `/api/parcels` | Tambah satu bidang |
| DELETE | `/api/parcels/:id` | Hapus satu bidang |

## Data contoh

Aplikasi datang dengan dua bidang dummy (Bidang Contoh A dan B) di sekitar
Jakarta, hanya untuk demo. Hapus lewat aplikasi, atau ganti isinya di
`js/data.js` lalu klik "Muat Ulang Data Awal".

Angka luas dan keliling dihitung dari koordinat, jadi sifatnya perkiraan. Untuk
urusan resmi atau sertifikat, tetap pakai hasil ukur BPN.

## Lisensi

MIT — bebas dipakai, diubah, dan disebarkan.

