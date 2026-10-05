-- Ulul Hub: skema awal (keuangan + rencana belajar + catatan).
--
-- Aturan:
-- * JANGAN mengedit file ini setelah dijalankan. Perubahan struktur selalu lewat migration baru.
-- * Semua nominal uang = bigint rupiah (tanpa desimal).
-- * Setiap tabel punya user_id (default auth.uid()) dan Row Level Security aktif.
-- * Foreign key memakai pasangan (id, user_id) supaya baris tidak bisa merujuk data milik user lain.

-- ---------------------------------------------------------------------------
-- Fungsi bantu
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- done_at otomatis terisi saat taktik dicentang dan kosong saat centang dilepas.
create function public.set_tactic_done_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.done and (tg_op = 'INSERT' or not old.done) then
    new.done_at := coalesce(new.done_at, now());
  elsif not new.done then
    new.done_at := null;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Keuangan
-- ---------------------------------------------------------------------------

create table public.budget_categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  type        text not null check (type in ('tabungan', 'kebutuhan', 'belajar', 'keinginan')),
  sort_order  int not null default 0,
  -- null = aktif. Kategori yang sudah dipakai tidak bisa dihapus (FK restrict), hanya diarsipkan.
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (id, user_id)
);
create index budget_categories_user_idx on public.budget_categories (user_id, sort_order);

-- Anggaran per bulan. Mengubah bulan ini tidak menyentuh bulan lain.
create table public.budget_months (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  month      date not null check (extract(day from month) = 1),
  income     bigint not null default 0 check (income >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, month),
  unique (id, user_id)
);

create table public.budget_month_items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  budget_month_id uuid not null,
  category_id     uuid not null,
  amount          bigint not null default 0 check (amount >= 0),
  unique (budget_month_id, category_id),
  foreign key (budget_month_id, user_id) references public.budget_months (id, user_id) on delete cascade,
  foreign key (category_id, user_id) references public.budget_categories (id, user_id) on delete restrict
);
create index budget_month_items_category_idx on public.budget_month_items (category_id);

create table public.transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date          date not null,
  type          text not null check (type in ('masuk', 'keluar')),
  category_id   uuid,
  income_source text check (income_source in ('gaji', 'lain')),
  amount        bigint not null check (amount > 0),
  note          text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- Pengeluaran wajib punya kategori; pemasukan wajib punya sumber.
  constraint transactions_type_fields check (
    (type = 'keluar' and category_id is not null and income_source is null)
    or (type = 'masuk' and income_source is not null)
  ),
  foreign key (category_id, user_id) references public.budget_categories (id, user_id) on delete restrict
);
create index transactions_user_date_idx on public.transactions (user_id, date);
create index transactions_category_idx on public.transactions (category_id);

create trigger transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Rencana belajar (12 Week Year)
-- ---------------------------------------------------------------------------

create table public.learning_cycles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  -- Selalu hari Senin. Akhir siklus dihitung di aplikasi: start + 12 minggu, minggu ke-13 istirahat.
  start_date date not null check (extract(isodow from start_date) = 1),
  vision     text not null default '',
  status     text not null default 'aktif' check (status in ('aktif', 'selesai', 'arsip')),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);
-- Hanya satu siklus aktif per user.
create unique index learning_cycles_one_active_idx on public.learning_cycles (user_id) where status = 'aktif';
create index learning_cycles_user_start_idx on public.learning_cycles (user_id, start_date);

create table public.learning_tracks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  cycle_id   uuid not null,
  name       text not null check (length(trim(name)) > 0),
  color      text not null default 'slate',
  goal       text not null default '',
  sort_order int not null default 0,
  unique (id, cycle_id, user_id),
  foreign key (cycle_id, user_id) references public.learning_cycles (id, user_id) on delete cascade
);
create index learning_tracks_cycle_idx on public.learning_tracks (cycle_id, sort_order);

create table public.learning_weeks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  cycle_id    uuid not null,
  track_id    uuid not null,
  week_number int not null check (week_number between 1 and 12),
  topic       text not null default '',
  source      text not null default '',
  unique (track_id, week_number),
  unique (id, cycle_id, user_id),
  foreign key (cycle_id, user_id) references public.learning_cycles (id, user_id) on delete cascade,
  -- Jalur harus milik siklus yang sama.
  foreign key (track_id, cycle_id, user_id) references public.learning_tracks (id, cycle_id, user_id) on delete cascade
);
create index learning_weeks_cycle_idx on public.learning_weeks (cycle_id, week_number);

create table public.learning_tactics (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- null = taktik tetap (tidak terikat jalur).
  week_id     uuid,
  cycle_id    uuid not null,
  week_number int not null check (week_number between 1 and 12),
  label       text not null check (length(trim(label)) > 0),
  done        boolean not null default false,
  done_at     timestamptz,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  foreign key (cycle_id, user_id) references public.learning_cycles (id, user_id) on delete cascade,
  foreign key (week_id, cycle_id, user_id) references public.learning_weeks (id, cycle_id, user_id) on delete cascade
);
create index learning_tactics_cycle_week_idx on public.learning_tactics (cycle_id, week_number);
create index learning_tactics_week_idx on public.learning_tactics (week_id);

create trigger learning_tactics_done_at
  before insert or update of done on public.learning_tactics
  for each row execute function public.set_tactic_done_at();

create table public.weekly_reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  cycle_id    uuid not null,
  week_number int not null check (week_number between 1 and 12),
  score       int not null check (score between 0 and 100),
  went_well   text not null default '',
  to_improve  text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (cycle_id, week_number),
  foreign key (cycle_id, user_id) references public.learning_cycles (id, user_id) on delete cascade
);

create trigger weekly_reviews_updated_at
  before update on public.weekly_reviews
  for each row execute function public.set_updated_at();

create table public.study_schedule (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  cycle_id uuid not null,
  weekday  int not null check (weekday between 1 and 7),
  -- null = hari review.
  track_id uuid,
  unique (cycle_id, weekday),
  foreign key (cycle_id, user_id) references public.learning_cycles (id, user_id) on delete cascade,
  -- Kalau jalur dihapus, hari itu menjadi hari review (hanya track_id yang dikosongkan).
  foreign key (track_id, cycle_id, user_id) references public.learning_tracks (id, cycle_id, user_id)
    on delete set null (track_id)
);
create index study_schedule_track_idx on public.study_schedule (track_id);

-- ---------------------------------------------------------------------------
-- Catatan (markdown)
-- ---------------------------------------------------------------------------

create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title      text not null default '',
  body       text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_user_idx on public.notes (user_id, sort_order);

create trigger notes_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: user hanya bisa membaca dan menulis datanya sendiri.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'budget_categories', 'budget_months', 'budget_month_items', 'transactions',
    'learning_cycles', 'learning_tracks', 'learning_weeks', 'learning_tactics',
    'weekly_reviews', 'study_schedule', 'notes'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "milik sendiri" on public.%I for all to authenticated '
      'using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t
    );
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end;
$$;
