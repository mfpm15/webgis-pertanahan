# Riset: Fitur "Jejak Digital Anti-Palsu" untuk WebGIS Pertanahan

**Tujuan pengguna**: mendokumentasikan tanah milik keluarga agar punya **bukti
digital yang tidak bisa dipalsukan** — sebagai pelengkap (bukan pengganti)
karena jalur resmi ATR/BPN dianggap sulit.

**Status**: hasil riset internet + validasi teknis (PoC dijalankan lokal).
Semua endpoint & paket di dokumen ini **sudah diverifikasi dapat diakses**
per 17 Sep 2026.

---

## 1. Kerangka berpikir: apa artinya "tidak bisa dipalsukan"?

Kata "tidak bisa dipalsukan" sebenarnya 3 hal berbeda. Penting dipisahkan agar
kita tidak menjanjikan hal yang salah:

| Properti | Arti | Bisa dicapai? |
|---|---|---|
| **Keaslian** (authenticity) | data benar-benar dari pemilik/pembuatnya | ✅ tanda tangan digital (kunci privat di HP pengguna) |
| **Keutuhan** (integrity) | data tidak diubah sedikit pun setelah dibuat | ✅ hash SHA-256 (tamper-evident) |
| **Kebaruan/waktu** (existence at time T) | data sudah ada sejak tanggal tertentu | ✅ timestamp ke arsip publik (OpenTimestamps/Bitcoin) |
| **Kebenaran yuridis** (legal title) | negara mengakui kepemilikannya | ❌ hanya ATR/BPN yang berwenang |

**Kesimpulan penting**: aplikasi ini bisa membuktikan bahwa *"pada tanggal X,
pemilik Y mencatat bidang Z dengan bentuk & data ini, dan isinya tidak berubah
sejak itu."* Itu **bukti pendukung yang sangat kuat** (kadang disebut *evidence
of prior possession / jejak kepemilikan*), tetapi **bukan sertifikat**. Dokumen
ini merekomendasikan agar aplikasi jujur soal batas ini (lihat §6).

---

## 2. Hasil riset: 7 lapis bukti digital (dari termudah → terkuat)

### Lapis 1 — Sidik jari data (SHA-256 hash) ⭐ fondasi
Setiap bidang dihitung hash SHA-256 dari data kanonik. Bila 1 titik koordinat
diubah 5 meter, hash berubah total.

**Bukti PoC lokal** (`_research/poc-hash.js`, sudah dijalankan):
```
SIDIK JARI ASLI   : 95d480a7cd63f7531d2de1031bb6331ba215bc693860789683dfe33b212504ab
SETELAH DIPALSUKAN: 3db8f25bb19fb5e463f515f46820753d4da85326653c43c53907ce74b4980271
Sama? false | Bit beda: 63/64 karakter
Determinisme (urutan atribut dibalik): OK stabil
```
→ **Tamper-evident terbukti.** Catatan teknis: kunci harus diurutkan & koordinat
dibulatkan (7 desimal) agar hash deterministik lintas perangkat.

- Teknologi: **WebCrypto API** (`crypto.subtle.digest('SHA-256', ...)`) — built-in
  browser, **tanpa library**, jalan offline.
- Biaya: **Rp0**. Kompleksitas: rendah.

### Lapis 2 — Foto ber-geotag + hash (bukti fisik lapangan)
Foto tanah yang diambil di lokasi, dengan:
- **EXIF GPS** (lat/lon), waktu pengambilan, arah kamera;
- **hash foto** (SHA-256) yang diikat ke bidang tanah;
- opsi **watermark** berisi ID bidang + hash singkat (mis. 8 karakter pertama)
  sehingga foto yang di-screenshot/diedit mudah dideteksi.

- Teknologi: `exifr` (v7.1.3, MIT) untuk baca EXIF; kompresi via `browser-image-compression`.
- Biaya: Rp0. Ini yang memberi "rasa" bukti fisik paling meyakinkan bagi orang awam.

