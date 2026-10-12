import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { BackLink } from '../components/BackLink'
import { Button, Card, ErrorMessage, inputClass, PageHeader } from '../components/ui'
import { createCycle, getActiveCycle, getCycleOverview, type CopyMode } from '../db/learning'
import { useQuery } from '../db/useQuery'
import {
  addDays,
  compareISODate,
  cycleEndDate,
  cycleRestEndDate,
  defaultCycleName,
  formatTanggal,
  isValidISODate,
  namaHari,
  todayJakarta,
  weekdayIso,
  type ISODate,
} from '../lib/dates'

const MODES: { mode: CopyMode; title: string; description: string }[] = [
  { mode: 'kosong', title: 'Mulai kosong', description: 'Tanpa jalur, jadwal, dan taktik.' },
  { mode: 'struktur', title: 'Salin struktur', description: 'Jalur, jadwal, dan taktik tetap. Topik dikosongkan, semua centang dilepas.' },
  { mode: 'lengkap', title: 'Salin lengkap', description: 'Struktur ditambah topik, sumber, dan taktik tiap minggu, untuk diulang. Tanpa centang.' },
]

export default function SiklusBaruPage() {
  const query = useQuery(async () => {
    const [overview, active] = await Promise.all([getCycleOverview(), getActiveCycle()])
    return { ...overview, active }
  }, [])

  if (query.error) return <ErrorMessage error={query.error} onRetry={query.reload} />
  if (!query.data) return <p className="text-sm text-muted">Memuat…</p>
  return <NewCycleForm {...query.data} />
}

function NewCycleForm({
  latest,
  count,
  active,
}: Awaited<ReturnType<typeof getCycleOverview>> & { active: Awaited<ReturnType<typeof getActiveCycle>> }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // ?ulang=besok: ulangi siklus terakhir mulai besok (lewat tombol "Ulang siklus").
  const repeatTomorrow = params.get('ulang') === 'besok'
  const today = todayJakarta()
  const tomorrow = addDays(today, 1)
  // Default: hari setelah minggu istirahat siklus terakhir, tapi tidak sebelum hari ini.
  const earliest = latest ? addDays(cycleRestEndDate(latest.start_date), 1) : today
  const [startDate, setStartDate] = useState<ISODate>(() =>
    repeatTomorrow ? tomorrow : compareISODate(earliest, today) > 0 ? earliest : today,
  )
  const [name, setName] = useState('')
  const [vision, setVision] = useState('')
  const [mode, setMode] = useState<CopyMode>(latest ? (repeatTomorrow ? 'lengkap' : 'struktur') : 'kosong')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validStart = isValidISODate(startDate)
  const autoName = validStart ? defaultCycleName(count + 1, startDate) : ''
  const finalName = name.trim() || autoName

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!validStart || !finalName) return
    setBusy(true)
    setError(null)
    try {
      await createCycle({ name: finalName, startDate, vision, source: latest?.id ?? null, mode })
      navigate('/belajar')
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <>
      <BackLink to="/belajar" label="Belajar" />
      <PageHeader title="Siklus baru" subtitle="12 minggu eksekusi + 1 minggu evaluasi" />
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Tanggal mulai</span>
            <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`${inputClass} num`} />
            <button
              type="button"
              onClick={() => setStartDate(tomorrow)}
              className="text-xs font-medium text-primary"
            >
              Mulai besok ({namaHari(weekdayIso(tomorrow))}, {formatTanggal(tomorrow, { short: true })})
            </button>
            <span className={`block text-xs ${validStart ? 'text-muted' : 'text-bad'}`}>
              {validStart
                ? `${namaHari(weekdayIso(startDate))}. Minggu 1–12: ${formatTanggal(startDate, { short: true })} – ${formatTanggal(cycleEndDate(startDate), { short: true })}. Evaluasi sampai ${formatTanggal(cycleRestEndDate(startDate), { short: true })}.`
                : 'Tanggal tidak valid.'}
            </span>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Nama siklus</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={autoName} className={inputClass} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Visi dan target</span>
            <textarea
              value={vision}
              onChange={(e) => setVision(e.target.value)}
              rows={3}
              placeholder="Apa yang ingin dicapai di akhir 12 minggu?"
              className={inputClass}
            />
          </label>
        </Card>

        <Card>
          <fieldset className="space-y-2">
            <legend className="mb-2 font-semibold">Isi siklus</legend>
            {MODES.map((m) => {
              const disabled = m.mode !== 'kosong' && !latest
              return (
                <label
                  key={m.mode}
                  className={`flex gap-3 rounded-xl border p-3 ${mode === m.mode ? 'border-primary bg-primary-soft/40' : 'border-border'} ${
                    disabled ? 'opacity-50' : 'cursor-pointer'
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === m.mode}
                    disabled={disabled}
                    onChange={() => setMode(m.mode)}
                    className="mt-1 accent-primary"
                  />
                  <span>
                    <span className="block text-sm font-medium">{m.title}</span>
                    <span className="block text-xs text-muted">
                      {m.description}
                      {m.mode !== 'kosong' && latest && ` Sumber: ${latest.name}.`}
                    </span>
                  </span>
                </label>
              )
            })}
          </fieldset>
        </Card>

        {repeatTomorrow && latest && (
          <p className="rounded-xl bg-primary-soft/60 px-3 py-2 text-sm">
            Mengulang <span className="font-medium">{latest.name}</span> mulai besok dengan salinan lengkap (topik, sumber, taktik; tanpa centang).
          </p>
        )}
        {active && (
          <p className="rounded-xl bg-warn/10 px-3 py-2 text-sm">
            Siklus aktif <span className="font-medium">{active.name}</span> akan ditandai selesai. Datanya tetap tersimpan.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-bad">
            Gagal: {error}
          </p>
        )}
        <Button type="submit" disabled={busy || !validStart} className="w-full md:w-auto">
          {busy ? 'Membuat…' : 'Buat siklus'}
        </Button>
      </form>
    </>
  )
}
