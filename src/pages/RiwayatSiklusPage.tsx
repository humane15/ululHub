import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { BackLink } from '../components/BackLink'
import { Button, Card, EmptyState, ErrorMessage, PageHeader } from '../components/ui'
import { getCycleDetail, listCycles, listCycleWeekStats, setCycleStatus } from '../db/learning'
import type { CycleStatus, LearningCycle } from '../db/types'
import { useQuery } from '../db/useQuery'
import { CycleEvaluation } from '../features/learning/CycleEvaluation'
import { scoreInfo } from '../features/learning/score'
import { cycleEndDate, cyclePosition, formatTanggal, todayJakarta } from '../lib/dates'
import { cycleHistoryStats, type CycleHistoryStats } from '../lib/learning'
import { TARGET_SCORE } from '../lib/scoring'

const STATUS_LABEL: Record<CycleStatus, string> = { aktif: 'Aktif', selesai: 'Selesai', arsip: 'Arsip' }
const STATUS_CLASS: Record<CycleStatus, string> = {
  aktif: 'bg-primary-soft text-primary',
  selesai: 'bg-surface-2 text-muted',
  arsip: 'bg-surface-2 text-muted',
}

function cycleRange(cycle: LearningCycle): string {
  return `${formatTanggal(cycle.start_date, { short: true })} – ${formatTanggal(cycleEndDate(cycle.start_date), { short: true })}`
}

export default function RiwayatSiklusPage() {
  const { id } = useParams()
  return id ? <CycleDetailView id={id} /> : <CycleList />
}

