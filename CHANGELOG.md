# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/) dan versi memakai [SemVer](https://semver.org/lang/id/).

## [0.8.0] - 2026-10-12

### Ditambahkan
- Pengingat interaktif (Beranda, ikon lonceng, halaman `/pengingat`): anggaran melebihi gaji, pos hampir habis atau
  lewat batas, uang keluar melebihi pemasukan, target tabungan belum tercapai menjelang akhir bulan; belajar hari
  ini belum dikerjakan, minggu tertinggal dari laju, hari tanpa progres, review minggu lalu belum diisi, siklus
  mulai/berakhir. Setiap pengingat punya tombol aksi, "Besok lagi", dan "Abaikan".
- Toast saat sebuah simpanan (transaksi atau centang taktik) memunculkan peringatan baru.
- Notifikasi sistem opsional pada jam pengingat harian (Pengaturan), sekali per hari per peringatan.
- "Ulang siklus": menyalin siklus terakhir secara lengkap dan mulai besok.
- `src/lib/alerts.ts`, `src/lib/alertState.ts` + test.

### Diubah
- Siklus belajar boleh dimulai di hari apa saja, tidak harus Senin. **Jalankan migration
  `20261012000001_siklus_boleh_mulai_hari_apa_saja.sql` di Supabase sebelum membuat siklus yang mulai Selasa.**

## [0.7.0] - 2026-10-05

### Ditambahkan
- Riwayat siklus (`/belajar/riwayat`): rata-rata skor, taktik selesai, minggu tercapai, grafik perbandingan
  antar siklus, arsipkan/keluarkan dari arsip/jadikan aktif, dan halaman evaluasi siklus lama.
- Laporan tahunan (`/laporan/tahunan`): 12 bulan per tahun, perbandingan dengan tahun sebelumnya, pos yang paling
  sering lewat batas, ekspor CSV per tahun.
- Total tabungan berjalan dengan grafik pertumbuhan di halaman Laporan.
- Cari transaksi (`/keuangan/cari`): filter tanggal, pos, kata kunci catatan, paginasi 50 baris.
- Cadangan data: unduh semua data ke JSON dan pulihkan dengan pratinjau (satu transaksi database).
- GitHub Actions `supabase.yml`: `pg_dump` terenkripsi mingguan sebagai artifact dan query penjaga setiap 3 hari
  supaya project Supabase tidak dijeda.
- Migration `20261005000005`: view `cycle_week_stats` dan `monthly_category_totals`, fungsi `set_cycle_status`
  dan `restore_backup`.
- Fungsi murni baru + test: `yearMonths`, `yearSummary`, `compareYears`, `availableYears`, `cumulativeSavings`,
  `overBudgetCounts`, `cycleHistoryStats`, `src/lib/search.ts`, `src/lib/backup.ts`.
- README: cadangan manual dan otomatis, cara memulihkan, penjaga Supabase, rutinitas perawatan tahunan.

### Diubah
- File JSON yang diunduh tidak lagi diberi BOM (BOM hanya untuk CSV).

## [0.6.0] - 2026-10-05

### Ditambahkan
- PWA: manifest, ikon aplikasi (termasuk maskable dan apple-touch-icon), service worker untuk kerangka offline,
  banner "Versi baru tersedia" (dicek tiap jam).
- `vercel.json`: rewrite SPA, header keamanan dasar, cache `sw.js` dan `/assets/`.
- Login dengan kode dari email (selain magic link) untuk aplikasi yang terpasang di HP.
- README: panduan push ke GitHub, deploy Vercel, URL Supabase, memasang di HP, catatan jeda Supabase, perawatan.

### Diubah
- Ikon/favicon bawaan Vite diganti ikon Ulul Hub (sumber di `assets/`).
- Halaman dimuat per rute (lazy) supaya pembukaan pertama lebih ringan.

## [0.5.0] - 2026-10-05

### Ditambahkan
- Beranda gabungan: jalur belajar hari ini + taktik yang belum selesai (centang langsung, bisa dibatalkan),
  skor minggu ini, sisa uang, pos kuning/merah, tombol cepat catat pengeluaran.
- Grafik batang 6 bulan terakhir di Laporan dan grafik garis skor 12 minggu (target 85%) di Belajar,
  memakai Recharts yang dimuat terpisah (lazy). Palet seri divalidasi untuk buta warna, mode terang dan gelap.
- Ekspor CSV transaksi per bulan.
- Fungsi murni baru + test: `monthlySeries`, `toCsv`, `scoreSeries`, `formatRupiahCompact`.

## [0.4.0] - 2026-10-05

### Ditambahkan
- Halaman Belajar: siklus aktif dan minggu berjalan otomatis, pemilih minggu 1–12 berwarna skor, evaluasi minggu ke-13,
  ajakan membuat siklus kalau belum ada.
- Kartu per jalur: topik, checklist taktik (centang langsung tersimpan), sumber; semuanya bisa diedit.
- Taktik tetap, skor eksekusi dengan penanda target 85%, review mingguan.
- Jadwal harian (hari ini ditandai) dan pengaturannya.
- Siklus baru dengan 3 pilihan isi lewat fungsi `create_learning_cycle` (migration `20261005000004`).
- Atur siklus: nama, visi, jalur (tambah, edit, urutkan, hapus dengan konfirmasi).
- Catatan markdown (parser sendiri, tanpa HTML mentah; link hanya http/https/mailto).
- Fungsi murni baru + test: `src/lib/learning.ts`, `src/lib/markdown.ts`.

## [0.3.0] - 2026-10-05

### Ditambahkan
- Halaman Keuangan: ringkasan bulan dengan navigasi bulan (`?bulan=YYYY-MM`), catat/edit/hapus transaksi
  (konfirmasi hapus di dalam halaman), tombol cepat "Catat gaji" dan "Setor tabungan", kontrol anggaran per pos.
- Halaman Atur anggaran: zero based budget per bulan, salin anggaran dari bulan sebelumnya, kelola pos
  (tambah, ganti nama, urutkan, arsipkan, pulihkan, hapus kalau belum dipakai).
- Laporan bulanan (tabel) dari view baru `monthly_totals` (migration `20261005000003`).
- Fungsi murni baru + test: `summaryFromTotals`, `budgetControlRows`, `savingsDepositSuggestion`,
  `parseMonthParam`, `toMonthParam`, `defaultDateInMonth`.

## [0.2.0] - 2026-10-05

### Ditambahkan
- Migration Supabase: tabel keuangan, rencana belajar, dan catatan dengan Row Level Security di semua tabel.
- Foreign key memakai `(id, user_id)` supaya data tidak bisa merujuk milik user lain; kategori yang sudah dipakai tidak bisa dihapus.
- Login dengan magic link email (tanpa password, tanpa pendaftaran dari aplikasi).
- Tombol "Isi data awal" di Pengaturan (fungsi `seed_initial_data`): anggaran bulan pertama, Siklus 1, catatan.
- Halaman petunjuk kalau `.env.local` belum diisi.

## [0.1.0] - 2026-10-04

### Ditambahkan
- Setup project React + TypeScript + Vite, Tailwind CSS v4, React Router.
- Layout: navigasi bawah di HP, sidebar di laptop, light/dark mode mengikuti sistem.
- Fungsi murni `src/lib`: `money.ts`, `budget.ts`, `scoring.ts`, `dates.ts` beserta unit test (Vitest).