### Lapis 3 — Arsip publik ber-timestamp (OpenTimestamps) ⭐⭐ inti anti-palsu
Ini jawaban paling tepat untuk "tidak bisa dipalsukan". **OpenTimestamps**
membuat *proof* bahwa hashing data kita sudah ada pada suatu waktu, dengan
menjadikannya bagian dari **blockchain Bitcoin**.

Fakta hasil verifikasi:
- Endpoint kalender **semua 200 OK** (dicek): `a.pool.opentimestamps.org`,
  `b.pool.opentimestamps.org`, `alice.btc.calendar.opentimestamps.org`,
  `finney.calendar.eternitywall.com`.
- **Gratis, tanpa registrasi, tanpa API key** (dinyatakan resmi di situsnya).
- Ada library **JavaScript resmi**: `javascript-opentimestamps` (npm 200 OK)
  → **jalan langsung di browser**, produksi file `.ots` sebagai bukti.
- Sudah dipakai **Internet Archive** untuk mengarsipkan proof.
- Verifikasi bisa independen oleh pihak ketiga (cukup file + proof + Bitcoin
  block explorer) — **tidak bergantung server kita**.

Alur: `hash bidang` → `stamp` ke server kalender → tunggu ~beberapa jam
(upgrade ke Bitcoin) → simpan file `.ots` di samping data bidang.

- Biaya: **Rp0** (ditanggung jaringan Bitcoin). Kompleksitas: sedang.
- Catatan jujur: proof ter-upgrade ke Bitcoin butuh waktu (menit–jam); status
  awal "pending". Aplikasi perlu menampilkan status ini apa adanya.

### Lapis 4 — Tanda tangan digital pemilik (e-Sign)
Agar bukti juga membuktikan **siapa** yang mencatat, bukan hanya **apa**:

- **Mudah/offline**: `signature_pad` (v5.1.4, MIT) — tanda tangan gambar di HP,
  disimpan sebagai bagian data bidang lalu ikut di-hash.
- **Kuat/hukum**: **tanda tangan elektronik tersertifikasi** via **PSrE**
  (Penyelenggara Sertifikat Elektronik) yang diakui Kominfo — mis. layanan
  e-Sign (Peruri, PrivyID, VIDA, dll). Dasar hukum: **UU ITE No. 11/2008**
  (diubah UU 19/2016 & 1/2024) — tanda tangan elektronik sah bila memenuhi
  syarat (khususnya tanda tangan elektronik tersertifikasi).
- **Jalan tengah (rekomendasi)**: gunakan **WebCrypto ECDSA/P-256** — buat
  keypair di perangkat pengguna, tanda tangani hash bidang, simpan public key.
  Gratis, offline, tanpa pihak ketiga; kekuatannya "self-attested" (bukan
  identity-assured, karena belum ada verifikasi identitas KTP).

> Rekomendasi bertahap: mulai dari `signature_pad` (Lapis 4a) → naik ke WebCrypto
> (4b) → integrasi PSrE (4c) bila ingin kekuatan hukum penuh.

### Lapis 5 — Audit trail (riwayat tak terhapus)
Setiap perubahan (ganti pemilik, jual, edit bentuk) dicatat sebagai **event
berantai** (*append-only*): setiap entri menyimpan hash entri sebelumnya
(konsep Merkle chain). Mengubah entri lama akan memutus rantai dan terdeteksi.

- Manfaat konkret: melacak **riwayat kepemilikan** & sengketa keluarga.
- Teknologi: implementasi sendiri (sederhana) — `sha256(prevHash + event)`.
- Biaya: Rp0.

### Lapis 6 — Verifikasi publik lewat QR
Cetak/tempel **QR code** di papan batas atau dokumen keluarga; siapa pun bisa
scan → dibuka halaman verifikasi → ditampilkan status hash & timestamp.

