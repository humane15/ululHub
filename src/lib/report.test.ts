import { describe, expect, it } from 'vitest'
import { monthlySeries } from './report'

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
