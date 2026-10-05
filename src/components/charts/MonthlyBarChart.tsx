import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { parseISODate } from '../../lib/dates'
import type { MonthlyPoint } from '../../lib/report'
import { formatRupiah, formatRupiahCompact } from '../../lib/money'
import { ChartTooltip } from './ChartTooltip'
import { useChartColors } from './useChartColors'

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

const SERIES = [
  { key: 'income', label: 'Pemasukan' },
  { key: 'spending', label: 'Pengeluaran' },
  { key: 'saved', label: 'Ditabung' },
] as const

function monthLabel(month: string): string {
  const { year, month: m } = parseISODate(month)
  return `${BULAN[m - 1]} ${String(year).slice(2)}`
}

/** Grafik batang per bulan: pemasukan, pengeluaran, ditabung. */
export default function MonthlyBarChart({ data }: { data: readonly MonthlyPoint[] }) {
  const c = useChartColors()
  return (
    <figure>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Legenda">
        {SERIES.map((s, i) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: (c.series[i] ?? c.muted) }} aria-hidden="true" />
            {s.label}
          </li>
        ))}
      </ul>
      <div className="h-64" role="img" aria-label="Grafik pemasukan, pengeluaran, dan tabungan 6 bulan terakhir. Angka lengkap ada di tabel.">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...data]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={2} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke={c.grid} />
            <XAxis
              dataKey="month"
              tickFormatter={monthLabel}
              tickLine={false}
              axisLine={{ stroke: c.grid }}
              tick={{ fill: c.muted, fontSize: 11 }}
            />
            <YAxis
              tickFormatter={formatRupiahCompact}
              tickLine={false}
              axisLine={false}
              width={52}
              tick={{ fill: c.muted, fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: c.grid, opacity: 0.5 }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <ChartTooltip
                    title={monthLabel(String(label))}
                    rows={SERIES.map((s, i) => ({
                      label: s.label,
                      value: formatRupiah(Number((payload[0]!.payload as MonthlyPoint)[s.key])),
                      color: (c.series[i] ?? c.muted),
                    }))}
                  />
                ) : null
              }
            />
            {SERIES.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={(c.series[i] ?? c.muted)} maxBarSize={16} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}
