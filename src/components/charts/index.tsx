import { lazy, Suspense, type ComponentProps } from 'react'

// Recharts cukup besar; dimuat terpisah hanya saat grafik ditampilkan.
const MonthlyBarChart = lazy(() => import('./MonthlyBarChart'))
const ScoreLineChart = lazy(() => import('./ScoreLineChart'))

function Placeholder({ height }: { height: string }) {
  return <div className={`${height} animate-pulse rounded-xl bg-surface-2`} aria-hidden="true" />
}

export function LazyMonthlyBarChart(props: ComponentProps<typeof MonthlyBarChart>) {
  return (
    <Suspense fallback={<Placeholder height="h-72" />}>
      <MonthlyBarChart {...props} />
    </Suspense>
  )
}

export function LazyScoreLineChart(props: ComponentProps<typeof ScoreLineChart>) {
  return (
    <Suspense fallback={<Placeholder height="h-56" />}>
      <ScoreLineChart {...props} />
    </Suspense>
  )
}