- Teknologi: `qrcode` (v1.5.4, MIT).
- Perlu catatan: agar publik bisa verifikasi online, butuh **halaman verifikasi
  statis** (bisa di Netlify) — data tetap di perangkat pemilik, yang dipublikasi
  hanya *hash* (tidak membocorkan isi/koordinat).
- Ini fitur "wow" yang membuat bukti terasa nyata & mudah dijelaskan ke keluarga.

### Lapis 7 — Ekspor berkas bukti (kartu/berita acara digital)
Satu tombol → menghasilkan **PDF "Kartu Bukti Bidang"** berisi: peta mini,
foto, atribut, QR verifikasi, hash, timestamp OTS, dan tanda tangan.

- Teknologi: `jspdf` (v4.2.1, MIT) atau `pdf-lib` (v1.17.1, MIT).
- Berguna untuk dicetak & disimpan fisik (hard copy) sebagai lapisan kedua.

---

## 3. Fitur GIS/lapangan yang layak ditambahkan (dari riset pembanding)

Membandingkan dengan QGIS, Cadasta (platform hak atas tanah), GISTARU, dan
aplikasi survei: fitur ini menaikkan kualitas data secara signifikan.

| Fitur | Kenapa penting | Teknologi |
|---|---|---|
| **Ukur jarak/area di peta (measure tool)** | verifikasi cepat tanpa menggambar bidang | Leaflet + `@turf/turf` (v7.4.0, MIT) |
| **Snapping & batas presisi** | poligon antar-bidang tak tumpang tindih / tak ada celah | `leaflet-geosearch`, geometry helper |
| **Impor Shapefile / KML / GPX** | tukar data dengan QGIS/ArcGIS & alat survei | `shpjs` (v6.2.0), `@mapbox/togeojson` (v0.16.2) |
| **Dukungan koordinat lokal (UTM / TM-3 Indonesia)** | hasil ukur BPN/survei umumnya dalam UTM, bukan lat/lon | `proj4` (v2.22.0, MIT) |
| **Kompas + kemiringan (compass)** | arah sisi & orientasi bidang | DeviceOrientation API |
| **Waypoint & jalur survei (track)** | bukti sudah menyusuri batas tanah | GPS watchPosition |
| **Geocoding alamat** | isi desa/kecamatan cepat | `leaflet-geosearch` |
| **Foto peta offline (cache tile)** | sudah ada di `sw.js`, bisa ditambah tombol "unduh area" | Leaflet offline tile cache |
| **Clustering & layer per-status** | banyak bidang tetap rapi | `leaflet.markercluster` (v1.5.3) |
| **Unduh peta & data satu klik (ZIP)** | arsip keluarga lengkap | `jszip` (v3.10.2), `file-saver` |

---

## 4. Arsitektur usulan (menghormati kondisi kode saat ini)

Kode saat ini: vanilla JS, tanpa build, PWA, 2 mode (backend/localStorage).
Usulan **tidak merusak** prinsip itu — semua bisa tetap offline-first.

```
Modul baru (IIFE + window.*, konsisten dgn gaya yang ada):

js/crypto.js      → window.DigitalProof
    ├─ canonicalize(parcel)        // kunci terurut, koordinat dibulatkan
    ├─ sha256Hex(str)              // WebCrypto (fallback: crypto-js)
    ├─ fingerprint(parcel)         // {canonical, hash}
    ├─ sign(hash) / verify(hash)   // WebCrypto ECDSA P-256
    └─ auditAppend(event)          // Merkle chain lokal

js/timestamp.js   → window.TimestampProof
    ├─ stamp(hash) -> .ots         // javascript-opentimestamps (browser)
    ├─ upgrade(.ots)               // ambil attestation Bitcoin
    └─ verify(file, .ots)          // verifikasi independen

js/evidence.js    → window.Evidence
    ├─ foto + EXIF + watermark     // exifr
    ├─ exportProofCardPDF()        // jspdf
    └─ qrForParcel(id)             // qrcode
```

