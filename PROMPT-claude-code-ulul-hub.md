# Prompt untuk Claude Code: Ulul Hub

Salin seluruh isi di bawah garis ini ke Claude Code.

---

Kamu akan membantu saya membangun aplikasi web pribadi bernama **Ulul Hub**. Aplikasi ini menggabungkan dua hal: (1) pengelolaan keuangan pribadi bulanan dan (2) rencana belajar 12 Week Year. Aplikasi dipakai sendiri, harus bisa dibuka di HP dan laptop, live di internet, dan 100% gratis.

**Aplikasi ini akan saya pakai bertahun tahun, bukan sekali pakai.** Jadi jangan pernah hardcode tanggal, tahun, gaji, atau isi siklus belajar di kode. Semua itu adalah data yang bisa saya buat, ubah, dan arsipkan sendiri dari dalam aplikasi. Data lama tidak boleh rusak atau berubah ketika saya mengubah pengaturan untuk bulan atau siklus berikutnya.

Saya developer Node.js/React yang sedang belajar TypeScript. Jelaskan setiap langkah dengan singkat dalam Bahasa Indonesia, dan pandu saya langkah demi langkah untuk hal yang harus saya lakukan sendiri (membuat akun, mengisi environment variable, deploy).

## Cara kerja

1. Mulai dengan membuat rencana implementasi per fase dan tunjukkan ke saya sebelum menulis kode.
2. Kerjakan satu fase sampai selesai dan bisa dijalankan, lalu berhenti dan minta saya mengecek sebelum lanjut.
3. Buat git commit di akhir setiap fase dengan pesan yang jelas.
4. Jangan pernah menaruh secret di kode. Pakai file `.env.local` dan sediakan `.env.example`.
5. Kalau ada keputusan yang tidak jelas, tanya saya dulu.

## Stack (semua gratis)

1. Frontend: React + TypeScript + Vite, React Router, Tailwind CSS.
2. Backend dan database: Supabase (Postgres, Auth, Row Level Security). Pakai `@supabase/supabase-js`.
3. Hosting: Vercel (hubungkan ke repository GitHub, deploy otomatis setiap push ke `main`).
4. PWA: pakai `vite-plugin-pwa` supaya aplikasi bisa di install di layar utama HP.
5. Testing: Vitest untuk fungsi perhitungan uang dan skor.

## Aturan penting soal uang

1. Simpan semua nominal sebagai **integer rupiah** (`bigint` di Postgres, `number` bulat di TypeScript). Jangan pernah pakai float.
2. Tampilkan dengan format Indonesia: `Rp3.900.000`.
3. Uang yang ditabung **bukan pengeluaran**. Pengeluaran = total keluar dikurangi setoran tabungan.
4. Semua fungsi perhitungan (ringkasan bulan, sisa anggaran, rasio tabungan, skor mingguan) ditaruh di `src/lib/` sebagai fungsi murni dan wajib punya unit test.

## Login dan keamanan

1. Login dengan Supabase Auth memakai email magic link (tanpa password).
2. Setiap tabel punya kolom `user_id uuid references auth.users` dan **Row Level Security aktif**: user hanya bisa membaca dan menulis datanya sendiri (`user_id = auth.uid()`).
3. Matikan pendaftaran user baru setelah akun saya dibuat (jelaskan caranya di Supabase dashboard).

## Skema database

Buat migration SQL di `supabase/migrations/`:

**Keuangan**

1. `budget_categories`: `id`, `user_id`, `name`, `type` (`tabungan` | `kebutuhan` | `belajar` | `keinginan`), `sort_order int`, `archived_at timestamptz` (null = aktif). Kategori **tidak pernah dihapus permanen** kalau sudah punya transaksi, hanya diarsipkan, supaya laporan tahun lalu tetap utuh.
2. `budget_months`: `id`, `user_id`, `month date` (selalu tanggal 1), `income bigint`, unik per (`user_id`, `month`). Ini anggaran **per bulan**, bukan satu pengaturan global.
3. `budget_month_items`: `id`, `budget_month_id`, `category_id`, `amount bigint`.
4. `transactions`: `id`, `user_id`, `date date`, `type` (`masuk` | `keluar`), `category_id` (boleh null untuk pemasukan), `income_source` (`gaji` | `lain`, untuk pemasukan), `amount bigint check (amount > 0)`, `note text`, `created_at`, `updated_at`.

