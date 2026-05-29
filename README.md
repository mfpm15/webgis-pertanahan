<div align="center">

# 🗺️ WebGIS Pertanahan

### Sistem Informasi Bidang Tanah berbasis Peta — ringan, gratis, dan bisa dipakai siapa saja

[![Made with Leaflet](https://img.shields.io/badge/Peta-Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com)
[![Vanilla JS](https://img.shields.io/badge/Kode-Vanilla_JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](#)
[![No Build](https://img.shields.io/badge/Build-Tanpa_Bundler-2b8a3e?style=for-the-badge)](#)
[![Deploy Netlify](https://img.shields.io/badge/Deploy-Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://www.netlify.com)
[![License MIT](https://img.shields.io/badge/Lisensi-MIT-blue?style=for-the-badge)](#-lisensi)

**Ukur luas & keliling tanah · Tagging GPS langsung di lapangan · Simpan data di perangkat sendiri · Ekspor GeoJSON**

</div>

---

## ✨ Sorotan

> Dibuat untuk surveyor, perangkat desa, agen properti, dan pemilik tanah yang butuh
> alat pemetaan bidang yang **cepat, akurat, dan tanpa biaya server**.

- 🛰️ **4 peta dasar** — Google Hybrid, Google Satelit, Esri Satelit, OpenStreetMap.
- ✏️ **Gambar bidang** langsung di peta (poligon & persegi), edit & hapus titik.
- 📍 **Tagging GPS lapangan** — berjalan ke tiap sudut tanah, tekan tombol, bidang terbentuk otomatis.
- 📐 **Perhitungan lengkap** — luas (m² / ha / are), keliling, panjang tiap sisi, titik pusat, plus penjelasan ramah-awam.
- 🎨 **8 pilihan warna** bidang agar mudah dibedakan.
- 🔎 **Pencarian** cepat berdasarkan nama, pemilik, no. sertifikat, atau NIB.
- 📊 **Ringkasan otomatis** — jumlah bidang, total luas (m² & ha).
- 💾 **Simpan otomatis** — ke file di laptop (mode backend) atau ke browser tiap pengguna (mode statis/Netlify).
- 🔁 **Import & Export GeoJSON** — kompatibel dengan QGIS, ArcGIS, dan tools GIS lain.
- 📱 **Responsif** — nyaman dipakai di HP saat di lapangan.
- ⚡ **Ringan & cepat** — vanilla JS, tanpa framework, target skor Lighthouse maksimal.

---

## 🚀 Demo Singkat

| Aksi | Cara |
|------|------|
| Tambah bidang (di kantor) | Klik ikon ▢/⬡ di kiri-atas peta → klik titik-titik → tutup di titik awal |
| Tambah bidang (di lapangan) | **📍 GPS Lapangan → 🚶 Mulai Tagging** → jalan ke tiap sudut → **➕ Rekam Titik** → **✅ Selesai** |
| Lihat ukuran & info | Klik poligon atau item daftar |
| Ubah warna / atribut | Pilih bidang → **✏️ Edit Info** → pilih warna → Simpan |
| Bagikan data | **⬇️ Export GeoJSON** lalu kirim filenya |

---

## 🧭 Cara Menjalankan

### Opsi 1 — Mode Backend (data tersimpan sebagai file di laptop) ⭐

Cocok untuk satu komputer kerja yang menyimpan arsip bidang.

```bash
cd web-gis-pertanahan
node server.js
```

Buka **http://localhost:3000**. Data otomatis tersimpan ke
`web-gis-pertanahan/data/parcels.json`. Untuk backup atau pindah komputer,
cukup salin file itu. Badge **💾 File Lokal** akan muncul di header.

### Opsi 2 — Mode Statis (tanpa Node)

```bash
cd web-gis-pertanahan
python -m http.server 8000
```

Buka **http://localhost:8000**. Data tersimpan di browser (localStorage).
Badge **🌐 Browser** muncul di header.

---

## ☁️ Deploy ke Netlify (agar bisa dipakai banyak orang)

Aplikasi ini **100% statis**, jadi gratis dihosting di Netlify. Saat online,
**data setiap pengunjung tersimpan di browsernya masing-masing** — privat dan
terpisah per perangkat, tanpa server pusat.

### Cara tercepat (dari GitHub)

1. Push repo ini ke GitHub (lihat bagian bawah).
2. Masuk ke [Netlify](https://app.netlify.com) → **Add new site → Import an existing project**.
3. Pilih repo `webgis-pertanahan`.
4. Biarkan **Build command kosong**, **Publish directory = `.`** (sudah diatur di `netlify.toml`).
5. Klik **Deploy**. Selesai — situs langsung online dengan HTTPS.

### Atau via drag-and-drop

Buka [app.netlify.com/drop](https://app.netlify.com/drop), seret folder
`web-gis-pertanahan` ke sana. Langsung jadi.

> 💡 Karena Netlify menyajikan statis, fitur "simpan ke file server" tidak aktif
> di sana — dan itu memang yang diinginkan: tiap pengguna menyimpan datanya
> sendiri di perangkatnya. Mereka tetap bisa Export/Import GeoJSON untuk berbagi.

---

## 🧩 Fitur Detail

### Informasi tiap bidang
Setiap bidang menampilkan: **Luas** (m², ha, are), **Keliling** (m),
**Panjang tiap sisi** (jarak antar titik sudut), **Titik pusat**, daftar
**koordinat** semua sudut, dan **atribut legal** (pemilik, no. sertifikat, NIB,
jenis hak, status, penggunaan, lokasi administratif). Disertai **kotak penjelasan**
agar pengguna awam paham arti tiap angka.

### Tagging GPS lapangan
Mode khusus untuk survei langsung di lokasi. Tekan **Mulai Tagging**, lalu di tiap
sudut tanah tekan **Rekam Titik di Sini** — aplikasi mengambil posisi GPS perangkat
(akurasi ditampilkan dalam meter). Setelah ≥3 titik, tekan **Selesai** dan bidang
otomatis terbentuk lalu form atribut terbuka. Ada juga **Lokasi Saya** untuk
memusatkan peta ke posisi sekarang.

### Penyimpanan adaptif
`js/storage.js` mendeteksi otomatis: jika backend Node aktif → simpan ke file;
jika tidak (statis/Netlify) → simpan ke `localStorage` browser. Tetap ada cadangan
ke browser walau backend dipakai, sehingga data tidak mudah hilang.

---

## 🔌 REST API (mode backend)

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| `GET` | `/api/health` | Cek status server |
| `GET` | `/api/parcels` | Ambil semua bidang |
| `PUT` | `/api/parcels` | Simpan seluruh daftar (`{parcels:[...]}`) |
| `POST` | `/api/parcels` | Tambah satu bidang |
| `DELETE` | `/api/parcels/:id` | Hapus satu bidang |

Penyimpanan file bersifat **atomik** (tulis ke `.tmp` lalu rename) agar data
tidak korup bila proses terhenti di tengah.

---

## 🗂️ Struktur Proyek

```
web-gis-pertanahan/
├── index.html          # Halaman utama (peta + panel + form)
├── server.js           # Backend Node.js (REST API + static, 0 dependency)
├── netlify.toml        # Konfigurasi deploy statis + header keamanan
├── package.json        # npm start
├── css/
│   └── style.css       # Tema gelap, responsif, aksesibel
├── js/
│   ├── geo.js          # Hitung luas, keliling, sisi, centroid (mandiri)
│   ├── storage.js      # Lapisan simpan: backend API ↔ localStorage
│   ├── gps.js          # Lokasi Saya + Tagging GPS lapangan
│   ├── data.js         # Data awal (seed) bidang contoh
│   └── app.js          # Orkestrasi peta, gambar, atribut, warna, UI
├── data/
│   └── parcels.json    # Data tersimpan (dibuat otomatis oleh backend)
└── README.md
```

---

## 🛠️ Teknologi

- **[Leaflet](https://leafletjs.com)** + **[Leaflet.draw](https://github.com/Leaflet/Leaflet.draw)** — peta interaktif & alat gambar.
- **Vanilla JavaScript** — tanpa framework, tanpa build step, mudah dirawat.
- **Node.js (modul `http` bawaan)** — backend tanpa satu pun dependency eksternal.
- **Geolocation API** — untuk tagging GPS lapangan.

---

## ⚡ Performa & Lighthouse

Aplikasi dirancang ringan demi skor Lighthouse maksimal:

- Tanpa framework/bundler — payload JS kecil, semua script `defer`.
- Meta `description`, `theme-color`, `lang`, dan judul untuk **SEO**.
- Label ARIA, teks `sr-only`, dan `:focus-visible` untuk **Aksesibilitas**.
- Header keamanan (`X-Content-Type-Options`, dll.) via `netlify.toml` untuk **Best Practices**.
- Caching aset statis 1 tahun (immutable) di Netlify.

> Tile peta dimuat dari CDN pihak ketiga; saat audit Lighthouse, fokuskan pada
> metrik aplikasi (skrip & markup lokal sudah dioptimalkan).

---

## 🗺️ Data Contoh — Tanah Yang Dijanjikan

Empat titik dari pin Google Maps (Simalungun, Sumatera Utara):

| # | Latitude | Longitude |
|---|----------|-----------|
| 1 | 3.251499 | 99.575556 |
| 2 | 3.251434 | 99.575599 |
| 3 | 3.251553 | 99.575268 |
| 4 | 3.251961 | 99.575263 |

Estimasi **luas ≈ 783 m²** (0,078 ha), **keliling ≈ 149 m**.

> ⚠️ **Catatan akurasi:** Semua angka dihitung dari koordinat dan bersifat
> **estimasi**. Untuk keperluan legal/sertifikasi, acuan resmi tetap hasil
> pengukuran **BPN (Badan Pertanahan Nasional)**.

---

## 🤝 Kontribusi

Kontribusi terbuka. Fork repo, buat branch fitur, lalu kirim Pull Request.
Ide pengembangan: input lat/lon manual, cetak PDF sertifikat bidang, lapisan
batas administratif, dan mode multi-pengguna.

---

## 📄 Lisensi

Dirilis di bawah lisensi **MIT** — bebas digunakan, dimodifikasi, dan disebarkan.

<div align="center">

**Dibuat dengan ❤️ untuk memudahkan pemetaan tanah di Indonesia**

</div>

