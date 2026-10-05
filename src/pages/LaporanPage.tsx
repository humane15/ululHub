import { Link } from 'react-router'
import { Card, EmptyState, ErrorMessage, PageHeader } from '../components/ui'
import { listMonthlyTotals } from '../db/finance'
import { useQuery } from '../db/useQuery'
import { summaryFromTotals } from '../lib/budget'
import { formatBulan, toMonthParam } from '../lib/dates'
import { formatPercentBp, formatRupiah } from '../lib/money'

export default function LaporanPage() {
  const query = useQuery(listMonthlyTotals, [])
  const rows = (query.data ?? []).map((t) => ({
    month: t.month,
    summary: summaryFromTotals({ income: t.income, totalOut: t.total_out, saved: t.saved }),
  }))

  return (
    <>
      <PageHeader title="Laporan" subtitle="Ringkasan setiap bulan" />
      {query.error && <ErrorMessage error={query.error} onRetry={query.reload} />}
      {!query.data && !query.error && <p className="text-sm text-muted">Memuat…</p>}
      {query.data && rows.length === 0 && (
        <EmptyState title="Belum ada laporan." description="Laporan muncul setelah ada transaksi yang tercatat." />
      )}
      {rows.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-muted">
              <tr className="border-b border-border">
                <th className="px-4 py-3 font-medium">Bulan</th>
                <th className="px-4 py-3 text-right font-medium">Pemasukan</th>
                <th className="px-4 py-3 text-right font-medium">Pengeluaran</th>
                <th className="px-4 py-3 text-right font-medium">Ditabung</th>
                <th className="px-4 py-3 text-right font-medium">Sisa</th>
                <th className="px-4 py-3 text-right font-medium">Rasio tabungan</th>
              </tr>
            </thead>
            <tbody className="num divide-y divide-border">
              {rows.map(({ month, summary }) => (
                <tr key={month} className="hover:bg-surface-2">
                  <td className="px-4 py-3 font-sans">
                    <Link to={`/keuangan?bulan=${toMonthParam(month)}`} className="font-medium text-primary">
                      {formatBulan(month)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">{formatRupiah(summary.income)}</td>
                  <td className="px-4 py-3 text-right">{formatRupiah(summary.spending)}</td>
                  <td className="px-4 py-3 text-right">{formatRupiah(summary.saved)}</td>
                  <td className={`px-4 py-3 text-right ${summary.remaining < 0 ? 'text-bad' : ''}`}>
                    {formatRupiah(summary.remaining)}
                  </td>
                  <td className="px-4 py-3 text-right">{formatPercentBp(summary.savingsRatioBp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  )
}