Aturan anggaran per bulan: saat saya membuka bulan yang belum punya anggaran, aplikasi menawarkan "Salin anggaran dari bulan sebelumnya". Mengubah anggaran bulan ini **tidak mengubah** anggaran bulan yang sudah lewat. Jadi kalau gaji saya naik tahun depan, laporan tahun ini tetap benar.

**Rencana belajar**

5. `learning_cycles`: `id`, `user_id`, `name` (contoh "Siklus 1: Q4 2026"), `start_date date` (harus hari Senin), `vision text`, `status` (`aktif` | `selesai` | `arsip`), `created_at`. Tanggal selesai dihitung: start + 12 minggu, lalu minggu ke 13 untuk istirahat.
6. `learning_tracks`: `id`, `cycle_id`, `name`, `color`, `goal text`, `sort_order`. Jalur **bisa berbeda di setiap siklus** (siklus pertama Finansial, AWS, CTF; siklus berikutnya bisa saya ganti).
7. `learning_weeks`: `id`, `cycle_id`, `track_id`, `week_number int` (1 sampai 12), `topic text`, `source text`.
8. `learning_tactics`: `id`, `week_id` (null untuk taktik tetap), `cycle_id`, `week_number`, `label text`, `done boolean default false`, `done_at timestamptz`.
9. `weekly_reviews`: `id`, `cycle_id`, `week_number`, `score int`, `went_well text`, `to_improve text`, `created_at`.
10. `study_schedule`: `id`, `cycle_id`, `weekday int` (1 Senin sampai 7 Minggu), `track_id` (null = hari review).

Semua tabel memakai `user_id` dan RLS seperti di atas (tabel anak boleh memakai kebijakan lewat join ke tabel induk).

Sediakan file `supabase/seed.sql` atau tombol "Isi data awal" di aplikasi yang mengisi data di bawah ini untuk user yang sedang login. Data awal ini hanya untuk siklus pertama dan anggaran bulan pertama, bukan bagian dari kode.

## Fitur 1: Keuangan

1. **Ringkasan bulan**: sisa uang, pemasukan, pengeluaran, ditabung, rasio tabungan. Ada navigasi bulan sebelumnya dan berikutnya.
2. **Catat transaksi**: pilih pengeluaran atau pemasukan, tanggal, kategori, jumlah (input otomatis berformat ribuan), catatan. Tombol cepat "Catat gaji" dan "Setor tabungan" memakai angka dari anggaran.
3. **Kontrol anggaran**: tiap pos menampilkan terpakai vs batas dengan progress bar. Hijau di bawah 80%, kuning 80% sampai 100%, merah kalau lewat batas. Untuk pos tabungan, logikanya terbalik: tampilkan "kurang Rp..." sampai target tercapai.
4. **Riwayat transaksi** bulan berjalan, bisa diedit dan dihapus (hapus pakai konfirmasi di dalam halaman, bukan `confirm()`).
5. **Laporan bulanan**: tabel semua bulan (pemasukan, pengeluaran, ditabung, sisa, rasio tabungan) dan grafik batang 6 bulan terakhir (pakai Recharts).
6. **Atur anggaran** dengan metode zero based budget: tampilkan total pos vs gaji, dan beri peringatan kalau ada uang yang belum dialokasikan atau kelebihan alokasi.
7. **Ekspor CSV** transaksi per bulan.

Data awal anggaran (gaji Rp3.900.000):

| Pos | Jumlah | Jenis |
|---|---|---|
| Tabungan | 1.200.000 | tabungan |
| Belajar | 400.000 | belajar |
| Makan dan kebutuhan harian | 1.000.000 | kebutuhan |
| Transport | 300.000 | kebutuhan |
| Pulsa dan internet | 150.000 | kebutuhan |
| Sedekah dan keluarga | 300.000 | kebutuhan |
| Jajan dan hiburan | 250.000 | keinginan |
| Lain lain | 300.000 | keinginan |

## Fitur 2: Rencana belajar 12 Week Year

