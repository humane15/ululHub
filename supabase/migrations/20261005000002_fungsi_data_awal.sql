-- Fungsi "Isi data awal": mengisi anggaran bulan pertama dan Siklus 1 untuk user yang sedang login.
-- Dipanggil dari halaman Pengaturan lewat supabase.rpc('seed_initial_data', ...).
--
-- * security invoker: berjalan sebagai user itu sendiri, jadi RLS tetap berlaku.
-- * Hanya bisa dijalankan saat akun masih kosong (belum ada kategori dan siklus).
-- * Semua isi di sini hanya data awal; setelahnya semuanya bisa diubah dari aplikasi.

create function public.seed_initial_data(p_month date, p_cycle_start date, p_cycle_name text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_month_id uuid;
  v_cycle_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Harus login untuk mengisi data awal' using errcode = '42501';
  end if;

  if exists (select 1 from public.budget_categories) or exists (select 1 from public.learning_cycles) then
    raise exception 'Data awal hanya bisa diisi saat akun masih kosong' using errcode = 'P0001';
  end if;

  -- ---------- Keuangan: kategori + anggaran bulan pertama (gaji Rp3.900.000) ----------

  insert into public.budget_months (month, income)
  values (p_month, 3900000)
  returning id into v_month_id;

  insert into public.budget_categories (name, type, sort_order)
  values
    ('Tabungan',                   'tabungan',  1),
    ('Belajar',                    'belajar',   2),
    ('Makan dan kebutuhan harian', 'kebutuhan', 3),
    ('Transport',                  'kebutuhan', 4),
    ('Pulsa dan internet',         'kebutuhan', 5),
    ('Sedekah dan keluarga',       'kebutuhan', 6),
    ('Jajan dan hiburan',          'keinginan', 7),
    ('Lain lain',                  'keinginan', 8);

  insert into public.budget_month_items (budget_month_id, category_id, amount)
  select v_month_id, c.id, a.amount
  from public.budget_categories c
  join (values
    ('Tabungan',                   1200000),
    ('Belajar',                     400000),
    ('Makan dan kebutuhan harian', 1000000),
    ('Transport',                   300000),
    ('Pulsa dan internet',          150000),
    ('Sedekah dan keluarga',        300000),
    ('Jajan dan hiburan',           250000),
    ('Lain lain',                   300000)
  ) as a(name, amount) on a.name = c.name;

  -- ---------- Belajar: Siklus 1 ----------

  insert into public.learning_cycles (name, start_date, status)
  values (p_cycle_name, p_cycle_start, 'aktif')
  returning id into v_cycle_id;

  insert into public.learning_tracks (cycle_id, name, color, sort_order)
  values
    (v_cycle_id, 'Finansial', 'emerald', 1),
    (v_cycle_id, 'AWS',       'amber',   2),
    (v_cycle_id, 'CTF',       'rose',    3);

  create temporary table seed_weeks (
    track text, week_number int, topic text, tactic1 text, tactic2 text, source text
  ) on commit drop;

  insert into seed_weeks values
    ('Finansial',  1, 'Konsep dasar akuntansi',      'Pahami aset, liabilitas, ekuitas',     'Kerjakan 10 soal persamaan akuntansi',          'AccountingCoach'),
    ('Finansial',  2, 'Debit, kredit, jurnal umum',  'Pahami aturan debit kredit',           'Buat jurnal 15 transaksi contoh',               'AccountingCoach'),
    ('Finansial',  3, 'Buku besar dan neraca saldo', 'Posting jurnal ke buku besar',         'Susun neraca saldo yang seimbang',              'YouTube'),
    ('Finansial',  4, 'Laporan keuangan',            'Pahami neraca, laba rugi, arus kas',   'Baca 1 laporan keuangan nyata',                 'Khan Academy'),
    ('Finansial',  5, 'Siklus anggaran pemerintah',  'Pahami DIPA dan RKA',                  'Tanya alur anggaran ke bagian keuangan',        'DJPb'),
    ('Finansial',  6, 'SPJ dan bukti pengeluaran',   'Pahami UP, GU, LS',                    'Petakan dokumen SPJ di Labkesmas',              'DJPb'),
    ('Finansial',  7, 'Pajak belanja pemerintah',    'Pahami PPh 21, 22, 23 dan PPN',        'Hitung pajak 5 contoh kuitansi',                'YouTube'),
    ('Finansial',  8, 'Desain database double entry','Rancang tabel akun, jurnal, entri',    'Uji total debit selalu sama dengan kredit',     'Proyek SPJ'),
    ('Finansial',  9, 'Uang di dalam kode',          'Simpan nominal sebagai integer',       'Buat audit trail perubahan transaksi',          'Proyek SPJ'),
    ('Finansial', 10, 'Modul transaksi SPJ',         'Implementasi pencatatan transaksi',    'Validasi saldo tiap transaksi',                 'Proyek SPJ'),
    ('Finansial', 11, 'Rekonsiliasi dan laporan',    'Buat laporan otomatis dari jurnal',    'Fitur rekonsiliasi saldo',                      'Proyek SPJ'),
    ('Finansial', 12, 'Studi kasus dan review',      'Tulis studi kasus modul keuangan SPJ', 'Rangkum catatan 12 minggu',                     'Portofolio'),

    ('AWS',  1, 'IAM dan akun',            'Buat user IAM dan aktifkan MFA',           'Pasang billing alarm di CloudWatch',     'Skill Builder'),
    ('AWS',  2, 'EC2, AMI, EBS',           'Jalankan EC2 dan pasang web server',       'Buat snapshot EBS dan AMI',              'freeCodeCamp'),
    ('AWS',  3, 'VPC dan jaringan',        'Buat VPC dengan subnet publik dan privat', 'Atur security group dan NACL',           'Skill Builder'),
    ('AWS',  4, 'S3 dan penyimpanan',      'Host situs statis di S3',                  'Atur lifecycle dan storage class',       'Tutorials Dojo'),
    ('AWS',  5, 'RDS dan DynamoDB',        'Buat RDS di subnet privat',                'Coba operasi dasar DynamoDB',            'freeCodeCamp'),
    ('AWS',  6, 'ELB dan Auto Scaling',    'Pasang load balancer di depan 2 EC2',      'Uji Auto Scaling group',                 'Skill Builder'),
    ('AWS',  7, 'Route 53 dan CloudFront', 'Pasang CloudFront di depan S3',            'Pelajari routing policy Route 53',       'Tutorials Dojo'),
    ('AWS',  8, 'Serverless',              'Buat Lambda dengan API Gateway',           'Coba SQS dan SNS',                       'Skill Builder'),
    ('AWS',  9, 'Monitoring dan keamanan', 'Aktifkan CloudTrail dan dashboard CloudWatch', 'Pelajari KMS dan enkripsi',          'Tutorials Dojo'),
    ('AWS', 10, 'Well Architected',        'Baca 6 pilar Well Architected',            'Practice exam pertama, catat nilai',     'Skill Builder'),
    ('AWS', 11, 'Proyek akhir',            'Deploy demo aplikasi SPJ ke AWS',          'Gunakan VPC, RDS, dan CloudWatch',       'AWS Free Tier'),
    ('AWS', 12, 'Ujian latihan akhir',     'Practice exam kedua, target 75%',          'Ulang topik yang nilainya rendah',       'Skill Builder'),

    ('CTF',  1, 'Linux dan terminal',        'Selesaikan Bandit level 0 sampai 10',   'Catat 20 perintah Linux penting',        'OverTheWire'),
    ('CTF',  2, 'General skills dan Python', 'Bandit sampai level 20',                '5 soal General Skills di picoGym',       'picoGym'),
    ('CTF',  3, 'Web dasar',                 'Lab SQL injection dasar di PortSwigger','3 soal Web Exploitation picoGym',        'PortSwigger'),
    ('CTF',  4, 'Web lanjutan',              'Lab XSS dan command injection',         '2 soal web dan 1 writeup',               'PortSwigger'),
    ('CTF',  5, 'Kriptografi',               'Selesaikan bagian Introduction CryptoHack', '3 soal Cryptography picoGym',        'CryptoHack'),
    ('CTF',  6, 'Forensik',                  'Analisis 1 file pcap di Wireshark',     '3 soal Forensics picoGym',               'picoGym'),
    ('CTF',  7, 'OSINT dan misc',            '3 soal OSINT atau misc',                'Tulis 1 writeup',                        'picoGym'),
    ('CTF',  8, 'Reverse engineering',       'Pelajari strings, file, Ghidra',        '3 soal Reverse Engineering picoGym',     'pwn.college'),
    ('CTF',  9, 'Binary exploitation',       'Modul awal pwn.college',                '2 soal buffer overflow dasar',           'pwn.college'),
    ('CTF', 10, 'CTF live pertama',          'Daftar 1 CTF pemula di CTFtime',        'Tulis writeup soal yang selesai',        'CTFtime'),
    ('CTF', 11, 'Tambal kategori terlemah',  'Pilih 1 kategori skor terendah',        'Kerjakan 4 soal kategori itu',           'picoGym'),
    ('CTF', 12, 'CTF live kedua',            'Ikut 1 CTF live lagi',                  'Publikasikan writeup terbaik',           'CTFtime');

  insert into public.learning_weeks (cycle_id, track_id, week_number, topic, source)
  select v_cycle_id, t.id, s.week_number, s.topic, s.source
  from seed_weeks s
  join public.learning_tracks t on t.cycle_id = v_cycle_id and t.name = s.track;

  -- Taktik per jalur (2 per minggu).
  insert into public.learning_tactics (week_id, cycle_id, week_number, label, sort_order)
  select w.id, v_cycle_id, w.week_number, x.label, x.ord
  from seed_weeks s
  join public.learning_tracks t on t.cycle_id = v_cycle_id and t.name = s.track
  join public.learning_weeks w on w.track_id = t.id and w.week_number = s.week_number
  cross join lateral unnest(array[s.tactic1, s.tactic2]) with ordinality as x(label, ord);

  -- Taktik tetap (week_id null): review tiap minggu, publikasi di minggu genap.
  insert into public.learning_tactics (cycle_id, week_number, label, sort_order)
  select v_cycle_id, n, 'Review mingguan Jumat dan catat skor', 100 from generate_series(1, 12) as n
  union all
  select v_cycle_id, n, 'Publikasikan 1 tulisan atau writeup', 101 from generate_series(2, 12, 2) as n;

  -- Jadwal: Senin & Kamis AWS, Selasa & Minggu Finansial, Rabu & Sabtu CTF, Jumat review.
  insert into public.study_schedule (cycle_id, weekday, track_id)
  select v_cycle_id, s.weekday, t.id
  from (values (1, 'AWS'), (2, 'Finansial'), (3, 'CTF'), (4, 'AWS'), (5, null), (6, 'CTF'), (7, 'Finansial'))
    as s(weekday, track)
  left join public.learning_tracks t on t.cycle_id = v_cycle_id and t.name = s.track;

  -- ---------- Catatan ----------

  insert into public.notes (title, body, sort_order)
  values
    ('Platform belajar', $md$
- **AccountingCoach**: https://www.accountingcoach.com
- **Khan Academy**: https://www.khanacademy.org
- **DJPb Kemenkeu**: https://djpb.kemenkeu.go.id
- **AWS Skill Builder**: https://skillbuilder.aws
- **freeCodeCamp**: https://www.freecodecamp.org
- **Tutorials Dojo**: https://tutorialsdojo.com
- **OverTheWire (Bandit)**: https://overthewire.org/wargames/bandit
- **picoGym**: https://play.picoctf.org/practice
- **PortSwigger Web Security Academy**: https://portswigger.net/web-security
- **CryptoHack**: https://cryptohack.org
- **pwn.college**: https://pwn.college
- **CTFtime**: https://ctftime.org
$md$, 1),
    ('Aturan fokus', $md$
- Ikuti jadwal harian; satu jalur per hari.
- Jumat untuk review mingguan dan catat skor.
- Target skor eksekusi 85% setiap minggu.

_Ubah catatan ini sesuai aturanmu sendiri._
$md$, 2);

  return v_cycle_id;
end;
$$;

revoke execute on function public.seed_initial_data(date, date, text) from public, anon;
grant execute on function public.seed_initial_data(date, date, text) to authenticated;