function CycleList() {
  const query = useQuery(async () => {
    const [cycles, stats] = await Promise.all([listCycles(), listCycleWeekStats()])
    return {
      cycles,
      stats: cycleHistoryStats(
        stats.map((s) => ({ cycleId: s.cycle_id, weekNumber: s.week_number, total: s.total, done: s.done })),
        TARGET_SCORE,
      ),
    }
  }, [])
  const [showArchived, setShowArchived] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function changeStatus(id: string, status: CycleStatus) {
    setBusyId(id)
    setError(null)
    try {
      await setCycleStatus(id, status)
      setConfirmId(null)
      query.reload()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  const cycles = query.data?.cycles ?? []
  const stats = query.data?.stats ?? new Map<string, CycleHistoryStats>()
  const archivedCount = cycles.filter((c) => c.status === 'arsip').length
  const visible = showArchived ? cycles : cycles.filter((c) => c.status !== 'arsip')
  const active = cycles.find((c) => c.status === 'aktif')

  return (
    <>
      <BackLink to="/belajar" label="Belajar" />
      <PageHeader
        title="Riwayat siklus"
        subtitle="Perkembangan dari siklus ke siklus"
        actions={
          <Link to="/belajar/siklus-baru" className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white dark:text-slate-950">
            Siklus baru
          </Link>
        }
      />

      {query.error && <ErrorMessage error={query.error} onRetry={query.reload} />}
      {!query.data && !query.error && <p className="text-sm text-muted">Memuat…</p>}
      {query.data && cycles.length === 0 && (
        <EmptyState
          title="Belum ada siklus."
          description="Siklus yang pernah kamu jalankan akan muncul di sini beserta skornya."
          action={
            <Link to="/belajar/siklus-baru" className="text-sm font-medium text-primary">
              Buat siklus baru
            </Link>
          }
        />
      )}

      {query.data && cycles.length > 0 && (
        <div className="space-y-4">
          <ComparisonCard cycles={[...visible].reverse()} stats={stats} />

          {error && (
            <p role="alert" className="rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">
              Gagal menyimpan: {error}
            </p>
          )}

          <ul className="space-y-3">
            {visible.map((cycle) => {
              const s = stats.get(cycle.id)
              const info = scoreInfo(s?.average ?? null)
              const busy = busyId === cycle.id
              return (
                <li key={cycle.id}>
                  <Card className={cycle.status === 'arsip' ? 'opacity-75' : ''}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link to={`/belajar/riwayat/${cycle.id}`} className="font-semibold text-primary">
                          {cycle.name}
                        </Link>
                        <p className="num text-xs text-muted">{cycleRange(cycle)}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[cycle.status]}`}>
                        {STATUS_LABEL[cycle.status]}
                      </span>
                    </div>

                    <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <dt className="text-xs text-muted">Rata-rata skor</dt>
                        <dd className={`num font-semibold ${info?.text ?? 'text-muted'}`}>
                          {s?.average == null ? '–' : `${s.average}%`}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">Taktik selesai</dt>
                        <dd className="num font-semibold">{s ? `${s.done}/${s.total}` : '0/0'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">Minggu ≥ {TARGET_SCORE}%</dt>
                        <dd className="num font-semibold">{s?.weeksOnTarget ?? 0}/12</dd>
                      </div>
                    </dl>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {confirmId === cycle.id ? (
                        <>
                          <p className="w-full text-sm">
                            Jadikan siklus ini aktif?
                            {active && ` ${active.name} akan ditandai selesai.`}
                          </p>
                          <Button disabled={busy} onClick={() => changeStatus(cycle.id, 'aktif')}>
                            {busy ? 'Menyimpan…' : 'Ya, aktifkan'}
                          </Button>
                          <Button variant="secondary" disabled={busy} onClick={() => setConfirmId(null)}>
                            Batal
                          </Button>
                        </>
                      ) : (
                        <>
                          {cycle.status !== 'aktif' && (
                            <Button variant="secondary" disabled={busy} onClick={() => setConfirmId(cycle.id)}>
                              Jadikan aktif
                            </Button>
                          )}
                          {cycle.status === 'aktif' && (
                            <Button variant="secondary" disabled={busy} onClick={() => changeStatus(cycle.id, 'selesai')}>
                              Tandai selesai
                            </Button>
                          )}
                          {cycle.status === 'arsip' ? (
                            <Button variant="secondary" disabled={busy} onClick={() => changeStatus(cycle.id, 'selesai')}>
                              Keluarkan dari arsip
                            </Button>
                          ) : (
                            <Button variant="secondary" disabled={busy} onClick={() => changeStatus(cycle.id, 'arsip')}>
                              Arsipkan
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>

          {archivedCount > 0 && (
            <button type="button" className="text-sm font-medium text-primary" onClick={() => setShowArchived((v) => !v)}>
              {showArchived ? 'Sembunyikan arsip' : `Tampilkan arsip (${archivedCount})`}
            </button>
          )}
        </div>
      )}
    </>
  )
}

/** Perbandingan rata-rata skor antar siklus (lama -> baru) dengan penanda target. */
function ComparisonCard({
  cycles,
  stats,
}: {
  cycles: readonly LearningCycle[]
  stats: ReadonlyMap<string, CycleHistoryStats>
}) {
  const withScore = cycles.filter((c) => stats.get(c.id)?.average != null)
  if (withScore.length === 0) return null
  return (
    <Card>
      <h2 className="mb-1 font-semibold">Perbandingan rata-rata skor</h2>
      <p className="mb-3 text-xs text-muted">Garis tipis = target {TARGET_SCORE}%.</p>
      <ul className="space-y-2.5">
        {withScore.map((cycle) => {
          const average = stats.get(cycle.id)!.average!
          const info = scoreInfo(average)!
          return (
            <li key={cycle.id} className="grid grid-cols-[minmax(0,8rem)_1fr_3rem] items-center gap-3 text-sm">
              <span className="truncate" title={cycle.name}>
                {cycle.name}
              </span>
              <div
                className="relative h-2.5 rounded-full bg-surface-2"
                role="img"
                aria-label={`${cycle.name}: rata-rata skor ${average}%, ${info.label.toLowerCase()}`}
              >
                <div className={`h-full rounded-full ${info.bg}`} style={{ width: `${Math.min(average, 100)}%` }} />
                <div className="absolute -top-1 -bottom-1 w-px bg-text/40" style={{ left: `${TARGET_SCORE}%` }} aria-hidden="true" />
              </div>
              <span className={`num text-right font-medium ${info.text}`}>{average}%</span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function CycleDetailView({ id }: { id: string }) {
  const query = useQuery(async () => {
    const cycles = await listCycles()
    const cycle = cycles.find((c) => c.id === id) ?? null
    return cycle ? { cycle, detail: await getCycleDetail(cycle.id) } : null
  }, [id])

  return (
    <>
      <BackLink to="/belajar/riwayat" label="Riwayat siklus" />
      {query.error && <ErrorMessage error={query.error} onRetry={query.reload} />}
      {query.data === undefined && !query.error && <p className="text-sm text-muted">Memuat…</p>}
      {query.data === null && <EmptyState title="Siklus tidak ditemukan." />}
      {query.data && (
        <>
          <PageHeader title={query.data.cycle.name} subtitle={cycleRange(query.data.cycle)} />
          {query.data.cycle.vision && (
            <p className="mb-4 rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
              <span className="text-muted">Visi: </span>
              {query.data.cycle.vision}
            </p>
          )}
          <CycleEvaluation
            detail={query.data.detail}
            ended={cyclePosition(query.data.cycle.start_date, todayJakarta()).kind === 'selesai'}
            archived
          />
        </>
      )}
    </>
  )
}
