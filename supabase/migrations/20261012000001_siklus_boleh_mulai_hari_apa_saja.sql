-- Siklus belajar boleh dimulai di hari apa saja (mis. Selasa), tidak harus Senin.
-- Aplikasi menghitung minggu ke-n dari start_date + 7 hari, jadi minggu mengikuti hari mulai.
alter table public.learning_cycles drop constraint if exists learning_cycles_start_date_check;
