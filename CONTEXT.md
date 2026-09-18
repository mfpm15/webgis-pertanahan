# CONTEXT.md — WebGIS Pertanahan

Peta domain & arsitektur hasil analisis mendalam atas repository
`https://github.com/mfpm15/webgis-pertanahan.git` (commit terakhir: `feb6552`).
Dokumen ini menjadi glosarium domain + peta modul, dipakai agar sesi berikutnya
tidak perlu membaca ulang seluruh kode.

---

## 1. Ringkasan Produk

Aplikasi web untuk **mencatat, mengukur, dan memetakan bidang tanah** langsung
dari browser (desktop & HP). Ditujukan untuk perangkat desa, surveyor, agen
properti, dan pemilik tanah. Dua mode operasi:

- **Backend mode** — dijalankan via `node server.js`; data tersimpan sebagai file
  `data/parcels.json` di disk.
- **Local mode** — dibuka statis (mis. `python -m http.server` atau hosting
  statis/Netlify); data tersimpan di `localStorage` tiap perangkat.

Nilai jual: **ringan** (tanpa framework/bundler), **privat** (data di perangkat
sendiri), **offline-capable** (PWA), **gratis** (peta dasar tanpa API key).

---

## 2. Glosarium Domain

| Istilah | Arti dalam proyek ini |
|---|---|
| **Bidang** (parcel) | Satu poligon tanah + atribut yuridis. Unit data utama. |
| **Parcel object** | `{ id, name, attributes{}, style{}, latlngs[] }` (runtime) / `points[]` (persisted). |
| **Atribut** | 11 field yuridis: `pemilik, noSertifikat, nib, jenisHak, status, penggunaan, desa, kecamatan, kabupaten, provinsi, keterangan`. |
| **NIB** | Nomor Identifikasi Bidang (identitas bidang tanah). |
| **Jenis Hak** | SHM / HGB / HGU / Hak Pakai / Girik-Adat. |
| **Tagging Lapangan** | Mode merekam titik sudut tanah dari posisi GPS saat berjalan di lokasi. |
| **Luas** | Area poligon bola (m², ha, are). Estimasi, bukan hasil ukur BPN. |
| **Keliling** | Total panjang batas poligon (m). |
| **Panjang Sisi** | Jarak antar titik sudut berurutan (m). |
| **Titik Pusat** | Centroid poligon berbobot luas. |
| **Mode penyimpanan** | `backend` (file JSON) atau `local` (localStorage) — dideteksi otomatis. |
| **Seed data** | Data contoh dummy (`DEMO-001`, `DEMO-002`), hanya dimuat lewat tombol. |

---

## 3. Peta Modul (arsitektur)

Vanilla JS, **IIFE + global namespace**, tanpa modul ES/bundler. Urutan muat
script (`defer`) menentukan dependency.

```
index.html ── memuat (defer, urut):
  1. leaflet.js, leaflet.draw.js   (CDN, global: L)
  2. js/geo.js       → window.Geo       (murni, tanpa dependensi)
  3. js/storage.js   → window.Storage   (deteksi backend + localStorage)
  4. js/data.js      → window.LAND_PARCELS (dummy seed)
  5. js/app.js       → window.GIS       (INTI: peta, CRUD, render, persist)
  6. js/gps.js       → konsumen window.GIS
  7. js/ui.js        → SW, install PWA, modal bantuan
```

### Modul & kedalaman (depth)

