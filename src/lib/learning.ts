import { CYCLE_WEEKS, type CyclePosition } from './dates'
import { averageScore, executionScore, weeklyScores, type TacticLike } from './scoring'

/** Tampilan halaman Belajar: satu minggu (1..12) atau evaluasi siklus. */
export type WeekView = { kind: 'minggu'; week: number } | { kind: 'evaluasi' }

/** Tampilan awal berdasarkan posisi hari ini di siklus. */
export function initialWeekView(position: CyclePosition): WeekView {
  switch (position.kind) {
    case 'belum_mulai':
      return { kind: 'minggu', week: 1 }
    case 'minggu':
      return { kind: 'minggu', week: position.week }
    case 'evaluasi':
    case 'selesai':
      return { kind: 'evaluasi' }
  }
}

export interface TacticProgress {
  done: number
  total: number
  /** null kalau belum ada taktik. */
  score: number | null
}

export function tacticProgress(tactics: readonly { done: boolean }[]): TacticProgress {
  const done = tactics.filter((t) => t.done).length
  return { done, total: tactics.length, score: executionScore(done, tactics.length) }
}

export interface CycleStats extends TacticProgress {
  /** Skor per minggu, indeks 0 = minggu 1. */
  weekly: (number | null)[]
  /** Rata-rata skor minggu yang punya taktik. */
  average: number | null
  /** Jumlah minggu yang skornya mencapai target. */
  weeksOnTarget: number
}

export function cycleStats(tactics: readonly TacticLike[], target: number): CycleStats {
  const weekly = weeklyScores(tactics, CYCLE_WEEKS)
  return {
    ...tacticProgress(tactics),
    weekly,
    average: averageScore(weekly),
    weeksOnTarget: weekly.filter((s) => s !== null && s >= target).length,
  }
}

/** sort_order berikutnya untuk item baru di akhir daftar. */
export function nextSortOrder(items: readonly { sort_order: number }[]): number {
  return items.reduce((max, i) => Math.max(max, i.sort_order), 0) + 1
}

export interface ScorePoint {
  week: number
  /** null = minggu belum berjalan atau belum ada taktik (garis terputus). */
  score: number | null
}

/** Data grafik skor 12 minggu; minggu setelah `elapsedWeeks` dikosongkan. */
export function scoreSeries(weekly: readonly (number | null)[], elapsedWeeks: number): ScorePoint[] {
  return Array.from({ length: CYCLE_WEEKS }, (_, i) => ({
    week: i + 1,
    score: i < elapsedWeeks ? (weekly[i] ?? null) : null,
  }))
}

export interface WeekStatLike {
  cycleId: string
  weekNumber: number
  total: number
  done: number
}

export interface CycleHistoryStats {
  /** Rata-rata skor minggu yang punya taktik; null kalau belum ada taktik. */
  average: number | null
  done: number
  total: number
  weeksOnTarget: number
}

/** Statistik riwayat per siklus dari jumlah taktik per minggu (view cycle_week_stats). */
export function cycleHistoryStats(stats: readonly WeekStatLike[], target: number): Map<string, CycleHistoryStats> {
  const byCycle = new Map<string, WeekStatLike[]>()
  for (const s of stats) {
    if (s.weekNumber < 1 || s.weekNumber > CYCLE_WEEKS) continue
    const list = byCycle.get(s.cycleId) ?? []
    list.push(s)
    byCycle.set(s.cycleId, list)
  }
  const result = new Map<string, CycleHistoryStats>()
  for (const [cycleId, weeks] of byCycle) {
    const scores = weeks.map((w) => executionScore(w.done, w.total))
    result.set(cycleId, {
      average: averageScore(scores),
      done: weeks.reduce((n, w) => n + w.done, 0),
      total: weeks.reduce((n, w) => n + w.total, 0),
      weeksOnTarget: scores.filter((s) => s !== null && s >= target).length,
    })
  }
  return result
}