1. **Kelola siklus**: buat siklus baru (pilih tanggal mulai hari Senin, isi visi dan target), lihat daftar semua siklus, arsipkan siklus lama. Hanya satu siklus yang berstatus aktif.
2. Saat membuat siklus baru, ada tiga pilihan: mulai kosong, salin struktur dari siklus sebelumnya (jalur, jadwal, taktik tetap, tanpa centang), atau salin lengkap termasuk topik untuk diulang.
3. Halaman utama belajar menampilkan **siklus aktif dan minggu berjalan secara otomatis** berdasarkan tanggal hari ini, dengan pemilih minggu 1 sampai 12. Kalau sedang minggu ke 13, tampilkan halaman evaluasi siklus. Kalau tidak ada siklus aktif, tampilkan ajakan membuat siklus baru.
4. Topik, taktik, dan sumber bisa ditambah, diedit, dan dihapus langsung dari aplikasi.
5. **Riwayat siklus**: rata rata skor tiap siklus, jumlah taktik selesai, dan perbandingan antar siklus, supaya saya bisa melihat perkembangan dari tahun ke tahun.
3. Setiap minggu punya tiga kolom jalur (Finansial, AWS, CTF), masing masing berisi topik, taktik berupa checklist, dan sumber belajar.
4. Taktik tetap setiap minggu: "Review mingguan Jumat dan catat skor". Minggu genap ditambah "Publikasikan 1 tulisan atau writeup".
5. **Skor eksekusi** = taktik selesai dibagi total taktik. Target 85%. Status: tercapai (hijau), hampir (kuning, 60% sampai 84%), di bawah target (merah).
6. **Review mingguan**: form singkat (apa yang berjalan baik, apa yang perlu diperbaiki) yang menyimpan skor minggu itu.
7. **Grafik skor** 12 minggu (garis) dengan garis target 85%.
8. Jadwal harian diambil dari tabel `study_schedule` siklus aktif dan bisa diubah. Tandai hari ini.
9. Halaman catatan berisi daftar platform belajar dan aturan fokus, bisa saya edit sendiri (simpan di tabel `notes`: `id`, `user_id`, `title`, `body` markdown).

Data awal **Siklus 1** (mulai Senin 5 Oktober 2026), jalur Finansial, AWS, CTF. Jadwal awal: Senin dan Kamis AWS, Selasa dan Minggu Finansial, Rabu dan Sabtu CTF, Jumat review. Format: topik | taktik 1 ; taktik 2 | sumber:

**Finansial**
1. Konsep dasar akuntansi | Pahami aset, liabilitas, ekuitas ; Kerjakan 10 soal persamaan akuntansi | AccountingCoach
2. Debit, kredit, jurnal umum | Pahami aturan debit kredit ; Buat jurnal 15 transaksi contoh | AccountingCoach
3. Buku besar dan neraca saldo | Posting jurnal ke buku besar ; Susun neraca saldo yang seimbang | YouTube
4. Laporan keuangan | Pahami neraca, laba rugi, arus kas ; Baca 1 laporan keuangan nyata | Khan Academy
5. Siklus anggaran pemerintah | Pahami DIPA dan RKA ; Tanya alur anggaran ke bagian keuangan | DJPb
6. SPJ dan bukti pengeluaran | Pahami UP, GU, LS ; Petakan dokumen SPJ di Labkesmas | DJPb
7. Pajak belanja pemerintah | Pahami PPh 21, 22, 23 dan PPN ; Hitung pajak 5 contoh kuitansi | YouTube
8. Desain database double entry | Rancang tabel akun, jurnal, entri ; Uji total debit selalu sama dengan kredit | Proyek SPJ
9. Uang di dalam kode | Simpan nominal sebagai integer ; Buat audit trail perubahan transaksi | Proyek SPJ
10. Modul transaksi SPJ | Implementasi pencatatan transaksi ; Validasi saldo tiap transaksi | Proyek SPJ
11. Rekonsiliasi dan laporan | Buat laporan otomatis dari jurnal ; Fitur rekonsiliasi saldo | Proyek SPJ
12. Studi kasus dan review | Tulis studi kasus modul keuangan SPJ ; Rangkum catatan 12 minggu | Portofolio