| Modul | Interface | Peran | Catatan arsitektur |
|---|---|---|---|
| `js/geo.js` | `window.Geo.{area,distance,perimeter,centroid,sortClockwise,formatArea,sideLengths}` | Perhitungan geospasial murni | **Deep module** — interface kecil, implementasi matematis padat. Mudah diuji. |
| `js/storage.js` | `window.Storage.{init,load,saveAll,remove,clearLocal,mode}` | Abstraksi persistensi | **Deep module / seam nyata** — 2 adapter (`backend`, `local`) di balik satu interface. Contoh `seam` yang benar. |
| `js/app.js` | `window.GIS.{map,toast,addParcelFromLatlngs}` + merender DOM | Orkestrator: peta, CRUD bidang, render, persist | **God module** — mencampur state, rendering, I/O, dan event wiring. Lihat §5. |
| `js/gps.js` | — (konsumen `window.GIS`) | Lokasi Saya + mode tagging | Bergantung pada `window.GIS` via polling `setTimeout(wire,300)`. Coupling longgar tapi rapuh. |
| `js/ui.js` | — | Service worker, install PWA, modal bantuan | Independen. |
| `js/data.js` | `window.LAND_PARCELS` | Seed dummy | Data murni. |
| `server.js` | REST `/api/*` + static | Backend Node stdlib, 0 dependency | Lihat §4. |
| `sw.js` | — | Cache app-shell (cache-first) + tile (network-first) | Lihat §6. |

### Alur data

```
[Peta/Leaflet.draw] ──created──► app.js: parcels[] ──persist()──► window.Storage.saveAll()
                                       │                                   │
                                       │                          ┌────────┴────────┐
                                       │                     backend PUT        localStorage
                                       ▼
                                  renderAll() → drawnItems, list, info, summary
```

- **Sumber kebenaran runtime**: array `parcels` di dalam closure `app.js`.
- **Bentuk persisted**: `{id,name,attributes,style,points}` (dikonversi dari
  `latlngs` → `points` saat simpan, dan sebaliknya saat muat).
- **Duplikasi bentuk**: `latlngs` (runtime) vs `points` (persisted) — titik
  konversi tunggal di `persist()` dan `init()`. Ini **seam konversi** yang
  sebaiknya dinamai eksplisit (lihat rekomendasi §7).

---

## 4. Kontrak API Backend (`server.js`)

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/health` | `{ok:true, store:<path>}` — dipakai `Storage.detectBackend()` |
| GET | `/api/parcels` | `{parcels:[...]}` |
| PUT | `/api/parcels` | Simpan seluruh daftar (`{parcels:[...]}`) |
| POST | `/api/parcels` | Tambah 1 bidang |
| DELETE | `/api/parcels/:id` | Hapus 1 bidang |

Karakteristik: Node stdlib murni (0 dependency), **write atomik** (tmp + rename,
anti korup), batas body 10 MB, guard path-traversal pada static, CORS `*`.
MIME map manual. Tidak ada auth — dirancang untuk lokal/LAN.

---

## 5. Temuan & Bug

### 5.1 BUG DIPERBAIKI — duplikasi parser artifact di `index.html` ✅
Repo asli mengandung **artefak merge/diff yang ter-commit**:
- Baris 184 berisi literal `------- REPLACE` (bukan komentar HTML valid).
- Blok **MODAL BANTUAN** + `<div id="toast">` **terduplikasi** (baris 154–183
  dan 185–214), sehingga ada **dua elemen `#help-backdrop` dan `#toast`** dengan
  `id` duplikat (melanggar keunikan id HTML).

Dampak: `document.getElementById("help-backdrop"/"toast")` mengembalikan elemen
**pertama**, sehingga `ui.js`/`app.js` memanipulasi elemen pertama sementara
elemen kedua (duplikat) tertinggal permanen di DOM. Modal bantuan yang dibuka
otomatis pada kunjungan pertama berisiko tampil ganda / tidak bisa ditutup penuh.

**Perbaikan**: blok duplikat + baris `------- REPLACE` dihapus. Verifikasi:
kini hanya ada 1 `#help-backdrop` (baris 155) dan 1 `#toast` (baris 183).
Diff: `3 insertions(+), 34 deletions(-)`.

### 5.2 Isu lain (belum diperbaiki — perlu keputusan)
1. **`init()` selalu `persist()`** — memanggil `saveAll` bahkan saat data kosong,
   menulis file/`localStorage` kosong di setiap muat.
