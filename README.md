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

Cek di **Table Editor**: harus ada 11 tabel (semuanya berlabel RLS aktif) dan view `monthly_totals`,
`monthly_category_totals`, serta `cycle_week_stats`.

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

### 5b. Tambahkan kode masuk ke email (untuk aplikasi di HP)

Aplikasi yang dipasang di layar utama (terutama iPhone) tidak bisa menerima link login, karena link dari
email selalu terbuka di browser. Karena itu email login juga perlu memuat kode yang bisa diketik di aplikasi.

**Authentication → Emails → Templates → Magic Link**, ganti isi **Message body** dengan:

```html
<h2>Masuk ke Ulul Hub</h2>
<p><a href="{{ .ConfirmationURL }}">Klik untuk masuk</a></p>
<p>Atau ketik kode ini di aplikasi: <strong>{{ .Token }}</strong></p>
```

lalu **Save**.

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
- **Laporan tahunan** (`/laporan/tahunan`): pilih tahun; total pemasukan, pengeluaran, ditabung, dan rasio
  tabungan per bulan, perbandingan dengan tahun sebelumnya, pos yang paling sering lewat batas, dan ekspor CSV
  setahun penuh.
- **Total tabungan berjalan** di halaman Laporan: akumulasi semua setoran tabungan sejak awal beserta grafiknya.
- **Cari transaksi** (`/keuangan/cari`): filter rentang tanggal, pos, dan kata kunci catatan. Hasil dimuat per
  50 baris (paginasi) dan selalu lewat query ber-filter, jadi tetap cepat walau transaksinya ribuan.
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
- **Riwayat siklus** (`/belajar/riwayat`): semua siklus dengan rata-rata skor, taktik selesai, dan minggu yang
  mencapai target, plus grafik perbandingan antar siklus. Dari sini siklus bisa diarsipkan, dikeluarkan dari
  arsip, atau dijadikan aktif lagi (siklus aktif lain otomatis ditandai selesai). Klik nama siklus untuk melihat
  evaluasi lengkapnya.

## Cadangan data

### Dari aplikasi (manual)

**Pengaturan → Cadangan data**:

- **Unduh cadangan**: semua data (pos, anggaran, transaksi, siklus, taktik, review, jadwal, catatan) dalam
  satu file `ulul-hub-cadangan-YYYY-MM-DD.json`. Simpan di tempat aman (Google Drive, flashdisk).
- **Pulihkan dari cadangan**: pilih file JSON tadi. Aplikasi menampilkan **pratinjau** jumlah data sekarang vs
  di file; baris merah berarti datanya akan berkurang. Setelah dicentang dan dikonfirmasi, **semua data di akun
  diganti** isi file. Pemulihan berjalan dalam satu transaksi database: kalau gagal di tengah, tidak ada yang berubah.
- File cadangan bisa dipulihkan ke akun atau project Supabase **baru** (data otomatis menjadi milik akun yang
  sedang login). Ini cara termudah pindah project.

### Cadangan otomatis (GitHub Actions)

Workflow `.github/workflows/supabase.yml` berjalan gratis di GitHub:

| Jadwal | Tugas |
|---|---|
| Setiap Senin 02:00 WIB | `pg_dump` data database, dienkripsi, disimpan sebagai **artifact** workflow selama 90 hari |
| Setiap 3 hari | Satu query ringan ke database supaya project tidak dijeda (lihat bagian berikutnya) |

**Memasang (sekali saja):**

1. Di Supabase, klik **Connect** → tab **Connection string** → pilih **Session pooler** (bukan *Direct
   connection*, karena server GitHub tidak mendukung IPv6). Salin URL-nya dan ganti `[YOUR-PASSWORD]` dengan
   password database dari langkah 1. Bentuknya:
   `postgresql://postgres.<ref>:<password>@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`
2. Di GitHub: repo → **Settings → Secrets and variables → Actions → New repository secret**, buat dua secret:
   - `SUPABASE_DB_URL`: connection string tadi.
   - `BACKUP_PASSPHRASE`: kata sandi panjang untuk mengenkripsi cadangan. **Simpan juga di password manager**;
     tanpa ini file cadangan tidak bisa dibuka.
