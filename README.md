<div align="center">

# 🗺️ WebGIS Pertanahan

**Petakan, ukur, dan catat bidang tanah langsung dari browser — bahkan dari lapangan.**

Ukur luas & keliling otomatis · Tandai sudut tanah dengan GPS presisi tinggi · Jejak digital anti-palsu · Foto bertimestamp per titik · Sinkron otomatis ke Google Drive

[Cara pakai](#-cara-pakai) · [Menjalankan](#-menjalankan) · [Deploy](#-deploy-ke-netlify) · [Fitur](#-fitur) · [Jejak Digital](#-jejak-digital-anti-palsu) · [Google Drive](#-sinkronisasi-google-drive)

</div>

---

## Kenapa aplikasi ini

Mengukur tanah biasanya butuh software berat atau alat mahal. WebGIS Pertanahan
dibuat sederhana: buka di HP atau komputer, gambar batas tanah, dan luasnya
langsung keluar. Cocok untuk perangkat desa, surveyor, agen properti, atau
keluarga yang ingin mendokumentasikan tanah warisan tanpa proses sertifikasi
BPN yang panjang.

- **Ringan** — tanpa framework, tanpa instalasi rumit. Cukup browser.
- **Privat** — data tersimpan di perangkat masing-masing, bukan di server orang lain.
- **Bisa offline** — pasang sebagai aplikasi, peta area yang pernah dibuka tetap jalan tanpa sinyal.
- **Gratis** — semua peta dasar & geocoding memakai layanan tanpa biaya, tanpa API key.
- **Anti-palsu** — sidik jari SHA-256, timestamp Bitcoin (OpenTimestamps), audit trail — bukti data tidak diubah sejak dicatat.

---

## ✨ Fitur

| | |
|---|---|
| 🛰️ **4 peta dasar** | Google Hybrid, Google Satelit, Esri Satelit, OpenStreetMap |
| ✏️ **Gambar bidang** | Poligon atau persegi langsung di peta, bisa diedit & dihapus |
| 📍 **Tagging GPS presisi** | Weighted averaging 6 sampel, filter sinyal lemah, indikator akurasi live |
| 📷 **Foto bertimestamp per titik** | Kamera otomatis tiap titik GPS direkam, watermark tanggal+koordinat |
| 🌍 **Auto-isi alamat** | Desa/kecamatan/kabupaten/provinsi otomatis dari koordinat (Nominatim) |
| 📐 **Ukuran lengkap** | Luas (m²/ha/are), keliling, panjang tiap sisi, titik tengah |
| 🔐 **Jejak digital anti-palsu** | SHA-256 fingerprint, timestamp Bitcoin, audit trail append-only |
| 📎 **Lampiran bukti** | Girik/letter C, SPPT PBB, akta, foto patok — tersimpan dengan hash |
| 🚶 **Riwayat kunjungan** | Catat kunjungan berkala + foto, deteksi otomatis pergeseran patok |
| ☁️ **Sinkron Google Drive** | Backup otomatis foto & data ke Drive, folder per bidang |
| 🎨 **8 warna bidang** | Bedakan tiap bidang dengan mudah |
| 🔎 **Pencarian** | Cari dari nama, pemilik, nomor sertifikat, atau NIB |
| 💾 **Simpan otomatis** | Ke file (mode backend) atau ke browser (mode statis) |
| 🔁 **Import/Export** | GeoJSON (QGIS/ArcGIS), KML/GPX |
| 📱 **PWA** | Bisa dipasang seperti aplikasi & dipakai offline |

---

## 🚀 Cara pakai

**Menambah bidang dari peta:** klik ikon gambar (▢ / ⬡) di kiri atas peta,
klik tiap sudut, lalu tutup di titik awal. Form data muncul otomatis, termasuk
tombol kamera per titik sudut untuk foto bertimestamp. **Batal** akan membuang
bidang yang belum disimpan.

**Menandai langsung di lapangan:** tekan **Mulai Tagging Lapangan**, berjalan
ke tiap sudut tanah sambil menekan **Rekam Titik** — kamera otomatis terbuka
tiap titik untuk foto bertimestamp+koordinat, lalu **Selesai**. Bidang
terbentuk dari rata-rata beberapa sampel GPS (bukan cuma 1 bacaan) untuk
akurasi lebih baik. Desa/kecamatan/kabupaten/provinsi terisi otomatis dari
koordinat.

**Melihat ukuran:** klik bidang di peta atau di daftar. Luas, keliling, panjang
sisi, dan koordinat tampil di panel kiri.

**Mencatat kunjungan:** panel **🚶 Riwayat Kunjungan** → **Kunjungan Baru** →
tambahkan foto + catatan + lokasi GPS. Aplikasi otomatis mendeteksi jika ada
pergeseran patok dibanding kunjungan sebelumnya (>2.5 m).

**Mengunci bukti digital:** panel **🔐 Jejak Digital** menampilkan sidik jari
SHA-256 tiap bidang. Tombol **Kunci Bukti** mencatatkan hash ke Bitcoin
blockchain (OpenTimestamps, gratis) sebagai bukti waktu yang tidak bisa
dipalsukan.

> Tombol **❓ Bantuan** di pojok kiri atas berisi panduan lengkap, dan muncul
> otomatis saat pertama kali membuka aplikasi.

---

## 🧭 Menjalankan

### Mode backend — data disimpan jadi file di komputer

```bash
cd web-gis-pertanahan
node server.js
```

Buka **http://localhost:3000**. Data tersimpan di `data/parcels.json`. Untuk
backup atau pindah komputer, cukup salin file itu.

### Mode statis — tanpa Node

```bash
cd web-gis-pertanahan
python -m http.server 8000
```

Buka **http://localhost:8000**. Data tersimpan di browser.

---

## ☁️ Deploy ke Netlify

Aplikasinya statis, jadi bisa dihosting gratis. Saat online, data tiap
pengunjung tersimpan di browsernya sendiri — privat dan terpisah per perangkat.

**Dari GitHub:**

1. Push repo ini ke GitHub.
2. Di [Netlify](https://app.netlify.com): **Add new site → Import an existing project**.
3. Pilih repo-nya, biarkan build command kosong, publish directory diisi `.` (sudah diatur di `netlify.toml`).
4. **Deploy.** Situs langsung online dengan HTTPS — penting agar GPS & PWA aktif.

**Drag-and-drop:** buka [app.netlify.com/drop](https://app.netlify.com/drop),
seret folder `web-gis-pertanahan`. Selesai.

---

## 📲 Pasang sebagai aplikasi (PWA)

Saat dibuka via HTTPS (mis. dari Netlify), browser akan menawarkan **Pasang
App** — atau klik tombol di pojok kiri atas. Setelah dipasang, aplikasi punya
ikon sendiri dan tetap bisa dibuka tanpa sinyal untuk area peta yang sudah
pernah dimuat. Sangat membantu saat survei di lokasi terpencil.

---

## 🔐 Jejak digital anti-palsu

Untuk mendokumentasikan tanah keluarga tanpa sertifikat BPN, aplikasi ini
menyediakan lapisan bukti digital (semua lokal, tanpa server pihak ketiga):

- **Sidik jari SHA-256** — setiap perubahan data bidang menghasilkan hash unik.
  Ubah satu koma pun, hash-nya berubah total.
- **Timestamp Bitcoin (OpenTimestamps)** — hash dicatatkan ke blockchain
  Bitcoin lewat calendar server gratis, sebagai bukti waktu yang tidak bisa
  dipalsukan atau dimundurkan.
- **Audit trail (Merkle-chain)** — setiap aksi (buat, edit, hapus) dicatat
  berantai; jika satu entri diubah, seluruh rantai setelahnya terdeteksi rusak.
- **Lampiran berhash** — girik/letter C, SPPT PBB, akta, foto patok — tiap
  file dihitung hash-nya saat diunggah.
- **Kartu Bukti PDF** — ringkasan bidang + sidik jari + QR verifikasi, siap
  dicetak atau dilampirkan ke pengajuan PTSL.
- **Halaman verifikasi publik** (`verify.html`) — siapa pun bisa mengecek
  apakah data cocok dengan hash yang tercatat, tanpa melihat koordinat asli.

> ⚠️ Bukti ini membuktikan **data tidak berubah** dan **ada sejak waktu
> tertentu** — bukan pengakuan kepemilikan oleh negara. Acuan resmi tetap
> sertifikat & pengukuran BPN.

---

## ☁️ Sinkronisasi Google Drive

Foto dan data bidang bisa disinkronkan otomatis ke Google Drive, tersusun
rapi per bidang tanpa perlu tiap anggota tim login satu-satu.

**Struktur folder di Drive:**
```
WebGIS Pertanahan/
├── GB-001 - Nama Bidang/
│   ├── data.json              # atribut, koordinat, bukti digital
│   ├── foto-titik-1.jpg       # foto tiap titik sudut (bertimestamp)
│   ├── foto-titik-2.jpg
│   ├── kunjungan-1-foto-1.jpg # foto riwayat kunjungan
│   └── girik-abc.jpg          # lampiran bukti
└── GB-002 - Nama Bidang Lain/
    └── ...
```

**Setup sekali (oleh admin/pemilik akun Drive):**

1. Buat **OAuth Client ID** (Web application) di
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   — aktifkan Google Drive API, isi *Authorized redirect URIs* dengan
   `http://localhost:3000` dan domain Netlify Anda.
2. Jalankan sekali untuk mendapatkan refresh token:
   ```bash
   set OAUTH_CLIENT_SECRET=isi-client-secret-anda
   node scripts/get-refresh-token.js
   ```
   Ikuti link yang muncul, login, dan setujui akses. Refresh token akan
   dicetak di terminal.
3. Set environment variables (di `.env` lokal atau Netlify Site Settings):
   - `GOOGLE_OAUTH_CLIENT_ID`
   - `GOOGLE_OAUTH_CLIENT_SECRET`
   - `GOOGLE_OAUTH_REFRESH_TOKEN`
   - `GOOGLE_DRIVE_ROOT_FOLDER_ID` (ID folder tujuan di Drive)
4. Redeploy. Tim lapangan tinggal buka aplikasi dan klik **☁️ Sinkronkan via
   Server** — tanpa perlu login Google sendiri.

> Catatan: Service Account **tidak** dipakai untuk penyimpanan karena akun
> personal tidak punya kuota Drive tanpa Shared Drive (fitur Google
> Workspace berbayar). Karena itu dipakai OAuth refresh token dari akun
> Google pemilik folder.

---

## 🗂️ Struktur

```
web-gis-pertanahan/
├── index.html                  # halaman utama
├── verify.html                 # halaman verifikasi publik (hash saja)
├── server.js                   # backend Node (REST API + Drive sync + penyajian file)
├── sw.js                       # service worker (offline / PWA)
├── manifest.webmanifest        # metadata PWA
├── netlify.toml                # konfigurasi deploy + redirect function
├── icons/icon.svg              # ikon aplikasi
├── css/style.css
├── netlify/functions/
│   └── sync-to-drive.js        # serverless: sync ke Drive saat di-hosting Netlify
├── scripts/
│   └── get-refresh-token.js    # ambil OAuth refresh token (dijalankan sekali)
└── js/
    ├── geo.js                  # hitung luas, keliling, sisi, titik tengah
    ├── geocode.js               # reverse geocoding (Nominatim)
    ├── storage.js               # simpan ke backend atau browser
    ├── gps.js                   # lokasi, tagging GPS lapangan, live signal
    ├── photo.js                 # kamera, watermark foto, share
    ├── crypto.js                 # SHA-256 fingerprint, audit trail (F1)
    ├── timestamp.js               # OpenTimestamps / Bitcoin (F2)
    ├── evidence.js                # lampiran dokumen berhash (F3)
    ├── field.js                   # kunjungan, pin, reminder, deteksi pergeseran (F6/F7/F8)
    ├── report.js                  # PDF, QR, backup ZIP (F4/F5)
    ├── proof-panel.js              # UI panel jejak digital
    ├── visit-panel.js              # UI panel riwayat kunjungan
    ├── gdrive.js                   # sync Google Drive (client-side OAuth, opsional)
    ├── verify.js                   # logika halaman verifikasi publik
    ├── ui.js                       # service worker, install PWA, panduan
    ├── data.js                     # data contoh (dummy)
    └── app.js                      # logika peta & tampilan utama
```

## 🔌 API backend

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| GET | `/api/health` | Cek server |
| GET | `/api/parcels` | Ambil semua bidang |
| PUT | `/api/parcels` | Simpan seluruh daftar |
| POST | `/api/parcels` | Tambah satu bidang |
| DELETE | `/api/parcels/:id` | Hapus satu bidang |
| POST | `/api/sync-to-drive` | Sinkron 1 bidang (data + foto) ke Google Drive |

---

## 🛠️ Dibangun dengan

[Leaflet](https://leafletjs.com) · [Leaflet.draw](https://github.com/Leaflet/Leaflet.draw) · Vanilla JavaScript · Node.js (tanpa dependency)

## ⚠️ Catatan

Luas dan keliling dihitung dari koordinat sehingga bersifat perkiraan. Untuk
keperluan resmi atau sertifikat, gunakan hasil pengukuran BPN.

## 📄 Lisensi

[MIT](LICENSE) — bebas dipakai, diubah, dan disebarkan.

