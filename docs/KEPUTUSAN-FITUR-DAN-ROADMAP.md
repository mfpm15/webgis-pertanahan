# Keputusan Fitur & Roadmap — WebGIS Pertanahan Keluarga

Dokumen ini menggabungkan **saran Anda** + **hasil riset terverifikasi** (lihat
`docs/RISET-FITUR-BUKTI-DIGITAL.md`). Tujuannya: menentukan apa yang diterapkan,
dan memastikan **tidak ada yang terlewat**.

---

## 0. Hasil verifikasi (jujur: apa yang terbukti vs tidak)

Saya memverifikasi setiap klaim yang bisa diverifikasi dari sini. Ini penting
supaya keputusan tidak dibangun di atas asumsi.

| Klaim | Status | Bukti |
|---|---|---|
| **PP No. 18/2021** tentang Hak Pengelolaan, Hak Atas Tanah, Satuan Rumah Susun, dan Pendaftaran Tanah **ada** & **berlaku** | ✅ **TERKONFIRMASI** | `peraturan.go.id/id/pp-no-18-tahun-2021` (200): "Ditetapkan 02 Februari 2021", "Status Berlaku", mencabut PP 40/1996 |
| **Pasal 96** spesifik soal girik/letter C/petok D kehilangan status bukti | ⚠️ **BELUM terverifikasi** | situs JDIH/BPK pakai JS & anti-bot; PDF yang saya unduh ternyata dokumen lain (ID salah). **Perlu dicek manual** — jangan dijadikan dasar tanpa konfirmasi |
| Tanggal "**2 Februari 2026**" | ❌ **KOREKSI** | PP ditetapkan **2 Februari 2021**. Yang jatuh ~2026 adalah **tenggat 5 tahun** penyelesaian/penghapusan bertahap — dua hal ini tertukar |
| **UU ITE Pasal 5** — dokumen elektronik = alat bukti sah | ✅ Terkonfirmasi (Wikipedia + umum) | tetap perlu konfirmasi teks pasal untuk kutipan formal |
| **OpenTimestamps** gratis, tanpa API key, arsip Bitcoin | ✅ **TERVERIFIKASI** | situs resmi + 4 calendar server 200 OK + library JS resmi di npm |
| **PoC hash tamper-evident** | ✅ **TERVERIFIKASI empiris** | 1 titik digeser 5 m → 63/64 karakter hash berubah |
| Platform **Felt, QField, Mergin Maps, WebODM, PostGIS, GeoServer** aktif | ✅ semua 200 OK | dicek langsung |
| **InaCORS / NTRIP** `cors.big.go.id:2101` | ⚠️ **tidak bisa diverifikasi** | `inacors.big.go.id` & `nrtk.big.go.id` → 000 dari sini. Perlu Anda cek langsung |

> **Penting**: klaim hukum tidak boleh dijadikan dasar tanpa verifikasi. Untuk
> Pasal 96 & tata cara PTSL, **konfirmasi ke kantor pertanahan setempat** adalah
> langkah paling aman dan praktis.

---

## 1. Keputusan: kita bangun apa?

### 1.1 Prinsip (disepakati)
- **Melengkapi, bukan menggantikan** sertifikat BPN. Nilai ada di 3 hal:
  (1) menjaga jejak penguasaan fisik & riwayat antar-generasi,
  (2) melindungi dari klaim palsu/mafia tanah selama proses sertifikasi,
  (3) menyiapkan berkas rapi & terverifikasi saat mau diajukan resmi.

### 1.2 Strategi bertahap (3 tingkatan, sesuai saran Anda)
Ini keputusan paling penting yang harus dipilih. Rekomendasi saya: **mulai dari
(2) untuk data lapangan, hasil akhir disimpan di (3)**, karena (1) terbatas.

| Opsi | Untuk apa | Keputusan |
|---|---|---|
| **(1) Felt.com** | sharing cepat ke keluarga | ⚪ *opsional, pelengkap* — bagus untuk presentasi keluarga, tapi data "dititipkan" ke pihak ketiga |
| **(2) QGIS + QField/Mergin Maps** | **pengumpulan data lapangan presisi** | ✅ **REKOMENDASI UTAMA** — form offline, GPS averaging, foto geotag otomatis, standar surveyor |
| **(3) PostGIS + GeoServer + Leaflet/OpenLayers** | kontrol penuh, audit log, skema sendiri | ✅ **TUJUAN AKHIR** — tempat menyimpan & memverifikasi hasil dari (2) |
| **(3b) WebODM** | orthophoto drone | ⚪ nanti, bila lahan luas/berisiko tinggi |

