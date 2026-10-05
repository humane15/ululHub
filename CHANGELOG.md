# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/) dan versi memakai [SemVer](https://semver.org/lang/id/).

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
