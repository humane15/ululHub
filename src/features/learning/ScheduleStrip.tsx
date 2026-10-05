import { Link } from 'react-router'
import type { LearningTrack, StudySchedule } from '../../db/types'
import { namaHari } from '../../lib/dates'
import { trackColor } from './colors'

/** Jadwal 7 hari; hari ini ditandai. */
export function ScheduleStrip({
  schedule,
  tracks,
  todayWeekday,
}: {
  schedule: readonly StudySchedule[]
  tracks: readonly LearningTrack[]
  todayWeekday: number
}) {
  const byDay = new Map(schedule.map((s) => [s.weekday, s]))
  const trackById = new Map(tracks.map((t) => [t.id, t]))

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Jadwal harian</h2>
        <Link to="/belajar/atur#jadwal" className="text-xs font-medium text-primary">
          Ubah
        </Link>
      </div>
      <ol className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 7 }, (_, i) => {
          const weekday = i + 1
          const entry = byDay.get(weekday)
          const track = entry?.track_id ? trackById.get(entry.track_id) : undefined
          const label = !entry ? 'Libur' : track ? track.name : 'Review'
          const today = weekday === todayWeekday
          return (
            <li
              key={weekday}
              className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-center ${
                today ? 'bg-primary-soft ring-2 ring-primary' : 'bg-surface-2'
              }`}
              aria-current={today ? 'date' : undefined}
            >
              <span className={`text-[11px] ${today ? 'font-semibold text-primary' : 'text-muted'}`}>
                {namaHari(weekday).slice(0, 3)}
              </span>
              <span className={`size-2 rounded-full ${track ? trackColor(track.color).dot : entry ? 'bg-text/50' : 'bg-border'}`} />
              <span className="w-full truncate text-[11px] font-medium" title={label}>
                {label}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