**Keputusan**: bangun **aplikasi web Anda sekarang** (yang sudah ada di repo ini)
sebagai **front-end + lapisan bukti digital**, dan tambahkan jalur impor dari
QField/QGIS (GeoJSON/Shapefile/KML). Tidak perlu PostGIS dulu — backend Node
yang ada sudah cukup sampai skala keluarga; PostGIS menyusul bila data besar.

> **Catatan penting**: aplikasi web yang ada **tidak cukup** untuk pengumpulan
> presisi di lapangan (GPS HP ~3–10 m). Karena itu **QField/Mergin = alat
> lapangan**, **web = arsip + bukti + laporan**. Keduanya saling melengkapi.
> Ini menghindari kesalahan membangun semuanya di web dan mendapat akurasi buruk.

---

## 2. FITUR — matriks kelengkapan (agar tidak ada yang terlewat)

Saya petakan **semua** yang Anda sebutkan + yang saya riset, ke status
keputusan. Kolom terakhir menunjukkan **ada di aplikasi web** atau **di QField**.

### A. Data spasial inti
| Fitur | Keputusan | Di mana |
|---|---|---|
| Polygon batas dari GPS lapangan (bukan drop pin) | ✅ | QField (utama) + web (edit) |
| Luas & keliling otomatis | ✅ **sudah ada** | web (`geo.js`) |
| **Sistem koordinat resmi TM-3 / standar BIG** | ✅ | web (`proj4`) — implementasi baru |
| Basemap satelit terkini | ✅ **sudah ada** (4 basemap) | web |
| **Citra historis (time-lapse)** | ✅ | web — Google Earth timelapse / Sentinel-2 |
| GPS averaging + lingkaran akurasi | ✅ **sebagian ada** (tampil akurasi) | QField penuh + web diperkuat |
| Konversi/ekspor **UTM & TM-3** | ✅ | web (`proj4`) |
| Impor **Shapefile / KML / GPX** | ✅ | web (`shpjs`, `@mapbox/togeojson`) |
| Snapping & cegah overlap antar-bidang | ✅ | web + QGIS |
| Measure tool (ukur jarak/area) | ✅ | web (`@turf/turf`) |

### B. Lampiran dokumen & bukti per bidang
| Fitur | Keputusan | Di mana |
|---|---|---|
| Scan girik / letter C / petok D | ✅ | web (upload + galeri) |
| **Riwayat SPPT PBB tahunan** (bukti penguasaan berkelanjutan) | ✅ | web (kategori dokumen khusus + pengingat) |
| Akta jual beli / hibah / surat keterangan waris | ✅ | web |
| **Surat pernyataan riwayat kepemilikan & penguasaan fisik** (format BPN: 2 saksi + pengesahan desa) | ✅ **prioritas** | web (form generator + PDF) |
| KTP/KK pemilik & ahli waris | ✅ | web |
| Foto & video bertanggal-geotag patok & kondisi lahan | ✅ | QField (otomatis) + web |
| **Rekaman "jalan keliling batas"** (video + track GPS) | ✅ | QField (track) + web |

### C. Jejak digital anti-palsu (inti permintaan)
| Fitur | Keputusan | Catatan |
|---|---|---|
| **Hashing SHA-256 setiap file** || ✅ | WebCrypto, hash disimpan terpisah dari file |
| **Timestamp OpenTimestamps → Bitcoin** | ✅ **prioritas** | gratis, tanpa API key, verifikasi independen |
| **Audit log append-only** | ✅ | Merkle chain; versi lama tak hilang (opsi Git versioning) |
| **Opsional tanda tangan tersertifikasi (PSrE Peruri/BSrE/Privy) + e-Meterai** | ✅ **opsional** | untuk surat pernyataan keluarga, strength hukum setara ttd basah |
| **Backup terdistribusi (2–3 lokasi)** | ✅ **wajib** | cloud A + cloud B + HDD fisik; ekspor ZIP terenkripsi |
| QR verifikasi publik | ✅ | `qrcode`; hanya hash yang dipublikasi |
| Kartu/laporan bukti PDF | ✅ | `jspdf` |