3. Cek versi Postgres di Supabase (**Project Settings → Infrastructure**). Kalau bukan 17, buat
   **variable** (tab *Variables*, bukan secret) `PG_MAJOR` berisi angka versinya, misalnya `15`.
4. Uji: tab **Actions → Supabase → Run workflow**, pilih `cadangan`, lalu `jaga-aktif`. Keduanya harus hijau.

Cadangan dienkripsi karena artifact bisa diunduh siapa pun yang punya akses ke repo. Tetap pakai repo **Private**.
GitHub juga mematikan jadwal workflow di repo **publik** yang tidak ada aktivitas 60 hari; repo private tidak
terkena aturan ini, dan pemakaiannya jauh di bawah kuota gratis.

**Memulihkan dari cadangan otomatis:**

1. **Actions → Supabase →** pilih run yang berhasil → unduh artifact `ulul-hub-YYYY-MM-DD` (berupa zip), ekstrak.
2. Dekripsi (butuh `gpg` dan `psql`; di Windows pakai WSL atau Git Bash):

   ```bash
   gpg -d ulul-hub-YYYY-MM-DD.sql.gz.gpg | gunzip > ulul-hub.sql   # minta BACKUP_PASSPHRASE
   ```

3. **Kalau memulihkan ke project baru**: jalankan semua migration, buat akun dan login sekali (langkah 5–6,
   tanpa *Isi data awal*), lalu ganti id user lama dengan yang baru (lihat di **Authentication → Users**):

   ```bash
   sed -i 's/<id-user-lama>/<id-user-baru>/g' ulul-hub.sql
   ```

   Id user lama = kolom kedua (`user_id`) di baris data mana pun dalam file:

   ```bash
   awk -F'\t' '/^COPY public\./ { getline; if ($0 != "\\.") { print $2; exit } }' ulul-hub.sql
   ```
4. Kosongkan data lama, lalu pulihkan dalam satu transaksi:

   ```bash
   psql "$SUPABASE_DB_URL" -c "truncate public.transactions, public.budget_month_items, public.budget_months, public.budget_categories, public.learning_cycles, public.notes cascade"
   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 --single-transaction -f ulul-hub.sql
   ```

   Kalau ada error, transaksi dibatalkan dan data tidak setengah jadi.

Cara lain yang lebih mudah: unduh **cadangan JSON dari aplikasi** secara rutin, karena bisa dipulihkan
langsung dari halaman Pengaturan.

## Deploy ke internet (GitHub + Vercel)

### 1. Push ke GitHub

1. Buat repository baru di https://github.com/new, misalnya `ulul-hub`. Pilih **Private**. Jangan centang
   "Add a README" (repo harus kosong).
2. Di terminal, dari folder project:

   ```bash
   git remote add origin https://github.com/<username>/ulul-hub.git
   git push -u origin main
   ```

   `.env.local` tidak ikut ter-push (sudah ada di `.gitignore`). Cek dengan `git ls-files | grep env`:
   yang boleh muncul hanya `.env.example`.

### 2. Import ke Vercel

1. Masuk ke https://vercel.com dengan akun GitHub (plan **Hobby**, gratis).
2. **Add New → Project**, pilih repository `ulul-hub`, klik **Import**.
3. Framework terdeteksi otomatis sebagai **Vite** (pengaturan build juga ada di `vercel.json`).
4. Buka **Environment Variables**, tambahkan dua variabel yang sama dengan `.env.local`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Klik **Deploy**. Setelah selesai, kamu mendapat domain seperti `https://ulul-hub.vercel.app`.

Mulai sekarang setiap `git push` ke `main` otomatis di-deploy ulang. Mengubah environment variable butuh
deploy ulang manual: **Deployments → titik tiga di deployment terakhir → Redeploy**.

### 3. Daftarkan domain Vercel di Supabase

Tanpa langkah ini, link login di email akan mengarah ke localhost.

**Supabase → Authentication → URL Configuration**:

