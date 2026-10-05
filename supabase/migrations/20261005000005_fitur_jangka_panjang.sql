-- Fase 7: fitur jangka panjang.
--
-- * View cycle_week_stats       : jumlah taktik per minggu tiap siklus (riwayat siklus).
-- * View monthly_category_totals: uang keluar per pos per bulan (laporan tahunan, pos yang lewat batas).
-- * Fungsi set_cycle_status     : mengubah status siklus; mengaktifkan satu siklus menutup siklus aktif lain.
-- * Fungsi restore_backup       : mengganti semua data user dengan isi file cadangan, dalam satu transaksi.
--
-- Semua view memakai security_invoker dan semua fungsi security invoker, jadi RLS tetap berlaku.

-- ---------------------------------------------------------------------------
-- Statistik siklus
-- ---------------------------------------------------------------------------

create view public.cycle_week_stats
with (security_invoker = on)
as
select
  t.user_id,
  t.cycle_id,
  t.week_number,
  count(*)::int as total,
  (count(*) filter (where t.done))::int as done
from public.learning_tactics t
group by t.user_id, t.cycle_id, t.week_number;

revoke all on public.cycle_week_stats from anon;
grant select on public.cycle_week_stats to authenticated;

-- ---------------------------------------------------------------------------
-- Total per pos per bulan
-- ---------------------------------------------------------------------------

create view public.monthly_category_totals
with (security_invoker = on)
as
select
  t.user_id,
  date_trunc('month', t.date::timestamp)::date as month,
  t.category_id,
  sum(t.amount)::bigint as total_out
from public.transactions t
where t.type = 'keluar' and t.category_id is not null
group by t.user_id, date_trunc('month', t.date::timestamp), t.category_id;

revoke all on public.monthly_category_totals from anon;
grant select on public.monthly_category_totals to authenticated;

-- ---------------------------------------------------------------------------
-- Status siklus
-- ---------------------------------------------------------------------------

