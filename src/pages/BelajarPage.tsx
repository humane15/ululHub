import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { LazyScoreLineChart } from '../components/charts'
import { Card, EmptyState, ErrorMessage, PageHeader } from '../components/ui'
import { getActiveCycle, getCycleDetail, type CycleDetail } from '../db/learning'
import type { LearningCycle } from '../db/types'
import { useQuery, type QueryState } from '../db/useQuery'
import { CycleEvaluation } from '../features/learning/CycleEvaluation'
import { FixedTacticsCard } from '../features/learning/FixedTacticsCard'
import { ScheduleStrip } from '../features/learning/ScheduleStrip'
import { ScoreCard } from '../features/learning/ScoreCard'
import { TrackWeekCard } from '../features/learning/TrackWeekCard'
import { useCycleActions, type ActiveCycleData, type CycleActions } from '../features/learning/useCycleActions'
import { WeeklyReviewCard } from '../features/learning/WeeklyReviewCard'
import { WeekPicker } from '../features/learning/WeekPicker'
import {
  cyclePosition,
  cycleWeekRange,
  formatTanggal,
  namaHari,
  todayJakarta,
  weekdayIso,
  type CyclePosition,
  type ISODate,
} from '../lib/dates'
import { initialWeekView, scoreSeries, tacticProgress, type WeekView } from '../lib/learning'
import { weeklyScores } from '../lib/scoring'

const linkClass = 'rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium hover:bg-surface-2'

function positionText(cycle: LearningCycle, position: CyclePosition): string {
  switch (position.kind) {
    case 'belum_mulai':
      return `Mulai ${namaHari(1)}, ${formatTanggal(cycle.start_date)} (${position.daysUntilStart} hari lagi)`
    case 'minggu': {
      const { start, end } = cycleWeekRange(cycle.start_date, position.week)
      return `Minggu ${position.week} dari 12 · ${formatTanggal(start, { short: true })} – ${formatTanggal(end, { short: true })}`
    }
    case 'evaluasi':
      return 'Minggu ke-13: evaluasi dan istirahat'
    case 'selesai':
      return `Siklus berakhir ${position.daysSinceEnd} hari lalu`
  }
}

function weekRangeText(start: ISODate, week: number): string {
  const range = cycleWeekRange(start, week)
  return `${formatTanggal(range.start, { short: true })} – ${formatTanggal(range.end, { short: true })}`
}

export default function BelajarPage() {
  const query = useQuery<ActiveCycleData>(async () => {
    const cycle = await getActiveCycle()
    if (!cycle) return { cycle: null }
    return { cycle, detail: await getCycleDetail(cycle.id) }
  }, [])

  if (query.error && !query.data) return <ErrorMessage error={query.error} onRetry={query.reload} />
  if (!query.data) return <p className="text-sm text-muted">Memuat…</p>

  if (!query.data.cycle) {
    return (
      <>
        <PageHeader title="Belajar" subtitle="Rencana 12 Week Year" actions={<Link to="/belajar/catatan" className={linkClass}>Catatan</Link>} />
        <EmptyState
          title="Belum ada siklus aktif."
          description="Buat siklus baru untuk mulai merencanakan 12 minggu ke depan."
          action={
            <Link to="/belajar/siklus-baru" className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white dark:text-slate-950">
              Buat siklus baru
            </Link>
          }
        />
      </>
    )
  }

  const { cycle, detail } = query.data
  return <ActiveCycle key={cycle.id} cycle={cycle} detail={detail} query={query} />
}

