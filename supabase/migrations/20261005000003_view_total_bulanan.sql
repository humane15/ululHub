-- Total per bulan untuk laporan, dihitung di database supaya aplikasi
-- tidak perlu memuat semua transaksi.
-- security_invoker: view berjalan sebagai user yang memanggil, jadi RLS tabel asal tetap berlaku.

create view public.monthly_totals
with (security_invoker = on)
as
select
  t.user_id,
  date_trunc('month', t.date::timestamp)::date as month,
  coalesce(sum(t.amount) filter (where t.type = 'masuk'), 0)::bigint as income,
  coalesce(sum(t.amount) filter (where t.type = 'keluar'), 0)::bigint as total_out,
  coalesce(sum(t.amount) filter (where t.type = 'keluar' and c.type = 'tabungan'), 0)::bigint as saved,
  count(*)::int as transaction_count
from public.transactions t
left join public.budget_categories c on c.id = t.category_id
group by t.user_id, date_trunc('month', t.date::timestamp);

revoke all on public.monthly_totals from anon;
grant select on public.monthly_totals to authenticated;
