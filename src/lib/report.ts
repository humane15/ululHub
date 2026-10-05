import { summaryFromTotals, type CategoryType, type MonthSummary } from './budget'
import { addMonths, makeISODate, monthStart, parseISODate, type ISODate } from './dates'
import { sumRupiah } from './money'

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

// ---------- Laporan tahunan ----------

export interface MonthSummaryPoint {
  month: ISODate
  summary: MonthSummary
}

/** 12 bulan satu tahun (Januari..Desember). Bulan tanpa transaksi bernilai 0. */
export function yearMonths(totals: readonly MonthTotalsLike[], year: number): MonthSummaryPoint[] {
  const byMonth = new Map(totals.map((t) => [monthStart(t.month), t]))
  return Array.from({ length: 12 }, (_, i) => {
    const month = makeISODate(year, i + 1, 1)
    const t = byMonth.get(month)
    return { month, summary: summaryFromTotals({ income: t?.income ?? 0, totalOut: t?.totalOut ?? 0, saved: t?.saved ?? 0 }) }
  })
}

/** Ringkasan satu tahun penuh (jumlah semua bulan di tahun itu). */
export function yearSummary(totals: readonly MonthTotalsLike[], year: number): MonthSummary {
  const inYear = totals.filter((t) => parseISODate(t.month).year === year)
  return summaryFromTotals({
    income: sumRupiah(inYear.map((t) => t.income)),
    totalOut: sumRupiah(inYear.map((t) => t.totalOut)),
    saved: sumRupiah(inYear.map((t) => t.saved)),
  })
}

/** Tahun yang bisa dipilih: semua tahun yang punya data ditambah tahun ini, terbaru dulu. */
export function availableYears(totals: readonly MonthTotalsLike[], currentYear: number): number[] {
  const years = new Set(totals.map((t) => parseISODate(t.month).year))
  years.add(currentYear)
  return [...years].sort((a, b) => b - a)
}

export interface SavingsPoint {
  month: ISODate
  /** Setoran bulan itu. */
  saved: number
  /** Akumulasi setoran sejak bulan pertama. */
  total: number
}

/**
 * Total tabungan berjalan: akumulasi setoran tabungan sejak bulan pertama yang punya data
 * sampai `endMonth`. Bulan kosong di tengah tetap muncul (setoran 0) supaya grafik tidak melompat.
 */
export function cumulativeSavings(totals: readonly MonthTotalsLike[], endMonth: ISODate): SavingsPoint[] {
  const end = monthStart(endMonth)
  const byMonth = new Map<ISODate, number>()
  for (const t of totals) {
    const m = monthStart(t.month)
    if (m <= end) byMonth.set(m, (byMonth.get(m) ?? 0) + t.saved)
  }
  if (byMonth.size === 0) return []
  const first = [...byMonth.keys()].sort()[0]!
  const points: SavingsPoint[] = []
  let total = 0
  for (let month = first; month <= end; month = addMonths(month, 1)) {
    const saved = byMonth.get(month) ?? 0
    total = sumRupiah([total, saved])
    points.push({ month, saved, total })
  }
  return points
}

export interface CategoryMonthAmount {
  /** Tanggal 1. */
  month: ISODate
  categoryId: string
  amount: number
}

export interface OverBudgetCount {
  categoryId: string
  /** Bulan-bulan (tanggal 1) saat pos ini lewat batas, urut lama -> baru. */
  months: ISODate[]
}

/**
 * Pos pengeluaran yang paling sering lewat batas. Hanya bulan yang punya anggaran (`budgetMonths`)
 * yang dihitung; di bulan itu pos yang terpakai tanpa anggaran dianggap berbatas 0, sama seperti
 * kontrol anggaran. Pos tabungan tidak ikut (logikanya terbalik). Urut: paling sering dulu.
 */
export function overBudgetCounts(
  budgetMonths: ReadonlySet<ISODate>,
  budgets: readonly CategoryMonthAmount[],
  spent: readonly CategoryMonthAmount[],
  categoryTypes: ReadonlyMap<string, CategoryType>,
): OverBudgetCount[] {
  const limit = new Map(budgets.map((b) => [`${monthStart(b.month)}|${b.categoryId}`, b.amount]))
  const result = new Map<string, ISODate[]>()
  for (const s of spent) {
    const month = monthStart(s.month)
    if (!budgetMonths.has(month) || categoryTypes.get(s.categoryId) === 'tabungan') continue
    if (s.amount > (limit.get(`${month}|${s.categoryId}`) ?? 0)) {
      const months = result.get(s.categoryId) ?? []
      months.push(month)
      result.set(s.categoryId, months)
    }
  }
  return [...result]
    .map(([categoryId, months]) => ({ categoryId, months: months.sort() }))
    .sort((a, b) => b.months.length - a.months.length || a.categoryId.localeCompare(b.categoryId))
}

export interface YearComparison {
  current: MonthSummary
  previous: MonthSummary
  /** Selisih tahun ini - tahun lalu. */
  diff: { income: number; spending: number; saved: number }
}

export function compareYears(totals: readonly MonthTotalsLike[], year: number): YearComparison {
  const current = yearSummary(totals, year)
  const previous = yearSummary(totals, year - 1)
  return {
    current,
    previous,
    diff: {
      income: current.income - previous.income,
      spending: current.spending - previous.spending,
      saved: current.saved - previous.saved,
    },
  }
}
