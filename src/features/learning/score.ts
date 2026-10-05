import { scoreStatus, type ScoreStatus } from '../../lib/scoring'

export const SCORE_LABEL: Record<ScoreStatus, string> = {
  tercapai: 'Tercapai',
  hampir: 'Hampir',
  di_bawah: 'Di bawah target',
}

export const SCORE_TEXT: Record<ScoreStatus, string> = { tercapai: 'text-ok', hampir: 'text-warn', di_bawah: 'text-bad' }
export const SCORE_BG: Record<ScoreStatus, string> = { tercapai: 'bg-ok', hampir: 'bg-warn', di_bawah: 'bg-bad' }
export const SCORE_TONE: Record<ScoreStatus, 'ok' | 'warn' | 'bad'> = { tercapai: 'ok', hampir: 'warn', di_bawah: 'bad' }

export function scoreInfo(score: number | null) {
  if (score === null) return null
  const status = scoreStatus(score)
  return { status, label: SCORE_LABEL[status], text: SCORE_TEXT[status], bg: SCORE_BG[status], tone: SCORE_TONE[status] }
}