create function public.set_cycle_status(p_cycle uuid, p_status text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Harus login' using errcode = '42501';
  end if;
  if p_status not in ('aktif', 'selesai', 'arsip') then
    raise exception 'Status tidak dikenal: %', p_status using errcode = '22023';
  end if;
  if not exists (select 1 from public.learning_cycles where id = p_cycle) then
    raise exception 'Siklus tidak ditemukan' using errcode = 'P0002';
  end if;

  -- Hanya boleh satu siklus aktif.
  if p_status = 'aktif' then
    update public.learning_cycles set status = 'selesai' where status = 'aktif' and id <> p_cycle;
  end if;

  update public.learning_cycles set status = p_status where id = p_cycle;
end;
$$;

revoke execute on function public.set_cycle_status(uuid, text) from public, anon;
grant execute on function public.set_cycle_status(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Pulihkan dari cadangan
-- ---------------------------------------------------------------------------
--
-- p_data adalah isi file cadangan dari aplikasi:
--   { "format": "ulul-hub-backup", "version": 1, "exported_at": "...", "tables": { "<tabel>": [ {...}, ... ] } }
--
-- Semua data user yang sedang login DIHAPUS lalu diganti isi cadangan. Karena berjalan dalam satu
-- transaksi, kalau ada satu baris yang gagal, tidak ada yang berubah sama sekali.
-- user_id di file diabaikan: semua baris menjadi milik user yang sedang login, jadi cadangan bisa
-- dipulihkan ke akun/project baru. id baris dipertahankan supaya relasi antar tabel tetap utuh.

create function public.restore_backup(p_data jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tables jsonb := p_data -> 'tables';
begin
  if auth.uid() is null then
    raise exception 'Harus login' using errcode = '42501';
  end if;
  if p_data ->> 'format' is distinct from 'ulul-hub-backup' or (p_data ->> 'version')::int is distinct from 1 then
    raise exception 'File bukan cadangan Ulul Hub versi 1' using errcode = '22023';
  end if;
  if jsonb_typeof(v_tables) is distinct from 'object' then
    raise exception 'Cadangan tidak berisi tabel' using errcode = '22023';
  end if;

  -- Hapus data lama (anak ikut terhapus lewat on delete cascade).
  delete from public.transactions where user_id = auth.uid();
  delete from public.budget_months where user_id = auth.uid();
  delete from public.budget_categories where user_id = auth.uid();
  delete from public.learning_cycles where user_id = auth.uid();
  delete from public.notes where user_id = auth.uid();

  -- Keuangan
  insert into public.budget_categories (id, name, type, sort_order, archived_at, created_at)
  select id, name, type, coalesce(sort_order, 0), archived_at, coalesce(created_at, now())
  from jsonb_populate_recordset(null::public.budget_categories, coalesce(v_tables -> 'budget_categories', '[]'));

  insert into public.budget_months (id, month, income, created_at)
  select id, month, coalesce(income, 0), coalesce(created_at, now())
  from jsonb_populate_recordset(null::public.budget_months, coalesce(v_tables -> 'budget_months', '[]'));

  insert into public.budget_month_items (id, budget_month_id, category_id, amount)
  select id, budget_month_id, category_id, coalesce(amount, 0)
  from jsonb_populate_recordset(null::public.budget_month_items, coalesce(v_tables -> 'budget_month_items', '[]'));

  insert into public.transactions (id, date, type, category_id, income_source, amount, note, created_at, updated_at)
  select id, date, type, category_id, income_source, amount, coalesce(note, ''),
         coalesce(created_at, now()), coalesce(updated_at, now())
  from jsonb_populate_recordset(null::public.transactions, coalesce(v_tables -> 'transactions', '[]'));

  -- Rencana belajar
  insert into public.learning_cycles (id, name, start_date, vision, status, created_at)
  select id, name, start_date, coalesce(vision, ''), coalesce(status, 'selesai'), coalesce(created_at, now())
  from jsonb_populate_recordset(null::public.learning_cycles, coalesce(v_tables -> 'learning_cycles', '[]'));

  insert into public.learning_tracks (id, cycle_id, name, color, goal, sort_order)
  select id, cycle_id, name, coalesce(color, 'slate'), coalesce(goal, ''), coalesce(sort_order, 0)
  from jsonb_populate_recordset(null::public.learning_tracks, coalesce(v_tables -> 'learning_tracks', '[]'));

  insert into public.learning_weeks (id, cycle_id, track_id, week_number, topic, source)
  select id, cycle_id, track_id, week_number, coalesce(topic, ''), coalesce(source, '')
  from jsonb_populate_recordset(null::public.learning_weeks, coalesce(v_tables -> 'learning_weeks', '[]'));

  insert into public.learning_tactics (id, week_id, cycle_id, week_number, label, done, done_at, sort_order, created_at)
  select id, week_id, cycle_id, week_number, label, coalesce(done, false), done_at, coalesce(sort_order, 0),
         coalesce(created_at, now())
  from jsonb_populate_recordset(null::public.learning_tactics, coalesce(v_tables -> 'learning_tactics', '[]'));

  insert into public.weekly_reviews (id, cycle_id, week_number, score, went_well, to_improve, created_at, updated_at)
  select id, cycle_id, week_number, score, coalesce(went_well, ''), coalesce(to_improve, ''),
         coalesce(created_at, now()), coalesce(updated_at, now())
  from jsonb_populate_recordset(null::public.weekly_reviews, coalesce(v_tables -> 'weekly_reviews', '[]'));

  insert into public.study_schedule (id, cycle_id, weekday, track_id)
  select id, cycle_id, weekday, track_id
  from jsonb_populate_recordset(null::public.study_schedule, coalesce(v_tables -> 'study_schedule', '[]'));

  -- Catatan
  insert into public.notes (id, title, body, sort_order, created_at, updated_at)
  select id, coalesce(title, ''), coalesce(body, ''), coalesce(sort_order, 0),
         coalesce(created_at, now()), coalesce(updated_at, now())
  from jsonb_populate_recordset(null::public.notes, coalesce(v_tables -> 'notes', '[]'));
end;
$$;

revoke execute on function public.restore_backup(jsonb) from public, anon;
grant execute on function public.restore_backup(jsonb) to authenticated;
