import { CYCLE_WEEKS } from '../../lib/dates'
import type { WeekView } from '../../lib/learning'
import { scoreInfo } from './score'

/** Pemilih minggu 1..12 + evaluasi. Titik warna = skor minggu itu. */
export function WeekPicker({
  view,
  onChange,
  scores,
  currentWeek,
  elapsedWeeks,
}: {
  view: WeekView
  onChange: (view: WeekView) => void
  scores: readonly (number | null)[]
  /** Minggu berjalan menurut tanggal hari ini (13 = evaluasi), null kalau di luar siklus. */
  currentWeek: number | null
  /** Minggu yang sudah/sedang berjalan; minggu sesudahnya tidak diberi warna status. */
  elapsedWeeks: number
}) {
  const chip = (selected: boolean, current: boolean) =>
    `relative flex h-12 min-w-11 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border px-2 text-sm font-medium ${
      selected ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-surface hover:bg-surface-2'
    } ${current && !selected ? 'ring-2 ring-primary/40' : ''}`

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0" role="tablist" aria-label="Pilih minggu">
      <div className="flex gap-1.5">
        {Array.from({ length: CYCLE_WEEKS }, (_, i) => {
          const week = i + 1
          const info = week <= elapsedWeeks ? scoreInfo(scores[i] ?? null) : null
          const selected = view.kind === 'minggu' && view.week === week
          return (
            <button
              key={week}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-label={`Minggu ${week}${info ? `, skor ${scores[i]}%` : week > elapsedWeeks ? ', belum berjalan' : ''}${currentWeek === week ? ', minggu ini' : ''}`}
              className={chip(selected, currentWeek === week)}
              onClick={() => onChange({ kind: 'minggu', week })}
            >
              <span className="num leading-none">{week}</span>
              <span className={`size-1.5 rounded-full ${info ? info.bg : 'bg-border'}`} aria-hidden="true" />
            </button>
          )
        })}
        <button
          type="button"
          role="tab"
          aria-selected={view.kind === 'evaluasi'}
          className={`${chip(view.kind === 'evaluasi', currentWeek === 13)} px-3`}
          onClick={() => onChange({ kind: 'evaluasi' })}
        >
          <span className="leading-none">Evaluasi</span>
          <span className="num text-[10px] leading-none text-muted">13</span>
        </button>
      </div>
    </div>
  )
}
