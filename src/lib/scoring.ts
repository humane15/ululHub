export const TARGET_SCORE = 85
export const NEAR_SCORE = 60

export type ScoreStatus = 'tercapai' | 'hampir' | 'di_bawah'

/** Skor eksekusi (0..100, dibulatkan) = taktik selesai / total taktik. null kalau belum ada taktik. */
export function executionScore(done: number, total: number): number | null {
  if (!Number.isInteger(done) || !Number.isInteger(total) || done < 0 || total < 0 || done > total) {
    throw new RangeError(`Jumlah taktik tidak valid: ${done}/${total}`)
  }
  if (total === 0) return null
  return Math.round((done * 100) / total)
}

/** tercapai >= 85, hampir 60..84, di_bawah < 60. */
export function scoreStatus(score: number): ScoreStatus {
  if (score >= TARGET_SCORE) return 'tercapai'
  if (score >= NEAR_SCORE) return 'hampir'
  return 'di_bawah'
}

export interface TacticLike {
  weekNumber: number
  done: boolean
}

/** Skor per minggu (indeks 0 = minggu 1). Minggu tanpa taktik bernilai null. */
export function weeklyScores(tactics: readonly TacticLike[], weeks = 12): (number | null)[] {
  const done = new Array<number>(weeks).fill(0)
  const total = new Array<number>(weeks).fill(0)
  for (const t of tactics) {
    const i = t.weekNumber - 1
    if (i < 0 || i >= weeks) continue
    total[i]!++
    if (t.done) done[i]!++
  }
  return total.map((n, i) => executionScore(done[i]!, n))
}

/** Rata-rata skor yang ada (abaikan null), dibulatkan. null kalau tidak ada skor. */
export function averageScore(scores: readonly (number | null)[]): number | null {
  const valid = scores.filter((s): s is number => s !== null)
  if (valid.length === 0) return null
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length)
}
