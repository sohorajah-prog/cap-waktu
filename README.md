# Cap Waktu

Aplikasi web untuk membubuhkan waktu, tanggal, nama lokasi, dan titik koordinat
pada foto — untuk dokumentasi pekerjaan, laporan lapangan, dan keperluan
administrasi.

Legenda digambar langsung di perangkat pengguna memakai Canvas API, lalu hasilnya
diunduh dan tercatat di riwayat.

## Fitur

- Unggah foto dari galeri atau ambil langsung dari kamera
- Koordinat otomatis dari GPS perangkat, atau diisi manual
- Wilayah administratif terisi otomatis dari koordinat, dari provinsi sampai
  kelurahan/desa
- Waktu pada legenda diambil dari jam perangkat saat itu juga, bukan dari
  tanggal berkas foto
- Format tanggal sampai menit atau sampai detik, dengan zona waktu
  (WIB/WITA/WIT) yang mengikuti perangkat
- Jenis huruf Android (Roboto) dan iOS (SF Pro), selain Sans, Mono, dan Serif
- Pengaturan legenda: posisi, ukuran, warna, alas gelap
- Pratinjau langsung yang persis sama dengan hasil unduhan
- Unduh JPG atau PNG, otomatis tersimpan ke Riwayat Hasil
- Riwayat berbentuk lembar kontak, lengkap dengan detail pengaturan tiap hasil

## Teknologi

| Lapisan | Pilihan |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4 |
| Backend | Next.js API Routes |
| Basis data | SQLite + Drizzle ORM |
| Pemrosesan gambar | Canvas API di browser |

## Menjalankan

```bash
npm install
npm run dev
```

Buka http://localhost:3000.

Basis data dan berkas gambar dibuat otomatis di `data/` saat permintaan API
pertama; migrasi dijalankan sendiri waktu server menyala. Folder itu tidak ikut
masuk ke Git.

```
data/
  cap-waktu.db      basis data SQLite
  uploads/          gambar asli
  results/          gambar hasil ber-legenda
```

Lokasinya bisa dipindah lewat `CAP_WAKTU_DATA_DIR`.

### Data wilayah

