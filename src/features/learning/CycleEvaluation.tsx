import { Link } from 'react-router'
import { Card } from '../../components/ui'
import type { CycleDetail } from '../../db/learning'
import { cycleStats, tacticProgress } from '../../lib/learning'
import { TARGET_SCORE } from '../../lib/scoring'
import { trackColor } from './colors'
import { scoreInfo } from './score'

/** Halaman minggu ke-13: ringkasan siklus dan ajakan merencanakan siklus berikutnya. */
export function CycleEvaluation({ detail, ended }: { detail: CycleDetail; ended: boolean }) {
  const stats = cycleStats(
    detail.tactics.map((t) => ({ weekNumber: t.week_number, done: t.done })),
    TARGET_SCORE,
  )
  const avg = scoreInfo(stats.average)
  const reviews = new Map(detail.reviews.map((r) => [r.week_number, r]))

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Evaluasi siklus</h2>
          <p className="text-sm text-muted">
            {ended
              ? 'Siklus ini sudah berakhir. Lihat hasilnya, lalu mulai siklus berikutnya.'
              : 'Minggu ke-13: istirahat, evaluasi, dan rencanakan siklus berikutnya.'}
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-surface-2 px-3 py-2">
            <dt className="text-xs text-muted">Rata-rata skor</dt>
            <dd className={`num text-xl font-semibold ${avg?.text ?? ''}`}>{stats.average === null ? '–' : `${stats.average}%`}</dd>
          </div>
          <div className="rounded-xl bg-surface-2 px-3 py-2">
            <dt className="text-xs text-muted">Taktik selesai</dt>
            <dd className="num text-xl font-semibold">
              {stats.done}/{stats.total}
            </dd>
          </div>
          <div className="rounded-xl bg-surface-2 px-3 py-2">
            <dt className="text-xs text-muted">Minggu ≥ {TARGET_SCORE}%</dt>
            <dd className="num text-xl font-semibold">{stats.weeksOnTarget}/12</dd>
          </div>
        </dl>
        <Link
          to="/belajar/siklus-baru"
          className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white dark:text-slate-950"
        >
          Buat siklus berikutnya
        </Link>
      </Card>

      <Card>
        <h3 className="mb-3 font-semibold">Per jalur</h3>
        <ul className="space-y-2">
          {detail.tracks.map((track) => {
            const weekIds = new Set(detail.weeks.filter((w) => w.track_id === track.id).map((w) => w.id))
            const p = tacticProgress(detail.tactics.filter((t) => t.week_id !== null && weekIds.has(t.week_id)))
            return (
              <li key={track.id} className="flex items-center gap-2 text-sm">
                <span className={`size-2.5 rounded-full ${trackColor(track.color).dot}`} />
                <span className="flex-1">{track.name}</span>
                <span className="num text-muted">
                  {p.done}/{p.total} {p.score !== null && `· ${p.score}%`}
                </span>
              </li>
            )
          })}
        </ul>
      </Card>

      <Card>
        <h3 className="mb-3 font-semibold">Skor dan review per minggu</h3>
        <ol className="divide-y divide-border">
          {stats.weekly.map((score, i) => {
            const info = scoreInfo(score)
            const review = reviews.get(i + 1)
            return (
              <li key={i} className="py-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">Minggu {i + 1}</span>
                  <span className={`num ${info?.text ?? 'text-muted'}`}>{score === null ? '–' : `${score}%`}</span>
                </div>
                {review && (review.went_well || review.to_improve) && (
                  <div className="mt-1 space-y-0.5 text-xs text-muted">
                    {review.went_well && <p>+ {review.went_well}</p>}
                    {review.to_improve && <p>→ {review.to_improve}</p>}
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </Card>
    </div>
  )
}
