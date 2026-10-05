# Ulul Hub

Aplikasi pribadi untuk keuangan bulanan dan rencana belajar 12 Week Year.

## Menjalankan di lokal

Butuh Node.js 22 (lihat `.nvmrc`).

```bash
npm install
cp .env.example .env.local   # lalu isi nilainya (lihat bagian Supabase)
npm run dev        # server pengembangan, http://localhost:5173
npm test           # unit test
npm run typecheck  # cek tipe TypeScript
npm run lint       # lint
npm run build      # build produksi ke dist/
```

## Menyiapkan Supabase (sekali saja)

### 1. Buat project

1. Daftar/masuk di https://supabase.com, klik **New project**.
2. Isi nama (misal `ulul-hub`), buat password database yang kuat dan **simpan** (dipakai untuk backup otomatis nanti), pilih region **Southeast Asia (Singapore)**. Plan: Free.
3. Tunggu sampai project siap.

### 2. Jalankan migration

Buka **SQL Editor → New query**, lalu jalankan file di `supabase/migrations/` **satu per satu sesuai urutan nama file**:

1. Salin isi `20261005000001_skema_awal.sql`, tempel, klik **Run**.
2. Ulangi untuk `20261005000002_fungsi_data_awal.sql`, lalu file berikutnya (`20261005000003_view_total_bulanan.sql`, `20261005000004_fungsi_buat_siklus.sql`, dst).

Sudah pernah menjalankan sebagian? Cukup jalankan file yang **belum** pernah dijalankan, sesuai urutan.

Cek di **Table Editor**: harus ada 11 tabel (semuanya berlabel RLS aktif) dan view `monthly_totals`.

> Alternatif lewat CLI: `npx supabase login`, `npx supabase link --project-ref <ref>`, lalu `npx supabase db push`.

### 3. Ambil URL dan key

Klik tombol **Connect** di bagian atas dashboard (atau **Project Settings → API Keys**), lalu salin ke `.env.local`:

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable key "sb_publishable_..." atau legacy anon key>
```

Key ini memang dipakai di browser dan aman, karena data dilindungi Row Level Security.
**Jangan pernah** memakai `service_role` / secret key di frontend.

### 4. Atur URL redirect magic link

**Authentication → URL Configuration**:

- **Site URL**: `http://localhost:5173` (ganti ke domain Vercel setelah deploy).
- **Redirect URLs**: tambahkan `http://localhost:5173/**` (dan nanti `https://<domain-vercel>/**`).

### 5. Buat akunmu, lalu tutup pendaftaran

Aplikasi tidak membuat user baru dari halaman login (`shouldCreateUser: false`), jadi akun dibuat dari dashboard:

1. **Authentication → Users → Add user → Create new user**. Isi email kamu, password acak (tidak dipakai), centang **Auto Confirm User**.
2. **Authentication → Sign In / Providers**: matikan **Allow new users to sign up**, lalu **Save**. Pastikan provider **Email** tetap aktif.

Sekarang hanya email kamu yang bisa menerima link masuk.

### 6. Masuk dan isi data awal

1. `npm run dev`, buka http://localhost:5173, masukkan email, klik link di email.
   (Link boleh dibuka di perangkat lain, misalnya minta di laptop dan buka di HP.)
2. Buka **Pengaturan → Isi data awal**, pilih tanggal mulai siklus (hari Senin), klik **Isi data awal**.
   Ini mengisi anggaran bulan ini, Siklus 1 (Finansial, AWS, CTF), dan catatan. Tombol hanya muncul saat akun masih kosong.

> Email bawaan Supabase dibatasi beberapa email per jam. Kalau muncul pesan "Terlalu banyak permintaan", tunggu sebentar.

## Mengubah struktur database di masa depan

- **Jangan pernah mengedit migration yang sudah dijalankan.** Buat file baru di `supabase/migrations/` dengan
  nama `YYYYMMDDHHMMSS_deskripsi.sql` (contoh `20270115090000_tambah_kolom_x.sql`), supaya urutannya jelas.
- Tabel baru wajib punya `user_id uuid not null default auth.uid() references auth.users (id) on delete cascade`,
  `alter table ... enable row level security`, dan kebijakan `user_id = (select auth.uid())`
  (contoh lengkap ada di akhir `20261005000001_skema_awal.sql`).
- Jalankan migration baru di SQL Editor (atau `npx supabase db push`), lalu perbarui tipe di `src/db/types.ts`.

## Beranda

Satu layar untuk "hari ini aku harus apa": jalur belajar hari ini dan taktik minggu ini yang belum selesai
(bisa dicentang langsung), skor minggu ini, sisa uang bulan ini, pos anggaran yang kuning/merah, dan tombol
cepat **Catat pengeluaran**.

## Fitur keuangan

- **Keuangan**: ringkasan bulan (sisa, pemasukan, pengeluaran, ditabung, rasio tabungan), navigasi bulan,
  catat/edit/hapus transaksi, tombol cepat *Catat gaji* dan *Setor tabungan*, kontrol anggaran per pos.
- **Atur anggaran** (`/keuangan/anggaran`): anggaran per bulan dengan metode zero based. Bulan tanpa anggaran
  bisa menyalin dari bulan sebelumnya. Mengubah satu bulan tidak mengubah bulan lain.
- **Pos anggaran** berlaku untuk semua bulan. Jenis pos tidak bisa diubah setelah dibuat (supaya laporan lama tetap
  sama); pos yang sudah dipakai hanya bisa diarsipkan.
- **Laporan**: grafik batang 6 bulan terakhir dan tabel semua bulan, dihitung di database lewat view `monthly_totals`.
- **Ekspor CSV** transaksi per bulan (tombol di kartu Riwayat transaksi). Format: pemisah koma, UTF-8 dengan BOM,
  jumlah berupa angka bulat tanpa pemisah ribuan. Kalau Excel menampilkan semuanya dalam satu kolom
  (pengaturan regional Indonesia memakai titik koma), buka lewat **Data → From Text/CSV** dan pilih pemisah koma.

## Fitur rencana belajar

- **Belajar**: siklus aktif dan minggu berjalan dipilih otomatis dari tanggal hari ini; pemilih minggu 1–12 dengan
  warna skor; minggu ke-13 menampilkan evaluasi siklus. Tanpa siklus aktif, muncul ajakan membuat siklus baru.
- Setiap jalur punya topik, taktik (checklist), dan sumber yang bisa diedit langsung (tombol **Edit** di kartu).
- **Skor eksekusi** = taktik selesai / total taktik minggu itu. Target 85%: hijau tercapai, kuning 60–84%, merah di bawahnya.
- **Review mingguan** menyimpan skor minggu itu beserta catatan.
- **Grafik skor** 12 minggu dengan garis target 85%.
- **Siklus baru** (`/belajar/siklus-baru`): mulai kosong, salin struktur (jalur, jadwal, taktik tetap), atau salin
  lengkap (termasuk topik). Siklus aktif lama otomatis ditandai selesai, datanya tetap ada.
- **Atur siklus** (`/belajar/atur`): nama, visi, jalur (warna, target, urutan), dan jadwal harian.
- **Catatan** (`/belajar/catatan`): catatan markdown sederhana (judul, daftar, tebal, miring, kode, link).

Panduan deploy ke Vercel, PWA, dan perawatan akan dilengkapi di fase berikutnya.
