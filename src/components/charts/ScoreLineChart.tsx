import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ScorePoint } from '../../lib/learning'
import { TARGET_SCORE } from '../../lib/scoring'
import { ChartTooltip } from './ChartTooltip'
import { useChartColors } from './useChartColors'

/** Grafik garis skor 12 minggu dengan garis target. Satu seri, jadi tanpa kotak legenda. */
export default function ScoreLineChart({ data }: { data: readonly ScorePoint[] }) {
  const c = useChartColors()
  const color = c.series[0]
  return (
    <div className="h-56" role="img" aria-label={`Grafik skor eksekusi 12 minggu dengan target ${TARGET_SCORE}%`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={[...data]} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={c.grid} />
          <XAxis dataKey="week" tickLine={false} axisLine={{ stroke: c.grid }} tick={{ fill: c.muted, fontSize: 11 }} interval={0} />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tickLine={false}
            axisLine={false}
            width={40}
            tick={{ fill: c.muted, fontSize: 11 }}
          />
          <ReferenceLine
            y={TARGET_SCORE}
            stroke={c.muted}
            strokeWidth={1}
            label={{ value: `Target ${TARGET_SCORE}%`, position: 'insideTopRight', fill: c.muted, fontSize: 11 }}
          />
          <Tooltip
            cursor={{ stroke: c.muted, strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              const score = (payload?.[0]?.payload as ScorePoint | undefined)?.score
              return active && score != null ? (
                <ChartTooltip title={`Minggu ${label}`} rows={[{ label: 'Skor', value: `${score}%`, color }]} />
              ) : null
            }}
          />
          <Line
            type="linear"
            dataKey="score"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            connectNulls={false}
            dot={{ r: 4, fill: color, stroke: c.surface, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: color, stroke: c.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
