import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { BackLink } from '../components/BackLink'
import { ChevronDownIcon, ChevronUpIcon } from '../components/icons'
import { Button, Card, EmptyState, ErrorMessage, inputClass, PageHeader } from '../components/ui'
import {
  createTrack,
  deleteTrack,
  getActiveCycle,
  getCycleDetail,
  reorderTracks,
  setScheduleDay,
  updateCycle,
  updateTrack,
} from '../db/learning'
import type { LearningCycle, LearningTrack, StudySchedule } from '../db/types'
import { useQuery } from '../db/useQuery'
import { TRACK_COLOR_NAMES, TRACK_COLORS, trackColor, type TrackColor } from '../features/learning/colors'
import { namaHari } from '../lib/dates'
import { nextSortOrder } from '../lib/learning'

export default function AturSiklusPage() {
  const query = useQuery(async () => {
    const cycle = await getActiveCycle()
    return cycle ? { cycle, detail: await getCycleDetail(cycle.id) } : null
  }, [])

  return (
    <>
      <BackLink to="/belajar" label="Belajar" />
      <PageHeader title="Atur siklus" subtitle="Nama, visi, jalur, dan jadwal siklus aktif" />
      {query.error && <ErrorMessage error={query.error} onRetry={query.reload} />}
      {query.loading && query.data === undefined && <p className="text-sm text-muted">Memuat…</p>}
      {query.data === null && (
        <EmptyState
          title="Belum ada siklus aktif."
          action={
            <Link to="/belajar/siklus-baru" className="text-sm font-medium text-primary">
              Buat siklus baru
            </Link>
          }
        />
      )}
      {query.data && (
        <div className="space-y-4">
          <CycleInfoForm key={query.data.cycle.id} cycle={query.data.cycle} onSaved={query.reload} />
          <TrackManager cycleId={query.data.cycle.id} tracks={query.data.detail.tracks} onChanged={query.reload} />
          <ScheduleEditor
            cycleId={query.data.cycle.id}
            tracks={query.data.detail.tracks}
            schedule={query.data.detail.schedule}
            onChanged={query.reload}
          />
        </div>
      )}
    </>
  )
}

function useRunner(onDone: () => void) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function run(action: () => Promise<void>): Promise<boolean> {
    setBusy(true)
    setError(null)
    try {
      await action()
      onDone()
      return true
    } catch (e) {
      setError((e as Error).message)
      return false
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, run }
}

function CycleInfoForm({ cycle, onSaved }: { cycle: LearningCycle; onSaved: () => void }) {
  const [name, setName] = useState(cycle.name)
  const [vision, setVision] = useState(cycle.vision)
  const [saved, setSaved] = useState(false)
  const { busy, error, run } = useRunner(onSaved)
  const dirty = name.trim() !== cycle.name || vision.trim() !== cycle.vision

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    setSaved(await run(() => updateCycle(cycle.id, { name: name.trim(), vision: vision.trim() })))
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Nama siklus</span>
          <input value={name} onChange={(e) => (setName(e.target.value), setSaved(false))} className={inputClass} required />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Visi dan target</span>
          <textarea value={vision} onChange={(e) => (setVision(e.target.value), setSaved(false))} rows={3} className={inputClass} />
        </label>
        {error && <p className="text-sm text-bad">{error}</p>}
        {saved && !dirty && <p className="text-sm text-ok">Tersimpan.</p>}
        <Button type="submit" disabled={busy || !dirty}>
          Simpan
        </Button>
      </form>
    </Card>
  )
}

function TrackRow({
  track,
  index,
  total,
  busy,
  onMove,
  onSave,
  onDelete,
}: {
  track: LearningTrack
  index: number
  total: number
  busy: boolean
  onMove: (delta: number) => void
  onSave: (patch: { name: string; color: string; goal: string }) => Promise<boolean>
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [name, setName] = useState(track.name)
  const [color, setColor] = useState(track.color)
  const [goal, setGoal] = useState(track.goal)
  const iconButton = 'rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-text disabled:opacity-30'

  if (editing) {
    return (
      <li className="space-y-2 py-3">
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} aria-label="Nama jalur" />
          <select value={color} onChange={(e) => setColor(e.target.value)} className={`${inputClass} w-32`} aria-label="Warna">
            {TRACK_COLOR_NAMES.map((c) => (
              <option key={c} value={c}>
                {TRACK_COLORS[c].label}
              </option>
            ))}
          </select>
        </div>
        <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Target jalur ini" className={inputClass} aria-label="Target" />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditing(false)}>
            Batal
          </Button>
          <Button
            disabled={busy || !name.trim()}
            onClick={async () => {
              if (await onSave({ name: name.trim(), color, goal: goal.trim() })) setEditing(false)
            }}
          >
            Simpan
          </Button>
        </div>
      </li>
    )
  }

  return (
    <li className="py-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <button type="button" className={iconButton} disabled={busy || index === 0} onClick={() => onMove(-1)} aria-label={`Naikkan ${track.name}`}>
            <ChevronUpIcon className="size-4" />
          </button>
          <button type="button" className={iconButton} disabled={busy || index === total - 1} onClick={() => onMove(1)} aria-label={`Turunkan ${track.name}`}>
            <ChevronDownIcon className="size-4" />
          </button>
        </div>
        <span className={`size-3 shrink-0 rounded-full ${trackColor(track.color).dot}`} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{track.name}</p>
          {track.goal && <p className="truncate text-xs text-muted">{track.goal}</p>}
        </div>
        {!confirmDelete && (
          <>
            <Button variant="secondary" className="px-3 py-1.5" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button variant="secondary" className="px-3 py-1.5 text-bad" onClick={() => setConfirmDelete(true)}>
              Hapus
            </Button>
          </>
        )}
      </div>
      {confirmDelete && (
        <div className="mt-2 space-y-2 rounded-lg border border-bad/40 bg-bad/10 p-3 text-sm">
          <p>
            Hapus jalur <span className="font-medium">{track.name}</span> beserta semua topik dan taktiknya di siklus ini? Hari
            jadwalnya menjadi hari review.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Batal
            </Button>
            <Button variant="danger" disabled={busy} onClick={onDelete}>
              Ya, hapus
            </Button>
          </div>
        </div>
      )}
    </li>
  )
}