### D. Kolaborasi & manajemen keluarga
| Fitur | Keputusan | Catatan |
|---|---|---|
| Multi-user + role (admin/lihat/komentar) | ✅ **bertahap** | butuh backend + auth; mulai lokal dulu |
| **Silsilah keluarga digital ↔ bidang tanah** | ✅ | pewaris → ahli waris per bidang |
| Notifikasi perubahan data | ✅ | tahap lanjut |
| Komentar/anotasi per bidang | ✅ | tahap lanjut |

### E. Ekspor & kesiapan pakai
| Fitur | Keputusan |
|---|---|
| Laporan PDF per bidang (peta + atribut + lampiran + riwayat + hash/timestamp) | ✅ **prioritas** |
| **Pengingat bayar PBB** (jaga kontinuitas bukti penguasaan) | ✅ |
| Pengingat deadline administrasi lain | ✅ |

### F. Tagging & penyimpanan nyaman
| Fitur | Keputusan |
|---|---|
| Tag sekali sentuh, **offline-first**, simpan koordinat+akurasi+waktu+foto | ✅ |
| **Kategori pin berwarna** (batas/patok, titik kontrol BPN, pohon batas, "kejadian mencurigakan") | ✅ |
| Tombol **"kunjungi lagi"** (log kunjungan 1 sentuh) | ✅ |
| **Voice note** per titik/kunjungan | ✅ |

### G. Dashboard "tanah kita di mana aja"
| Fitur | Keputusan |
|---|---|
| Peta ringkasan semua bidang keluarga | ✅ |
| Status per bidang (girik/belum diproses, sedang PTSL, sudah SHM, ada indikasi masalah) | ✅ |
| Filter per ahli waris / wilayah | ✅ |
| Ringkas: luas, terakhir dikunjungi, **jatuh tempo kunjungan berikutnya** | ✅ |

### H. Log riwayat kunjungan
| Fitur | Keputusan |
|---|---|
| Timeline per bidang (tanggal, jam, siapa, kondisi, foto pembanding) | ✅ |
| **Reminder berkala** (lahan lama tak dikunjungi = rentan penyerobotan) | ✅ |

### I. Deteksi perubahan / anti-kecurangan (paling relevan)
| Lapisan | Keputusan | Catatan |
|---|---|---|
| **1. Foto ulang dari titik & sudut sama** + deteksi pergeseran patok (>2–3 m) | ✅ **prioritas** | termurah, paling langsung |
| **2. Citra satelit gratis** (Sentinel-2, ~5 hari; via GEE/Sentinel Hub) | ✅ | bandingkan waktu; konsep GLAD/Global Forest Watch |
| **3. Drone berkala → WebODM orthophoto + overlay diff** | ⚪ opsional | bila lahan luas & bernilai tinggi |
| **4. CCTV solar + 4G deteksi gerak** | ⚪ opsional | lahan berisiko tinggi; solusi umum perkebunan |
| **5. Kesepakatan & jaringan tetangga** (kontak RT/tetangga) | ✅ | sesuai saran ATR/BPN; murah & efektif |

### J. Protokol akurasi saat tag di lapangan
| Langkah | Keputusan |
|---|---|
| Presisi resmi (PTSL/SHM) → **GNSS RTK + InaCORS (NTRIP)** | ✅ *bila mau presisi cm* — **verifikasi kredensial InaCORS manual** |
| Smartphone: mode akurasi tertinggi + diam 2–5 menit + area terbuka | ✅ |
| Jauhi gedung/pohon; perhatikan lingkaran akurasi | ✅ |
| Ambil beberapa bacaan lalu rata-rata (averaging) | ✅ QField punya built-in |
| Selalu foto latar patokan visual | ✅ |
| Verifikasi silang dengan patok BPN lama | ✅ |
| **Rekam video proses pengambilan titik** (bukti diambil di lokasi) | ✅ |

---

## 3. Urutan pengerjaan (roadmap disepakati)

Fase dibagi agar tiap langkah memberi nilai nyata & bisa dipakai.