- **Site URL**: ganti menjadi `https://<domain-vercel>`.
- **Redirect URLs**: tambahkan `https://<domain-vercel>/**` (biarkan `http://localhost:5173/**` untuk pengembangan).

### Kenapa ada `vercel.json`?

Aplikasi ini memakai React Router: alamat seperti `/keuangan/anggaran` hanya ada di JavaScript, bukan file
di server. Tanpa aturan `rewrites`, me-refresh halaman itu memberi 404. Aturan
`{ "source": "/(.*)", "destination": "/index.html" }` membuat semua alamat yang bukan file dilayani oleh
`index.html`, lalu React Router menampilkan halaman yang benar. File asli (`/assets/...`, `/sw.js`,
ikon) tetap dilayani langsung karena Vercel memeriksa file lebih dulu.

`vercel.json` juga mengatur cache: `sw.js` selalu dicek ulang (supaya versi baru terdeteksi), sedangkan
file di `/assets/` di-cache selamanya (namanya berubah setiap build).

## Memasang di layar utama HP (PWA)

- **Android (Chrome)**: buka domain Vercel, login, lalu menu **⋮ → Tambahkan ke layar utama**
  (atau **Instal aplikasi**). Ulul Hub akan terbuka seperti aplikasi biasa, tanpa bilah alamat.
- **iPhone (Safari)**: tombol **Bagikan → Tambahkan ke Layar Utama**.

Login cukup sekali di aplikasi yang terpasang: masukkan email, lalu **ketik kode dari email** di layar
"Cek email kamu" (jangan klik link-nya, karena link akan terbuka di browser, bukan di aplikasi).
Kode ini butuh template email di langkah 5b.

Kerangka aplikasi tersimpan offline, jadi aplikasi tetap terbuka tanpa internet, tetapi data selalu
diambil dari Supabase (butuh internet). Saat ada versi baru, muncul banner **"Versi baru Ulul Hub
tersedia"**; tekan **Muat ulang** untuk memakainya.

## Catatan: project Supabase gratis bisa dijeda

Supabase menjeda project gratis yang tidak ada aktivitas sekitar 7 hari. Data **tidak hilang**, tetapi
aplikasi tidak bisa memuat data sampai project diaktifkan lagi.

**Penjaganya:** job `jaga-aktif` di workflow GitHub Actions (lihat *Cadangan otomatis*) menjalankan satu
query ringan (`select count(*) from public.learning_cycles`) setiap 3 hari, ditambah cadangan mingguan yang juga
mengakses database. Jadi project tetap aktif walaupun kamu libur memakai aplikasi. Pastikan secret
`SUPABASE_DB_URL` sudah diisi dan run di tab **Actions** hijau.

Kalau tetap terjeda (misalnya secret salah atau workflow mati): buka dashboard Supabase, pilih project, klik
**Restore project**, tunggu beberapa menit. Setelah aktif, cek tab **Actions** dan jalankan workflow manual
untuk memastikan penjaganya kembali berjalan.

## Perawatan

Rutinitas tahunan (misalnya setiap awal Januari):

1. **Unduh cadangan** dari Pengaturan dan simpan di luar Supabase.
2. **Cek backup otomatis**: tab **Actions → Supabase**, pastikan run mingguan terakhir hijau. Unduh satu artifact
   dan coba dekripsi (`gpg -d ... | gunzip | head`) untuk memastikan `BACKUP_PASSPHRASE` yang kamu simpan benar.
3. Buka **Laporan tahunan** tahun lalu dan **Riwayat siklus**; arsipkan siklus yang sudah tidak perlu dilihat.
4. Update dependensi (di bawah).

Update dependensi dengan aman:

```bash
git switch -c update-dependensi
npm outdated                 # lihat apa yang bisa diupdate
npm update                   # update minor/patch sesuai lockfile
npm test && npm run typecheck && npm run build
npm run dev                  # coba manual: login, catat transaksi, centang taktik
git commit -am "chore: update dependensi" && git push -u origin update-dependensi
```

Vercel membuat **preview deployment** untuk branch itu; cek dulu, lalu merge ke `main`. Untuk update versi
mayor (misalnya React 20), lakukan satu paket per commit dan baca catatan rilisnya.
