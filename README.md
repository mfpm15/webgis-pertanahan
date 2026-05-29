<div align="center">

# 🗺️ WebGIS Pertanahan

**Petakan, ukur, dan catat bidang tanah langsung dari browser — bahkan dari lapangan.**

Ukur luas & keliling otomatis · Tandai sudut tanah dengan GPS · Simpan di perangkat sendiri · Bisa dipasang seperti aplikasi & dipakai offline

[Cara pakai](#-cara-pakai) · [Menjalankan](#-menjalankan) · [Deploy](#-deploy-ke-netlify) · [Fitur](#-fitur)

</div>

---

## Kenapa aplikasi ini

Mengukur tanah biasanya butuh software berat atau alat mahal. WebGIS Pertanahan
dibuat sederhana: buka di HP atau komputer, gambar batas tanah, dan luasnya
langsung keluar. Cocok untuk perangkat desa, surveyor, agen properti, atau
pemilik tanah yang ingin mencatat aset.

- **Ringan** — tanpa framework, tanpa instalasi rumit. Cukup browser.
- **Privat** — data tersimpan di perangkat masing-masing, bukan di server orang lain.
- **Bisa offline** — pasang sebagai aplikasi, peta area yang pernah dibuka tetap jalan tanpa sinyal.
- **Gratis** — semua peta dasar memakai layanan tanpa biaya, tanpa API key.

---

## ✨ Fitur

| | |
|---|---|
| 🛰️ **4 peta dasar** | Google Hybrid, Google Satelit, Esri Satelit, OpenStreetMap |
| ✏️ **Gambar bidang** | Poligon atau persegi langsung di peta, bisa diedit & dihapus |
| 📍 **Tagging GPS lapangan** | Jalan ke tiap sudut tanah, rekam titik, bidang terbentuk otomatis |
| 📐 **Ukuran lengkap** | Luas (m²/ha/are), keliling, panjang tiap sisi, titik tengah |
| 🎨 **8 warna bidang** | Bedakan tiap bidang dengan mudah |
| 🔎 **Pencarian** | Cari dari nama, pemilik, nomor sertifikat, atau NIB |
| 📊 **Ringkasan** | Jumlah bidang & total luas otomatis |
| 💾 **Simpan otomatis** | Ke file (mode backend) atau ke browser (mode statis) |
| 🔁 **Import/Export GeoJSON** | Kompatibel QGIS & ArcGIS |
| 📱 **PWA** | Bisa dipasang seperti aplikasi & dipakai offline |

---

## 🚀 Cara pakai

**Menambah bidang dari peta:** klik ikon gambar (▢ / ⬡) di kiri atas peta,
klik tiap sudut, lalu tutup di titik awal. Form data muncul otomatis.

**Menandai langsung di lapangan:** tekan **Mulai Tagging Lapangan**, berjalan
ke tiap sudut tanah sambil menekan **Rekam Titik**, lalu **Selesai**. Bidang
terbentuk dari posisi GPS Anda.

**Melihat ukuran:** klik bidang di peta atau di daftar. Luas, keliling, panjang
sisi, dan koordinat tampil di panel kiri.

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

## 🗂️ Struktur

```
web-gis-pertanahan/
├── index.html              # halaman utama
├── server.js               # backend Node (REST API + penyajian file)
├── sw.js                   # service worker (offline / PWA)
├── manifest.webmanifest    # metadata PWA
├── netlify.toml            # konfigurasi deploy
├── icons/icon.svg          # ikon aplikasi
├── css/style.css
└── js/
    ├── geo.js              # hitung luas, keliling, sisi, titik tengah
    ├── storage.js          # simpan ke backend atau browser
    ├── gps.js              # lokasi & tagging GPS lapangan
    ├── ui.js               # service worker, install PWA, panduan
    ├── data.js             # data contoh (dummy)
    └── app.js              # logika peta & tampilan
```

## 🔌 API backend

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| GET | `/api/health` | Cek server |
| GET | `/api/parcels` | Ambil semua bidang |
| PUT | `/api/parcels` | Simpan seluruh daftar |
| POST | `/api/parcels` | Tambah satu bidang |
| DELETE | `/api/parcels/:id` | Hapus satu bidang |

---

## 🛠️ Dibangun dengan

[Leaflet](https://leafletjs.com) · [Leaflet.draw](https://github.com/Leaflet/Leaflet.draw) · Vanilla JavaScript · Node.js (tanpa dependency)

## ⚠️ Catatan

Luas dan keliling dihitung dari koordinat sehingga bersifat perkiraan. Untuk
keperluan resmi atau sertifikat, gunakan hasil pengukuran BPN.

## 📄 Lisensi

[MIT](LICENSE) — bebas dipakai, diubah, dan disebarkan.