| Fase | Isi | Kenapa lebih dulu | Effort |
|---|---|---|---|
| **T0 — Amankan dataset** | Kumpulkan & scan semua dokumen (girik, SPPT PBB, KTP/KK, akta). Mulai susun surat pernyataan riwayat + 2 saksi + pengesahan desa | **jangan tunggu** — dokumen hilang tak bisa diganti | manual |
| **F1 — Sidik jari** | `crypto.js`: SHA-256 per bidang & per file + tampil + ikut export | fondasi anti-palsu | kecil |
| **F2 — Timestamp publik** | `timestamp.js`: OpenTimestamps `.ots` + status verifikasi | **inti "tidak bisa dipalsukan"** | sedang |
| **F3 — Lampiran & foto bukti** | upload dokumen + EXIF + watermark + galeri per bidang | melengkapi berkas BPN | sedang |
| **F4 — Laporan PDF + QR** | kartu bukti per bidang + QR verifikasi | siap dilampirkan ke kantor pertanahan/notaris | sedang |
| **F5 — Audit trail & backup** | Merkle chain + ekspor ZIP terenkripsi + panduan 3 lokasi | jaga dari "dihilangkan sepihak" | sedang |
| **F6 — Jalur lapangan** | QField form (kunjungan berkala, kategori pin, foto ulang titik sama) + impor ke web | akurasi & bukti fisik | sedang–besar |
| **F7 — Dashboard & reminder** | dashboard status/filter + reminder PBB & kunjungan + voice note | pemantauan rutin | sedang |
| **F8 — Deteksi perubahan** | foto-diff + Sentinel-2 + lapisan anti-kecurangan | paling canggih, terakhir | besar |
| **F9 — Kolaborasi & (opsional) PSrE** | multi-user/role + e-Sign tersertifikasi | tahap dewasa | besar |

**Prinsip urutan**: F1→F2→F4 memberi **inti anti-palsu paling cepat**. T0
berjalan paralel dari hari pertama karena berurusan dengan pihak luar (desa/BPN).

---

## 4. Yang perlu Anda putuskan / kerjakan di luar sistem

1. **Konfirmasi Pasal 96 PP 18/2021 & tata cara PTSL** ke kantor pertanahan
   setempat (saya tidak bisa verifikasi isi pasalnya dari sini — jangan pakai
   asumsi).
2. **Verifikasi kredensial InaCORS** (bila mau presisi RTK): cek
   `nrtk.big.go.id`/layanan BIG langsung; endpoint tidak bisa saya akses.
3. **Pilih mode operasi**: apakah Anda mau jalur **web dulu** (paling cepat
   mulai, sesuai repo yang sudah ada) atau **langsung QGIS/QField** (presisi
   lebih baik, kurva belajar lebih tinggi).
4. **Tentukan target presisi**: cukup smartphone (3–10 m) atau wajib RTK (cm)?

---

## 5. Yang saya usulkan TIDAK dilakukan (jujur, hindari pemborosan)

- ❌ **Bikin blockchain sendiri** — mahal, tidak perlu. OpenTimestamps sudah
  memakai Bitcoin, gratis, & diterima secara umum.
- ❌ **Self-host semua sekarang** (PostGIS+GeoServer) — overkill untuk skala
  keluarga; tunda sampai data terbukti besar.
- ❌ **Klaim "sah menurut hukum sebagai bukti kepemilikan"** di UI — menyesatkan.
  Selalu tampilkan disclaimer: membuktikan keutuhan & waktu, bukan kepemilikan.
- ❌ **Drop pin manual** sebagai metode utama — akurasi buruk, nilai bukti rendah.

---

## 6. Ringkasan keputusan (1 paragraf)

Bangun **aplikasi web yang sudah ada** menjadi **arsip keluarga + lapisan bukti
digital** (hash SHA-256 → timestamp OpenTimestamps, lampiran dokumen, audit log,
laporan PDF/QR), dan pakai **QGIS + QField/Mergin Maps** sebagai alat
pengumpulan lapangan yang presisi, dengan hasil diimpor ke web. Mulai **F1→F2→F4**
untuk inti anti-palsu, sambil menjalankan **T0** (amankan dokumen + urus surat
pernyataan 2 saksi) dari hari pertama. Jangan bangun blockchain sendiri, jangan
self-host dulu, dan selalu tampilkan disclaimer hukum.