function TrackManager({ cycleId, tracks, onChanged }: { cycleId: string; tracks: readonly LearningTrack[]; onChanged: () => void }) {
  const { busy, error, run } = useRunner(onChanged)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState<TrackColor>(TRACK_COLOR_NAMES[tracks.length % TRACK_COLOR_NAMES.length]!)

  function move(index: number, delta: number) {
    const ids = tracks.map((t) => t.id)
    const target = index + delta
    ;[ids[index], ids[target]] = [ids[target]!, ids[index]!]
    void run(() => reorderTracks(ids))
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    if (!newName.trim()) return
    const ok = await run(() => createTrack({ cycleId, name: newName, color: newColor, goal: '', sortOrder: nextSortOrder(tracks) }))
    if (ok) {
      setNewName('')
      setNewColor(TRACK_COLOR_NAMES[(tracks.length + 1) % TRACK_COLOR_NAMES.length]!)
    }
  }

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="font-semibold">Jalur belajar</h2>
        <p className="text-xs text-muted">Jalur hanya berlaku untuk siklus ini. Siklus berikutnya bisa memakai jalur lain.</p>
      </div>
      {tracks.length === 0 && <p className="text-sm text-muted">Belum ada jalur.</p>}
      <ul className="divide-y divide-border">
        {tracks.map((t, i) => (
          <TrackRow
            key={t.id}
            track={t}
            index={i}
            total={tracks.length}
            busy={busy}
            onMove={(delta) => move(i, delta)}
            onSave={(patch) => run(() => updateTrack(t.id, patch))}
            onDelete={() => void run(() => deleteTrack(t.id))}
          />
        ))}
      </ul>
      <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nama jalur baru" className={`${inputClass} min-w-40 flex-1`} aria-label="Nama jalur baru" />
        <select value={newColor} onChange={(e) => setNewColor(e.target.value as TrackColor)} className={`${inputClass} w-auto`} aria-label="Warna jalur baru">
          {TRACK_COLOR_NAMES.map((c) => (
            <option key={c} value={c}>
              {TRACK_COLORS[c].label}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={busy || !newName.trim()}>
          Tambah
        </Button>
      </form>
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
    </Card>
  )
}

function ScheduleEditor({
  cycleId,
  tracks,
  schedule,
  onChanged,
}: {
  cycleId: string
  tracks: readonly LearningTrack[]
  schedule: readonly StudySchedule[]
  onChanged: () => void
}) {
  const { busy, error, run } = useRunner(onChanged)
  const byDay = new Map(schedule.map((s) => [s.weekday, s]))
  const valueOf = (weekday: number) => {
    const entry = byDay.get(weekday)
    return !entry ? 'libur' : (entry.track_id ?? 'review')
  }

  return (
    <Card className="space-y-3">
      <h2 id="jadwal" className="scroll-mt-20 font-semibold">
        Jadwal harian
      </h2>
      <ul className="divide-y divide-border">
        {Array.from({ length: 7 }, (_, i) => {
          const weekday = i + 1
          return (
            <li key={weekday} className="flex items-center gap-3 py-2">
              <span className="w-20 text-sm font-medium">{namaHari(weekday)}</span>
              <select
                value={valueOf(weekday)}
                disabled={busy}
                onChange={(e) => {
                  const v = e.target.value
                  void run(() => setScheduleDay(cycleId, weekday, v === 'review' ? null : v))
                }}
                className={inputClass}
                aria-label={`Jadwal ${namaHari(weekday)}`}
              >
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
                <option value="review">Review mingguan</option>
                <option value="libur">Libur</option>
              </select>
            </li>
          )
        })}
      </ul>
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
    </Card>
  )
}