function ActiveCycle({
  cycle,
  detail,
  query,
}: {
  cycle: LearningCycle
  detail: CycleDetail
  query: QueryState<ActiveCycleData>
}) {
  const actions = useCycleActions(cycle.id, query)
  const today = todayJakarta()
  const todayWeekday = weekdayIso(today)
  const position = cyclePosition(cycle.start_date, today)
  const [picked, setPicked] = useState<WeekView | null>(null)
  const view = picked ?? initialWeekView(position)

  const currentWeek = position.kind === 'minggu' ? position.week : position.kind === 'evaluasi' ? 13 : null
  const elapsedWeeks = position.kind === 'belum_mulai' ? 0 : position.kind === 'minggu' ? position.week : 12
  const scores = useMemo(
    () => weeklyScores(detail.tactics.map((t) => ({ weekNumber: t.week_number, done: t.done }))),
    [detail.tactics],
  )
  const todayTrackId = detail.schedule.find((s) => s.weekday === todayWeekday)?.track_id ?? null

  return (
    <>
      <PageHeader
        title={cycle.name}
        subtitle={positionText(cycle, position)}
        actions={
          <div className="flex gap-2">
            <Link to="/belajar/catatan" className={linkClass}>
              Catatan
            </Link>
            <Link to="/belajar/atur" className={linkClass}>
              Atur siklus
            </Link>
          </div>
        }
      />

      <div className="space-y-4">
        {cycle.vision && (
          <p className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
            <span className="text-muted">Visi: </span>
            {cycle.vision}
          </p>
        )}

        <ScheduleStrip schedule={detail.schedule} tracks={detail.tracks} todayWeekday={todayWeekday} />

        <WeekPicker view={view} onChange={setPicked} scores={scores} currentWeek={currentWeek} elapsedWeeks={elapsedWeeks} />

        {actions.error && (
          <p role="alert" className="rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">
            Gagal menyimpan: {actions.error}
          </p>
        )}

        {view.kind === 'evaluasi' ? (
          <CycleEvaluation detail={detail} ended={position.kind === 'selesai'} />
        ) : (
          <WeekContent
            key={view.week}
            cycleId={cycle.id}
            startDate={cycle.start_date}
            week={view.week}
            isCurrentWeek={currentWeek === view.week}
            upcoming={view.week > elapsedWeeks}
            todayTrackId={todayTrackId}
            detail={detail}
            actions={actions}
            onReload={query.reload}
          />
        )}

        {elapsedWeeks > 0 && (
          <Card>
            <h2 className="mb-3 font-semibold">Grafik skor 12 minggu</h2>
            <LazyScoreLineChart data={scoreSeries(scores, elapsedWeeks)} />
          </Card>
        )}
      </div>
    </>
  )
}

function WeekContent({
  cycleId,
  startDate,
  week,
  isCurrentWeek,
  upcoming,
  todayTrackId,
  detail,
  actions,
  onReload,
}: {
  cycleId: string
  startDate: ISODate
  week: number
  isCurrentWeek: boolean
  upcoming: boolean
  todayTrackId: string | null
  detail: CycleDetail
  actions: CycleActions
  onReload: () => void
}) {
  const weekTactics = detail.tactics.filter((t) => t.week_number === week)
  const fixed = weekTactics.filter((t) => t.week_id === null)
  const progress = tacticProgress(weekTactics)
  const review = detail.reviews.find((r) => r.week_number === week)

  return (
    <div className="space-y-4">
      <ScoreCard progress={progress} upcoming={upcoming} title={`Skor minggu ${week} · ${weekRangeText(startDate, week)}`} />

      {detail.tracks.length === 0 ? (
        <EmptyState
          title="Siklus ini belum punya jalur."
          description="Tambahkan jalur belajar (misalnya AWS atau CTF) di halaman Atur siklus."
          action={
            <Link to="/belajar/atur" className="text-sm font-medium text-primary">
              Atur siklus
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {detail.tracks.map((track) => {
            const weekRow = detail.weeks.find((w) => w.track_id === track.id && w.week_number === week)
            return (
              <TrackWeekCard
                key={`${track.id}-${week}`}
                track={track}
                week={weekRow}
                weekNumber={week}
                tactics={weekRow ? weekTactics.filter((t) => t.week_id === weekRow.id) : []}
                actions={actions}
                isToday={isCurrentWeek && todayTrackId === track.id}
              />
            )
          })}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <FixedTacticsCard weekNumber={week} tactics={fixed} actions={actions} />
        <WeeklyReviewCard cycleId={cycleId} weekNumber={week} score={progress.score} review={review} onSaved={onReload} />
      </div>
    </div>
  )
}