`seed/wilayah.tsv` berisi 91.019 wilayah administratif (38 provinsi, 514
kabupaten/kota, 7.265 kecamatan, 83.202 kelurahan/desa), diturunkan dari
[cahyadsn/wilayah](https://github.com/cahyadsn/wilayah) yang mengacu pada data
Kemendagri. Berkas ini dimuat otomatis ke tabel `regions` saat basis data
pertama kali dibuat (91 ribu baris, sekitar 0,4 detik, sekali saja).

Kode wilayah berjenjang memakai titik — `32` / `32.75` / `32.75.01` /
`32.75.01.1001` — sehingga induk selalu bisa diturunkan dari kodenya sendiri.

Segmen keempat juga menandai jenisnya: `1xxx` kelurahan, `2xxx` desa. Legenda
karena itu menulis **Kel.** atau **Desa**, bukan keduanya. Penanda ini dibaca
dari kode, bukan dari status kota/kabupaten induknya — Kota Denpasar, misalnya,
memuat desa. Awalan dilewati untuk nama yang sudah menyebut jenisnya sendiri:
Gampong (Aceh), Nagari (Sumbar), Pekon (Lampung), dan 14 Desa Adat di Kabupaten
Jayapura yang berkode `3xxx`. "Kampung" sengaja tidak termasuk, karena di
Sumatera, Bali, dan Maluku itu bagian dari nama — "Desa Kampung Sawah" benar.

143 kelurahan dari sumber aslinya dibuang karena baris kecamatan induknya tidak
ada, jadi tidak mungkin dijangkau lewat pilihan bertingkat. Menambalnya dengan
nama karangan bukan pilihan: legenda cap waktu dipakai sebagai bukti. Untuk
wilayah tersebut, kolom **Detail tempat** tetap bisa diisi bebas.

### Perintah lain

```bash
npm run build            # build produksi
npm run lint             # ESLint
npx tsc --noEmit         # pemeriksaan tipe
npx drizzle-kit generate # migrasi baru setelah skema berubah
```

## API

| Metode | Rute | Kegunaan |
|---|---|---|
| `GET` | `/api/results` | Daftar riwayat, terbaru dulu (`?limit=`) |
| `POST` | `/api/results` | Simpan hasil — multipart: `original`, `result`, `settings` |
| `DELETE` | `/api/results` | Kosongkan seluruh riwayat |
| `GET` | `/api/results/:id` | Detail satu hasil |
| `DELETE` | `/api/results/:id` | Hapus hasil beserta berkasnya |
| `GET` | `/api/results/:id/image` | Berkas gambar hasil |
| `GET` | `/api/uploads/:id/image` | Berkas gambar asli |
| `GET` | `/api/wilayah?parent=` | Daftar wilayah satu tingkat di bawah kode induk |
| `GET` | `/api/wilayah/lookup?lat=&lon=` | Menebak wilayah dari koordinat (reverse geocoding) |

### Susunan legenda

Mengikuti berkas referensi: jam besar, garis pemisah, tanggal dan hari
bertumpuk di sebelahnya, lalu alamat sebagai paragraf mengalir, garis tipis,
dan koordinat di baris kaki.

```
08:38 │ 20 Agustus 2026
      │ Kamis

RW.6, Kel. Pulo Gebang, Kecamatan Cakung, Kota Administrasi
Jakarta Timur, Daerah Khusus Ibukota Jakarta
────────────────────────────────────────────────────────────
6.199000° LS  106.945000° BT
```

Referensinya menaruh kode verifikasi di baris kaki; di sini diisi koordinat.
Aplikasi ini tidak punya sistem kode semacam itu, dan mencetak kode karangan
pada dokumen bukti jelas keliru. Merek pada berkas referensi juga tidak
ditiru — itu identitas aplikasi lain.

Bagian yang kosong dilewati: tanpa koordinat, garis tipis dan baris kaki ikut
hilang. Posisi **Kanan** mencerminkan seluruh susunan, termasuk urutan jam dan
garis pemisahnya.

### Jenis huruf

**Android** memakai Roboto, dimuat sebagai webfont supaya hasilnya sama entah
dipakai dari ponsel atau komputer.

**iOS** memakai tumpukan sistem Apple (`-apple-system`, SF Pro). Apple tidak
mengizinkan SF Pro disertakan dalam aplikasi web, jadi huruf itu hanya tampil
sebenarnya di perangkat Apple dan jatuh ke Helvetica di perangkat lain.
Keterangan ini juga muncul di formulir saat opsi tersebut dipilih.

Sans (Public Sans), Mono (Martian Mono), dan Serif (Georgia) tetap tersedia.

### Waktu pada legenda

Pilihan **Format tanggal** hanya menentukan tata letaknya; contoh di dropdown
memakai tanggal contoh tetap supaya jelas itu format, bukan nilai.

Waktu yang tercetak selalu berasal dari jam perangkat. Pratinjau berdetak tiap
detik, dan angka yang masuk ke berkas dikunci pada saat tombol unduh ditekan —
bukan pada saat foto dipilih. Tanggal berkas (`lastModified`) sengaja tidak
dipakai: foto yang diteruskan lewat aplikasi pesan membawa tanggal penyalinan,
bukan waktu pengambilan, sehingga tidak layak jadi bukti waktu.

### Pengisian wilayah dari koordinat

Tombol **Isi wilayah dari koordinat** mengirim lintang/bujur ke
[Nominatim](https://nominatim.openstreetmap.org) (OpenStreetMap) lewat server
ini — bukan langsung dari peramban, sehingga alamat pengguna tidak ikut
terkirim. Fotonya tidak pernah dikirim ke mana pun.

Nama yang dikembalikan Nominatim tidak selalu sama dengan ejaan Permendagri,
dan kecamatan sering kosong. Pencocokannya karena itu berjalan bertahap:

- Nama dinormalkan (huruf kecil, imbuhan "Kabupaten"/"Kota Administrasi"/dsb.
  dibuang) lalu dicocokkan menurun dari provinsi ke kelurahan.
- Bila **kecamatan kosong**, kelurahan dicari di seluruh kabupaten; satu
  kecocokan unik mengembalikan kecamatannya lewat kode induknya.
- Bila **provinsi kosong**, kabupaten dicari nasional; kecocokan unik
  mengembalikan provinsinya.
- Ambiguitas "Kota X" lawan "Kabupaten X" dipecahkan oleh medan asal Nominatim
  (`city` menandakan kota, `county` menandakan kabupaten), lalu oleh kelurahan
  bila masih ragu.

Yang tidak bisa dipastikan **dibiarkan kosong**, bukan ditebak — legenda cap
waktu dipakai sebagai bukti. Hasilnya ditampilkan sebagai teks yang tidak bisa
disunting, supaya pengguna tetap melihat persis apa yang akan tercetak.

Tidak ada pilihan wilayah manual di formulir: bila koordinatnya tidak
menghasilkan wilayah — sekitar sepertiga titik uji hanya terisi sampai provinsi
— baris wilayah pada legenda ikut kosong, dan keterangan lokasi hanya bisa
disampaikan lewat kolom **Detail tempat**. Endpoint `/api/wilayah` masih
tersedia bila pemilihan bertingkat ingin dihidupkan kembali.

Cakupannya tidak merata. Dari sembilan titik uji, enam terisi keempat
tingkatnya (Bekasi, Bandung, Jakarta, Yogyakarta, Medan, Surabaya), satu
sampai kecamatan (Makassar), dan dua hanya sampai provinsi — termasuk satu
titik di pedalaman Sulawesi yang memang tidak punya data desa di OSM.

Kebijakan pemakaian Nominatim membatasi satu permintaan per detik, jadi server
menahan antrean dan menyimpan hasil selama 24 jam pada ketelitian ~11 m. Untuk
lalu lintas nyata, gunakan instans Nominatim sendiri atau penyedia berbayar,
dan setel `CAP_WAKTU_GEOCODER_UA` ke kontak Anda.

## Penerapan ke Coolify

Aplikasi ini menyimpan basis data dan gambar di sistem berkas, jadi butuh
server dengan penyimpanan tetap. Coolify cocok; platform serverless seperti
Vercel tidak (lihat catatan di bawah).

### Langkah

1. **New Resource → Application → Public/Private Repository**, arahkan ke repo
   ini, branch `main`.
2. **Build Pack: Dockerfile.** Coolify akan menemukan `Dockerfile` di akar
   repo. Tidak perlu mengubah build command.
3. **Port**: `3000`.
4. **Persistent Storage** — ini bagian yang wajib:

   | | |
   |---|---|
   | Name | `cap-waktu-data` |
   | Mount Path | `/app/data` |

   Tanpa volume ini, seluruh riwayat dan gambar hilang setiap kali wadahnya
   dibuat ulang.
5. **Environment Variables**: salin dari `.env.example`. Yang penting hanya
   `CAP_WAKTU_GEOCODER_UA` — isi dengan kontak Anda, karena kebijakan
   Nominatim mewajibkannya.
6. **Health Check Path**: `/api/health`. Endpoint ini menyentuh basis data,
   bukan sekadar menjawab 200, sehingga volume yang gagal ter-mount langsung
   ketahuan.
7. Deploy.

Boot pertama menjalankan migrasi lalu memuat 91.019 wilayah ke basis data —
sekitar 0,7 detik, sekali saja. Karena itu `start-period` health check disetel
40 detik.

### Yang perlu diperhatikan

**Volume, bukan image.** Berkas `data/` sengaja dikeluarkan dari hasil build
lewat `outputFileTracingExcludes`. Tanpa itu, penelusuran dependensi Next ikut
menyalin seluruh isi folder data ke dalam image.

**Cadangkan `/app/data`.** Isinya basis data SQLite beserta seluruh foto asli
dan hasil. Tidak ada salinan di tempat lain.

**Ukuran unggahan.** Batas aplikasi 20 MB per gambar, dan tiap unduhan
menyimpan dua berkas (asli dan hasil). Bila ada reverse proxy di depan
Coolify, pastikan batas unggahannya tidak lebih kecil.

### Kenapa bukan Vercel

Sistem berkas pada platform serverless bersifat sementara dan hanya-baca, jadi
SQLite dan penyimpanan gambar lokal tidak akan bertahan. Untuk ke sana, basis
data perlu dipindah ke libSQL/Turso dan gambar ke penyimpanan objek.

### Menjalankan wadahnya secara lokal

```bash
docker build -t cap-waktu .
docker run -p 3000:3000 -v cap-waktu-data:/app/data cap-waktu
```

Gambar asli ikut dikirim ke server agar tabel `uploads` terisi sesuai skema.
Pemrosesan legenda tetap berjalan sepenuhnya di perangkat pengguna.
