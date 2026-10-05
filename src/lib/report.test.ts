import { describe, expect, it } from 'vitest'
import {
  availableYears,
  compareYears,
  cumulativeSavings,
  monthlySeries,
  overBudgetCounts,
  yearMonths,
  yearSummary,
} from './report'

describe('monthlySeries', () => {
  it('6 bulan melewati pergantian tahun, bulan kosong = 0', () => {
    const series = monthlySeries(
      [
        { month: '2027-02-01', income: 4_000_000, totalOut: 2_000_000, saved: 1_300_000 },
        { month: '2026-10-01', income: 3_900_000, totalOut: 1_250_000, saved: 1_200_000 },
        { month: '2026-01-01', income: 1, totalOut: 0, saved: 0 }, // di luar rentang
      ],
      '2027-02-15',
      6,
    )
    expect(series.map((p) => p.month)).toEqual([
      '2026-09-01', '2026-10-01', '2026-11-01', '2026-12-01', '2027-01-01', '2027-02-01',
    ])
    expect(series[0]).toEqual({ month: '2026-09-01', income: 0, spending: 0, saved: 0 })
    expect(series[1]).toEqual({ month: '2026-10-01', income: 3_900_000, spending: 50_000, saved: 1_200_000 })
    expect(series[5]!.spending).toBe(700_000)
  })
})

const TOTALS = [
  { month: '2025-12-01', income: 3_500_000, totalOut: 3_000_000, saved: 1_000_000 },
  { month: '2026-01-01', income: 3_900_000, totalOut: 3_400_000, saved: 1_200_000 },
  { month: '2026-03-01', income: 3_900_000, totalOut: 2_000_000, saved: 1_200_000 },
]

describe('yearMonths / yearSummary', () => {
  it('selalu 12 bulan, bulan kosong = 0', () => {
    const months = yearMonths(TOTALS, 2026)
    expect(months).toHaveLength(12)
    expect(months[0]!.month).toBe('2026-01-01')
    expect(months[11]!.month).toBe('2026-12-01')
    expect(months[1]!.summary.income).toBe(0)
    expect(months[1]!.summary.savingsRatioBp).toBeNull()
    expect(months[2]!.summary.spending).toBe(800_000)
  })

  it('ringkasan tahun hanya menjumlah bulan di tahun itu', () => {
    const s = yearSummary(TOTALS, 2026)
    expect(s.income).toBe(7_800_000)
    expect(s.saved).toBe(2_400_000)
    expect(s.spending).toBe(3_000_000)
    expect(s.remaining).toBe(2_400_000)
    expect(s.savingsRatioBp).toBe(3077)
  })

  it('tahun kabisat tidak memengaruhi daftar bulan', () => {
    expect(yearMonths([], 2028).map((m) => m.month)[1]).toBe('2028-02-01')
  })
})

describe('availableYears', () => {
  it('tahun data + tahun ini, terbaru dulu, tanpa duplikat', () => {
    expect(availableYears(TOTALS, 2027)).toEqual([2027, 2026, 2025])
    expect(availableYears([], 2026)).toEqual([2026])
  })
})

describe('compareYears', () => {
  it('selisih dengan tahun sebelumnya', () => {
    const c = compareYears(TOTALS, 2026)
    expect(c.previous.income).toBe(3_500_000)
    expect(c.diff).toEqual({ income: 4_300_000, spending: 1_000_000, saved: 1_400_000 })
  })
})

describe('cumulativeSavings', () => {
  it('akumulasi melewati pergantian tahun, bulan kosong tetap muncul', () => {
    const points = cumulativeSavings(TOTALS, '2026-04-20')
    expect(points.map((p) => p.month)).toEqual(['2025-12-01', '2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01'])
    expect(points.map((p) => p.total)).toEqual([1_000_000, 2_200_000, 2_200_000, 3_400_000, 3_400_000])
    expect(points[2]!.saved).toBe(0)
  })

  it('bulan setelah endMonth diabaikan; tanpa data = kosong', () => {
    expect(cumulativeSavings(TOTALS, '2026-01-01').at(-1)).toEqual({ month: '2026-01-01', saved: 1_200_000, total: 2_200_000 })
    expect(cumulativeSavings([], '2026-01-01')).toEqual([])
  })
})

describe('overBudgetCounts', () => {
  const types = new Map([
    ['makan', 'kebutuhan' as const],
    ['jajan', 'keinginan' as const],
    ['tabung', 'tabungan' as const],
  ])
  const budgetMonths = new Set(['2026-01-01', '2026-02-01'])
  const budgets = [
    { month: '2026-01-01', categoryId: 'makan', amount: 1_000_000 },
    { month: '2026-01-01', categoryId: 'jajan', amount: 250_000 },
    { month: '2026-01-01', categoryId: 'tabung', amount: 1_200_000 },
    { month: '2026-02-01', categoryId: 'makan', amount: 1_000_000 },
  ]

  it('menghitung bulan lewat batas, paling sering dulu', () => {
    const result = overBudgetCounts(
      budgetMonths,
      budgets,
      [
        { month: '2026-01-01', categoryId: 'makan', amount: 1_000_001 },
        { month: '2026-02-01', categoryId: 'makan', amount: 1_500_000 },
        { month: '2026-01-01', categoryId: 'jajan', amount: 250_000 }, // pas batas = tidak lewat
        { month: '2026-02-01', categoryId: 'jajan', amount: 10_000 }, // tanpa anggaran di bulan itu = batas 0
        { month: '2026-01-01', categoryId: 'tabung', amount: 2_000_000 }, // tabungan tidak dihitung
        { month: '2026-03-01', categoryId: 'makan', amount: 9_000_000 }, // bulan tanpa anggaran
      ],
      types,
    )
    expect(result).toEqual([
      { categoryId: 'makan', months: ['2026-01-01', '2026-02-01'] },
      { categoryId: 'jajan', months: ['2026-02-01'] },
    ])
  })
})
