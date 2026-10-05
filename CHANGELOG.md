# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/) dan versi memakai [SemVer](https://semver.org/lang/id/).

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