**Integrasi minimal (paling aman dilakukan lebih dulu):**
1. Tambah `hash` + `recordedAt` ke setiap bidang saat `persist()`.
2. Tampilkan "Sidik jari: `95d480a7…`" di panel Informasi Bidang + tombol
   **"Kunci Bukti"** yang memanggil `TimestampProof.stamp()`.
3. Tambah field `proof: { hash, ots, recordedAt, sigPubKey }` pada objek bidang
   (tidak perlu mengubah bentuk `points`/`attributes` yang sudah ada).
4. Simpan blok `proof` apa adanya di GeoJSON export (`properties.proof`).

Semua modul bersifat **aditif** dan **fail-safe**: bila offline atau browser
tidak mendukung WebCrypto, aplikasi tetap jalan seperti sekarang.

---

## 5. Roadmap bertahap (disarankan)

| Fase | Isi | Nilai | Effort |
|---|---|---|---|
| **F1 — Sidik jari** | `crypto.js`: hash + tampil + ikut export | tamper-evident dasar | kecil |
| **F2 — Timestamp publik** | `timestamp.js`: stamp `.ots` + status verifikasi | **anti-palsu** (klaim utama) | sedang |
| **F3 — Foto bukti** | EXIF + hash + watermark + galeri per bidang | bukti fisik | sedang |
| **F4 — Audit trail** | riwayat kepemilikan berantai | sengketa/riwayat | kecil–sedang |
| **F5 — QR + Kartu PDF** | verifikasi publik + cetak | mudah dibagikan | sedang |
| **F6 — Tanda tangan** | `signature_pad` → WebCrypto → PSrE | keaslian & (opsional) legal | sedang–besar |
| **F7 — GIS lanjutan** | measure, snapping, shapefile, UTM, offline-area | kualitas survey | besar |

Rekomendasi urutan: **F1 → F2 → F3 → F5** (memberi 80% manfaat "anti-palsu"
paling cepat), baru F4/F6/F7.

---

## 6. Batas & kejujuran (WAJIB ditampilkan di aplikasi)

Agar aplikasi tidak menyesatkan, tampilkan disclaimer di Kartu Bukti:

- Bukti digital ini membuktikan **data tidak berubah sejak dicatat**, **bukan**
  pengakuan kepemilikan oleh negara.
- Acuan hukum tetap **sertifikat & pengukuran BPN** (estimasi luas dari
  koordinat ≠ hasil ukur resmi).
- Timestamp Bitcoin membuktikan **waktu**, bukan **kebenaran isi**.
- Hash/timestamp **tidak menggantikan** proses pendaftaran tanah.

---

## 7. Ringkasan bukti verifikasi (dari sesi riset ini)

| Item | Hasil |
|---|---|
| `opentimestamps.org` | 200 OK |
| 4 calendar server OTS (a/b/alice/finney pool) | 200 OK semua |
| `javascript-opentimestamps` (npm + GitHub) | 200 OK |
| PoC hash-tamper lokal | ✅ 63/64 bit berubah saat dipalsukan |
| PoC determinisme | ✅ hash stabil walau urutan atribut dibalik |
| Library npm dicek (20 paket) | semua MIT/Apache — bebas dipakai |
| Dasar hukum e-Sign | UU ITE 11/2008 (+19/2016, +1/2024), PSrE Kominfo/Peruri |
| Referensi global | Georgia & Rusia pilot blockchain land registry (Forbes/ZDNet) |

**Kesimpulan**: target "jejak digital keluarga yang tidak bisa dipalsukan"
**sangat bisa dicapai** dengan biaya Rp0 untuk lapis intinya (F1–F2), memakai
WebCrypto (sudah built-in) + OpenTimestamps (gratis, arsip Bitcoin). Tidak
perlu blockchain sendiri, tidak perlu server mahal, dan tetap offline-first.
