import { Card, ProgressBar } from '../../components/ui'
import type { TacticProgress } from '../../lib/learning'
import { TARGET_SCORE } from '../../lib/scoring'
import { scoreInfo } from './score'

export function ScoreCard({
  progress,
  title = 'Skor eksekusi',
  upcoming = false,
}: {
  progress: TacticProgress
  title?: string
  /** Minggu belum berjalan: tampil netral, tanpa status merah/kuning/hijau. */
  upcoming?: boolean
}) {
  const info = upcoming ? null : scoreInfo(progress.score)
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{title}</p>
          <p className={`num mt-1 text-3xl font-semibold ${info?.text ?? 'text-muted'}`}>
            {progress.score === null ? '–' : `${progress.score}%`}
          </p>
        </div>
        <div className="text-right text-sm">
          {info && <p className={`font-medium ${info.text}`}>{info.label}</p>}
          {upcoming && <p className="font-medium text-muted">Belum berjalan</p>}
          <p className="num text-muted">
            {progress.done}/{progress.total} taktik
          </p>
          <p className="num text-xs text-muted">Target {TARGET_SCORE}%</p>
        </div>
      </div>
      <div className="relative mt-3">
        <ProgressBar valueBp={(progress.score ?? 0) * 100} tone={info?.tone ?? 'ok'} label={title} />
        {/* Penanda target */}
        <span className="absolute -top-1 h-4 w-0.5 rounded bg-text/60" style={{ left: `${TARGET_SCORE}%` }} aria-hidden="true" />
      </div>
    </Card>
  )
}
