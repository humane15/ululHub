import { Card } from '../../components/ui'
import type { MonthSummary } from '../../lib/budget'
import { formatPercentBp, formatRupiah } from '../../lib/money'

export function MonthSummaryCard({ summary }: { summary: MonthSummary }) {
  const stats = [
    { label: 'Pemasukan', value: formatRupiah(summary.income) },
    { label: 'Pengeluaran', value: formatRupiah(summary.spending) },
    { label: 'Ditabung', value: formatRupiah(summary.saved) },
    { label: 'Rasio tabungan', value: formatPercentBp(summary.savingsRatioBp) },
  ]
  return (
    <Card>
      <p className="text-sm text-muted">Sisa uang</p>
      <p className={`num mt-1 text-3xl font-semibold tracking-tight ${summary.remaining < 0 ? 'text-bad' : ''}`}>
        {formatRupiah(summary.remaining)}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-surface-2 px-3 py-2">
            <dt className="text-xs text-muted">{s.label}</dt>
            <dd className="num mt-0.5 text-sm font-medium">{s.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
