import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { parseISODate } from '../../lib/dates'
import { formatRupiah, formatRupiahCompact } from '../../lib/money'
import type { SavingsPoint } from '../../lib/report'
import { ChartTooltip } from './ChartTooltip'
import { useChartColors } from './useChartColors'

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function monthLabel(month: string): string {
  const { year, month: m } = parseISODate(month)
  return `${BULAN[m - 1]} ${String(year).slice(2)}`
}

/** Grafik area total tabungan berjalan. Satu seri, jadi tanpa kotak legenda. */
export default function SavingsGrowthChart({ data }: { data: readonly SavingsPoint[] }) {
  const c = useChartColors()
  const color = c.series[2]
  return (
    <div className="h-56" role="img" aria-label="Grafik pertumbuhan total tabungan dari bulan ke bulan">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={[...data]} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={c.grid} />
          <XAxis
            dataKey="month"
            tickFormatter={monthLabel}
            tickLine={false}
            axisLine={{ stroke: c.grid }}
            tick={{ fill: c.muted, fontSize: 11 }}
            minTickGap={16}
          />
          <YAxis
            tickFormatter={formatRupiahCompact}
            tickLine={false}
            axisLine={false}
            width={52}
            tick={{ fill: c.muted, fontSize: 11 }}
          />
          <Tooltip
            cursor={{ stroke: c.muted, strokeWidth: 1 }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as SavingsPoint | undefined
              return active && p ? (
                <ChartTooltip
                  title={monthLabel(p.month)}
                  rows={[
                    { label: 'Total', value: formatRupiah(p.total), color },
                    { label: 'Setoran bulan ini', value: formatRupiah(p.saved), color: c.muted },
                  ]}
                />
              ) : null
            }}
          />
          <Area
            type="linear"
            dataKey="total"
            stroke={color}
            strokeWidth={2}
            fill={color}
            fillOpacity={0.15}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