2. **Tidak ada validasi poligon self-intersect** selain `allowIntersection:false`
   di Leaflet.draw (impor GeoJSON tidak divalidasi).
3. **`seq` dari id** — parsing id via regex angka; id non-numerik (mis. impor)
   diabaikan; berpotensi id tabrakan setelah impor campuran.
4. **XSS pada `renderInfo`/`renderList`** — nilai atribut pengguna disisipkan
   lewat `innerHTML` tanpa escaping.
5. **`gps.js` polling `setTimeout(wire,300)`** — pola rapuh; lebih baik event
   `window.GIS:ready`.
6. **Versi tidak konsisten**: `package.json` `2.0.0` vs `sw.js` cache `v3.1.0`
   vs narasi README "v3".
7. **`buildLayer` menyimpan field non-publik** `layer._parcelId` (mengandalkan
   internal Leaflet).

---

## 6. PWA / Service Worker (`sw.js`)

- Versi cache: `v3.1.0` (shell + tiles, dua cache terpisah).
- **App shell**: cache-first (aset lokal + CDN lib).
- **Tile peta**: network-first, simpan salinan → area yang pernah dibuka tetap
  tampil saat offline.
- **API `/api/`**: tidak pernah di-cache (selalu fresh).
- `activate` menghapus cache versi lama + `clients.claim()`.
- `netlify.toml`: `sw.js` `no-cache`; `/css/*` & `/js/*` immutable 1 tahun.

---

## 7. Rekomendasi (deepening opportunities)

Diurutkan berdampak:

1. **Pecah `app.js` (god module) menjadi seam bernama** —
   - `parcel-store` (state `parcels` + CRUD + id/seq) dengan interface kecil;
   - `parcel-view` (render list/info/summary);
   - `geo-io` (import/export GeoJSON + konversi `latlngs`↔`points`).
   *Manfaat*: interface jadi permukaan tes; bug id/seq & konversi bentuk bisa
   diuji tanpa DOM/Leaflet. Uji penghapusan: menghapus pemisahan ini akan
   menyebarkan kompleksitas ke banyak pemanggil → **deepening yang sah**.

2. **Jadikan konversi `latlngs`↔`points` seam eksplisit** (mis. `parcel.toPersisted()`
   / `parcel.fromPersisted()`). Saat ini tersebar di `persist()`, `init()`,
   ekspor, dan impor — 4 tempat, mudah drift.

3. **Sanitasi output** sebelum `innerHTML` (utamakan `textContent` untuk nilai
   pengguna). Menutup XSS (#5.2.4).

4. **Standarkan versi** lewat satu sumber (mis. `version` di `package.json`
   disuntik ke `sw.js` saat build) — hindari drift cache.

5. **Ganti polling di `gps.js`** dengan event `window.GIS` siap.

---

## 8. Cara Menjalankan

```bash
# Backend mode — data jadi file data/parcels.json
node server.js            # http://localhost:3000

# Local mode — tanpa Node
python -m http.server 8000

# Deploy: Netlify (static, netlify.toml sudah siap; GPS & PWA butuh HTTPS)
```

---

## 9. Fakta Kunci untuk Sesi Berikutnya

- Commit terakhir dianalisis: `feb6552` (feat: PWA + panduan pengguna).
- 15 file, ± 1.100 baris, ~38 KiB pack. 0 dependency npm.
- CDN eksternal: Leaflet 1.9.4 + Leaflet.draw 1.0.4 (unpkg) — **titik gagal
  tunggal saat offline pertama kali** (belum di-cache sampai kunjungan pertama).
- Peta awal: `[-6.2007, 106.8172]` (Jakarta), zoom 17, layer default Google Hybrid.
- 4 basemap: Google Hybrid/Satelit, Esri World Imagery, OSM.
- Palet 8 warna bidang (`PALETTE` di `app.js`).
- File `data/parcels.json` sengaja di-`.gitignore`.
