-- Membuat siklus belajar baru dalam satu transaksi.
--
-- p_mode:
--   'kosong'   : siklus tanpa isi.
--   'struktur' : salin jalur, jadwal, dan taktik tetap dari p_source (tanpa centang).
--   'lengkap'  : seperti 'struktur' ditambah topik, sumber, dan taktik tiap jalur (untuk diulang).
--
-- Siklus yang sedang aktif otomatis berstatus 'selesai' (hanya boleh satu siklus aktif).
-- security invoker: RLS berlaku, jadi p_source milik user lain tidak akan terbaca.

create function public.create_learning_cycle(
  p_name text,
  p_start date,
  p_vision text,
  p_source uuid,
  p_mode text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_cycle_id uuid;
  v_track record;
  v_week record;
  v_new_track_id uuid;
  v_new_week_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Harus login' using errcode = '42501';
  end if;
  if p_mode not in ('kosong', 'struktur', 'lengkap') then
    raise exception 'Mode salin tidak dikenal: %', p_mode using errcode = '22023';
  end if;
  if p_mode <> 'kosong' and not exists (select 1 from public.learning_cycles where id = p_source) then
    raise exception 'Siklus sumber tidak ditemukan' using errcode = 'P0002';
  end if;

  update public.learning_cycles set status = 'selesai' where status = 'aktif';

  insert into public.learning_cycles (name, start_date, vision, status)
  values (p_name, p_start, coalesce(p_vision, ''), 'aktif')
  returning id into v_cycle_id;

  if p_mode = 'kosong' then
    return v_cycle_id;
  end if;

  -- Jalur (beserta isi minggunya kalau mode lengkap) dan jadwal yang memakai jalur itu.
  for v_track in
    select * from public.learning_tracks where cycle_id = p_source order by sort_order
  loop
    insert into public.learning_tracks (cycle_id, name, color, goal, sort_order)
    values (v_cycle_id, v_track.name, v_track.color, v_track.goal, v_track.sort_order)
    returning id into v_new_track_id;

    insert into public.study_schedule (cycle_id, weekday, track_id)
    select v_cycle_id, s.weekday, v_new_track_id
    from public.study_schedule s
    where s.cycle_id = p_source and s.track_id = v_track.id;

    if p_mode = 'lengkap' then
      for v_week in
        select * from public.learning_weeks where track_id = v_track.id order by week_number
      loop
        insert into public.learning_weeks (cycle_id, track_id, week_number, topic, source)
        values (v_cycle_id, v_new_track_id, v_week.week_number, v_week.topic, v_week.source)
        returning id into v_new_week_id;

        insert into public.learning_tactics (week_id, cycle_id, week_number, label, sort_order)
        select v_new_week_id, v_cycle_id, t.week_number, t.label, t.sort_order
        from public.learning_tactics t
        where t.week_id = v_week.id;
      end loop;
    end if;
  end loop;

  -- Hari review (track_id null).
  insert into public.study_schedule (cycle_id, weekday, track_id)
  select v_cycle_id, s.weekday, null
  from public.study_schedule s
  where s.cycle_id = p_source and s.track_id is null;

  -- Taktik tetap, tanpa centang.
  insert into public.learning_tactics (cycle_id, week_number, label, sort_order)
  select v_cycle_id, t.week_number, t.label, t.sort_order
  from public.learning_tactics t
  where t.cycle_id = p_source and t.week_id is null;

  return v_cycle_id;
end;
$$;

revoke execute on function public.create_learning_cycle(text, date, text, uuid, text) from public, anon;
grant execute on function public.create_learning_cycle(text, date, text, uuid, text) to authenticated;
