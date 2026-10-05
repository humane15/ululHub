import { useState } from 'react'
import { Link } from 'react-router'
import { Card } from '../../components/ui'
import type { CycleDetail } from '../../db/learning'
import type { LearningCycle, LearningTactic } from '../../db/types'
import { cyclePosition, formatTanggal, weekdayIso, type ISODate } from '../../lib/dates'
import { trackColor } from '../learning/colors'
import { TacticList } from '../learning/TacticList'
import type { CycleActions } from '../learning/useCycleActions'

const noop = () => {}

/** Jalur hari ini dan taktik minggu ini yang belum selesai (bisa dicentang langsung). */
export function TodayLearningCard({
  cycle,
  detail,
  today,
  actions,
}: {
  cycle: LearningCycle
  detail: CycleDetail
  today: ISODate
  actions: CycleActions
}) {
  const position = cyclePosition(cycle.start_date, today)
  // Taktik yang dicentang di sini tetap tampil (dicoret) supaya salah ketuk bisa dibatalkan.
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set())
  const toggle = (t: LearningTactic) => {
    setTouched((prev) => new Set(prev).add(t.id))
    void actions.toggleTactic(t)
  }

  if (position.kind !== 'minggu') {
    const text =
      position.kind === 'belum_mulai'
        ? `${cycle.name} mulai ${formatTanggal(cycle.start_date)} (${position.daysUntilStart} hari lagi).`
        : position.kind === 'evaluasi'
          ? 'Minggu ke-13: waktunya evaluasi dan istirahat.'
          : 'Siklus sudah berakhir. Saatnya membuat siklus berikutnya.'
    return (
      <Card>
        <h2 className="font-semibold">Belajar hari ini</h2>
        <p className="mt-1 text-sm text-muted">{text}</p>
        <Link to={position.kind === 'selesai' ? '/belajar/siklus-baru' : '/belajar'} className="mt-3 inline-block text-sm font-medium text-primary">
          {position.kind === 'selesai' ? 'Buat siklus baru' : 'Buka Belajar'}
        </Link>
      </Card>
    )
  }

  const week = position.week
  const entry = detail.schedule.find((s) => s.weekday === weekdayIso(today))
  const track = entry?.track_id ? detail.tracks.find((t) => t.id === entry.track_id) : undefined
  const weekRow = track ? detail.weeks.find((w) => w.track_id === track.id && w.week_number === week) : undefined
  const weekTactics = detail.tactics.filter((t) => t.week_number === week)
  const visible = (t: LearningTactic) => !t.done || touched.has(t.id)
  const pendingTrack = weekRow ? weekTactics.filter((t) => t.week_id === weekRow.id && visible(t)) : []
  const pendingFixed = weekTactics.filter((t) => t.week_id === null && visible(t))
  const pendingAll = weekTactics.filter((t) => !t.done).length

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted">
            Belajar hari ini · Minggu {week}
          </p>
          <p className="mt-1 flex items-center gap-2 text-lg font-semibold">
            {track && <span className={`size-3 shrink-0 rounded-full ${trackColor(track.color).dot}`} aria-hidden="true" />}
            <span className="truncate">{track ? track.name : entry ? 'Hari review' : 'Hari libur'}</span>
          </p>
          {weekRow?.topic && <p className="text-sm">{weekRow.topic}</p>}
        </div>
        <Link to="/belajar" className="shrink-0 text-sm font-medium text-primary">
          Buka
        </Link>
      </div>

      {pendingTrack.length > 0 && (
        <TacticList tactics={pendingTrack} editing={false} onToggle={toggle} onRename={noop} onDelete={noop} onAdd={noop} />
      )}
      {pendingFixed.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted">Taktik tetap</p>
          <TacticList tactics={pendingFixed} editing={false} onToggle={toggle} onRename={noop} onDelete={noop} onAdd={noop} />
        </div>
      )}
      {track && weekRow && pendingTrack.every((t) => t.done) && <p className="text-sm text-ok">Taktik {track.name} minggu ini sudah selesai.</p>}
      <p className="num text-xs text-muted">
        {pendingAll === 0 ? 'Semua taktik minggu ini selesai.' : `${pendingAll} taktik minggu ini belum selesai.`}
      </p>
      {actions.error && <p role="alert" className="text-sm text-bad">Gagal menyimpan: {actions.error}</p>}
    </Card>
  )
}