**AWS**
1. IAM dan akun | Buat user IAM dan aktifkan MFA ; Pasang billing alarm di CloudWatch | Skill Builder
2. EC2, AMI, EBS | Jalankan EC2 dan pasang web server ; Buat snapshot EBS dan AMI | freeCodeCamp
3. VPC dan jaringan | Buat VPC dengan subnet publik dan privat ; Atur security group dan NACL | Skill Builder
4. S3 dan penyimpanan | Host situs statis di S3 ; Atur lifecycle dan storage class | Tutorials Dojo
5. RDS dan DynamoDB | Buat RDS di subnet privat ; Coba operasi dasar DynamoDB | freeCodeCamp
6. ELB dan Auto Scaling | Pasang load balancer di depan 2 EC2 ; Uji Auto Scaling group | Skill Builder
7. Route 53 dan CloudFront | Pasang CloudFront di depan S3 ; Pelajari routing policy Route 53 | Tutorials Dojo
8. Serverless | Buat Lambda dengan API Gateway ; Coba SQS dan SNS | Skill Builder
9. Monitoring dan keamanan | Aktifkan CloudTrail dan dashboard CloudWatch ; Pelajari KMS dan enkripsi | Tutorials Dojo
10. Well Architected | Baca 6 pilar Well Architected ; Practice exam pertama, catat nilai | Skill Builder
11. Proyek akhir | Deploy demo aplikasi SPJ ke AWS ; Gunakan VPC, RDS, dan CloudWatch | AWS Free Tier
12. Ujian latihan akhir | Practice exam kedua, target 75% ; Ulang topik yang nilainya rendah | Skill Builder

**CTF**
1. Linux dan terminal | Selesaikan Bandit level 0 sampai 10 ; Catat 20 perintah Linux penting | OverTheWire
2. General skills dan Python | Bandit sampai level 20 ; 5 soal General Skills di picoGym | picoGym
3. Web dasar | Lab SQL injection dasar di PortSwigger ; 3 soal Web Exploitation picoGym | PortSwigger
4. Web lanjutan | Lab XSS dan command injection ; 2 soal web dan 1 writeup | PortSwigger
5. Kriptografi | Selesaikan bagian Introduction CryptoHack ; 3 soal Cryptography picoGym | CryptoHack
6. Forensik | Analisis 1 file pcap di Wireshark ; 3 soal Forensics picoGym | picoGym
7. OSINT dan misc | 3 soal OSINT atau misc ; Tulis 1 writeup | picoGym
8. Reverse engineering | Pelajari strings, file, Ghidra ; 3 soal Reverse Engineering picoGym | pwn.college
9. Binary exploitation | Modul awal pwn.college ; 2 soal buffer overflow dasar | pwn.college
10. CTF live pertama | Daftar 1 CTF pemula di CTFtime ; Tulis writeup soal yang selesai | CTFtime
11. Tambal kategori terlemah | Pilih 1 kategori skor terendah ; Kerjakan 4 soal kategori itu | picoGym
12. CTF live kedua | Ikut 1 CTF live lagi ; Publikasikan writeup terbaik | CTFtime

## Halaman Beranda (dashboard gabungan)

Satu layar yang menjawab "hari ini aku harus apa":

1. Jalur belajar hari ini dan taktik minggu ini yang belum selesai.
2. Skor eksekusi minggu ini.
3. Sisa uang bulan ini dan pos anggaran yang sudah kuning atau merah.
4. Tombol cepat: catat pengeluaran, centang taktik.

## Dirancang untuk dipakai bertahun tahun

