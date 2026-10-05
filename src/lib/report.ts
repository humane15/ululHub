import { addMonths, monthStart, type ISODate } from './dates'
import { summaryFromTotals } from './budget'

export interface MonthTotalsLike {
  /** Tanggal 1. */
  month: ISODate
  income: number
  totalOut: number
  saved: number
}

export interface MonthlyPoint {
  month: ISODate
  income: number
  spending: number
  saved: number
}

/** `n` bulan terakhir sampai `endMonth` (urut lama -> baru). Bulan tanpa transaksi bernilai 0. */
export function monthlySeries(totals: readonly MonthTotalsLike[], endMonth: ISODate, n: number): MonthlyPoint[] {
  const byMonth = new Map(totals.map((t) => [monthStart(t.month), t]))
  const end = monthStart(endMonth)
  return Array.from({ length: n }, (_, i) => {
    const month = addMonths(end, i - (n - 1))
    const t = byMonth.get(month)
    const s = summaryFromTotals({ income: t?.income ?? 0, totalOut: t?.totalOut ?? 0, saved: t?.saved ?? 0 })
    return { month, income: s.income, spending: s.spending, saved: s.saved }
  })
}
