# Cap Waktu

Aplikasi web untuk membubuhkan waktu, tanggal, nama lokasi, dan titik koordinat
pada foto — untuk dokumentasi pekerjaan, laporan lapangan, dan keperluan
administrasi.

Legenda digambar langsung di perangkat pengguna memakai Canvas API, lalu hasilnya
diunduh dan tercatat di riwayat.

## Fitur

- Unggah foto dari galeri atau ambil langsung dari kamera
- Koordinat otomatis dari GPS perangkat, atau diisi manual
- Pengaturan legenda: format tanggal, posisi, jenis huruf, ukuran, warna
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

## Catatan penerapan

Versi ini menyimpan basis data dan berkas gambar di sistem berkas lokal, jadi
**belum bisa dijalankan di platform serverless seperti Vercel**, yang sistem
berkasnya bersifat sementara. Untuk ke sana, basis data perlu dipindah ke
libSQL/Turso dan berkas gambar ke penyimpanan objek.

Gambar asli ikut dikirim ke server agar tabel `uploads` terisi sesuai skema.
Pemrosesan legenda tetap berjalan sepenuhnya di perangkat pengguna.