1. **Laporan tahunan**: pilih tahun, tampilkan total pemasukan, pengeluaran, ditabung, rasio tabungan per bulan, pos yang paling sering lewat batas, dan perbandingan dengan tahun sebelumnya.
2. **Total tabungan berjalan**: akumulasi semua setoran tabungan sejak awal, dengan grafik pertumbuhan dari bulan ke bulan.
3. **Pencarian dan filter transaksi** berdasarkan rentang tanggal, kategori, dan kata kunci catatan, karena dalam beberapa tahun jumlahnya bisa ribuan.
4. **Paginasi dan query per rentang tanggal**. Jangan pernah memuat semua transaksi sekaligus. Buat index di `transactions (user_id, date)`.
5. **Cadangan data**: tombol "Unduh cadangan" yang mengekspor semua data saya ke satu file JSON, dan tombol "Pulihkan dari cadangan" untuk mengimpornya kembali (dengan pratinjau sebelum menulis). Tambahkan juga ekspor CSV per tahun.
6. **Cadangan otomatis gratis**: buat GitHub Actions terjadwal mingguan yang menjalankan `pg_dump` ke database Supabase memakai secret repository, lalu menyimpan hasilnya sebagai artifact workflow. Jelaskan cara memasangnya dan cara memulihkannya.
7. **Mencegah project Supabase dijeda**: GitHub Actions yang sama melakukan satu query ringan setiap beberapa hari, supaya project tetap aktif walaupun saya libur memakai aplikasi.
8. **Perubahan struktur database selalu lewat migration baru** di `supabase/migrations/`. Jangan pernah mengedit migration lama. Tulis di README cara menambah migration di masa depan.
9. **Versi aplikasi** ditampilkan di halaman pengaturan, dan buat `CHANGELOG.md`.
10. **Dependensi seminimal mungkin** dan versinya dikunci lewat lockfile, supaya aplikasi tetap bisa dibangun ulang bertahun tahun lagi. Hindari library yang tidak benar benar perlu.
11. Fungsi tanggal harus benar untuk tahun kabisat, pergantian tahun, dan siklus yang melewati tahun baru. Semua tanggal memakai zona waktu Asia/Jakarta. Buat test untuk kasus kasus ini.

## Desain

1. Mobile first, navigasi bawah di HP (Beranda, Keuangan, Belajar, Laporan), sidebar di laptop.
2. Dukung light dan dark mode mengikuti sistem.
3. Seluruh teks antarmuka dalam Bahasa Indonesia.
4. Tampilan bersih dan modern, angka memakai font monospace dengan `tabular-nums`.
5. Empty state yang jelas di setiap halaman (contoh: "Belum ada transaksi bulan ini. Mulai dengan mencatat gaji.").

## Struktur folder

```
src/
  lib/        fungsi murni (money.ts, budget.ts, scoring.ts, dates.ts) + test
  db/         klien Supabase dan fungsi query
  features/
    finance/
    learning/
    dashboard/
  components/ komponen UI bersama
  pages/
supabase/
  migrations/
  seed.sql
```

## Fase pengerjaan

1. **Fase 1**: setup project Vite + TypeScript + Tailwind + Router, layout navigasi, fungsi `src/lib` beserta test.
2. **Fase 2**: Supabase: migration, RLS, login magic link, data awal.
3. **Fase 3**: fitur Keuangan lengkap.
4. **Fase 4**: fitur Rencana Belajar lengkap.
5. **Fase 5**: Beranda gabungan, grafik, ekspor CSV.
6. **Fase 6**: PWA (ikon, manifest, bisa di install), README, dan deploy ke Vercel.
7. **Fase 7**: fitur jangka panjang: kelola dan riwayat siklus, laporan tahunan, pencarian transaksi, cadangan dan pemulihan data, GitHub Actions untuk backup dan menjaga Supabase tetap aktif.

## Panduan deploy yang harus kamu tulis di README

Tulis langkah demi langkah untuk:

1. Membuat project Supabase gratis, menjalankan migration, mengambil `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.
2. Mengatur redirect URL magic link di Supabase (localhost dan domain Vercel).
3. Push ke GitHub, import repository di Vercel, isi environment variable, deploy.
4. Menambahkan rewrite di `vercel.json` supaya route React Router tidak 404 saat di refresh.
5. Memasang aplikasi di layar utama HP (Android Chrome: menu, lalu "Tambahkan ke layar utama").
6. Catatan: project Supabase gratis bisa dijeda kalau tidak ada aktivitas sekitar 7 hari. Jelaskan cara kerja GitHub Actions penjaganya dan cara mengaktifkan project kembali kalau tetap terjeda.
7. Rutinitas perawatan tahunan: unduh cadangan, cek apakah backup otomatis masih berjalan, dan update dependensi dengan aman.

Mulai sekarang dengan menunjukkan rencana implementasi Fase 1.
