import { describe, expect, it } from 'vitest'
import { cycleHistoryStats, cycleStats, initialWeekView, nextSortOrder, scoreSeries, tacticProgress } from './learning'

describe('initialWeekView', () => {
  it('mengikuti posisi siklus', () => {
    expect(initialWeekView({ kind: 'belum_mulai', daysUntilStart: 3 })).toEqual({ kind: 'minggu', week: 1 })
    expect(initialWeekView({ kind: 'minggu', week: 7 })).toEqual({ kind: 'minggu', week: 7 })
    expect(initialWeekView({ kind: 'evaluasi' })).toEqual({ kind: 'evaluasi' })
    expect(initialWeekView({ kind: 'selesai', daysSinceEnd: 10 })).toEqual({ kind: 'evaluasi' })
  })
})

describe('tacticProgress', () => {
  it('menghitung selesai, total, skor', () => {
    expect(tacticProgress([{ done: true }, { done: false }, { done: true }])).toEqual({ done: 2, total: 3, score: 67 })
    expect(tacticProgress([])).toEqual({ done: 0, total: 0, score: null })
  })
})

describe('cycleStats', () => {
  it('rata-rata dan minggu yang mencapai target', () => {
    const tactics = [
      { weekNumber: 1, done: true },
      { weekNumber: 1, done: true },
      { weekNumber: 2, done: true },
      { weekNumber: 2, done: false },
    ]
    const stats = cycleStats(tactics, 85)
    expect(stats.weekly.slice(0, 3)).toEqual([100, 50, null])
    expect(stats.weekly).toHaveLength(12)
    expect(stats.average).toBe(75)
    expect(stats.weeksOnTarget).toBe(1)
    expect(stats.done).toBe(3)
    expect(stats.total).toBe(4)
  })
})

describe('nextSortOrder', () => {
  it('max + 1, mulai dari 1', () => {
    expect(nextSortOrder([])).toBe(1)
    expect(nextSortOrder([{ sort_order: 3 }, { sort_order: 100 }])).toBe(101)
  })
})

describe('scoreSeries', () => {
  it('minggu yang belum berjalan dikosongkan', () => {
    const weekly = [80, 90, null, 50, ...new Array<number | null>(8).fill(0)]
    const series = scoreSeries(weekly, 4)
    expect(series).toHaveLength(12)
    expect(series.slice(0, 5)).toEqual([
      { week: 1, score: 80 },
      { week: 2, score: 90 },
      { week: 3, score: null },
      { week: 4, score: 50 },
      { week: 5, score: null },
    ])
  })
})

describe('cycleHistoryStats', () => {
  it('rata-rata skor, total taktik, dan minggu tercapai per siklus', () => {
    const stats = cycleHistoryStats(
      [
        { cycleId: 'a', weekNumber: 1, total: 4, done: 4 },
        { cycleId: 'a', weekNumber: 2, total: 4, done: 2 },
        { cycleId: 'a', weekNumber: 3, total: 0, done: 0 },
        { cycleId: 'b', weekNumber: 1, total: 3, done: 0 },
        { cycleId: 'b', weekNumber: 13, total: 9, done: 9 }, // di luar 1..12 diabaikan
      ],
      85,
    )
    expect(stats.get('a')).toEqual({ average: 75, done: 6, total: 8, weeksOnTarget: 1 })
    expect(stats.get('b')).toEqual({ average: 0, done: 0, total: 3, weeksOnTarget: 0 })
    expect(stats.has('c')).toBe(false)
  })
})
