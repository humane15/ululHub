import { useEffect, useState } from 'react'
import { Button, Card, inputClass } from '../../components/ui'
import { hasAnyData, seedInitialData } from '../../db/seed'
import {
  defaultCycleName,
  formatBulan,
  formatTanggal,
  isMonday,
  isValidISODate,
  mondayOnOrAfter,
  monthStart,
  todayJakarta,
} from '../../lib/dates'

type State =
  | { kind: 'checking' }
  | { kind: 'hidden' }
  | { kind: 'ready' }
  | { kind: 'saving' }
  | { kind: 'done' }
  | { kind: 'error'; message: string }

/** Kartu "Isi data awal", hanya muncul saat akun masih kosong. */
export function SeedDataCard() {
  const today = todayJakarta()
  const month = monthStart(today)
  const [cycleStart, setCycleStart] = useState(() => mondayOnOrAfter(today))
  const [state, setState] = useState<State>({ kind: 'checking' })

  useEffect(() => {
    let active = true
    hasAnyData()
      .then((filled) => active && setState(filled ? { kind: 'hidden' } : { kind: 'ready' }))
      .catch((e: Error) => active && setState({ kind: 'error', message: e.message }))
    return () => {
      active = false
    }
  }, [])

  if (state.kind === 'checking' || state.kind === 'hidden') return null

  const validStart = isValidISODate(cycleStart) && isMonday(cycleStart)
  const cycleName = validStart ? defaultCycleName(1, cycleStart) : ''

  async function handleSeed() {
    setState({ kind: 'saving' })
    try {
      await seedInitialData({ month, cycleStart, cycleName })
      setState({ kind: 'done' })
    } catch (e) {
      setState({ kind: 'error', message: (e as Error).message })
    }
  }

  if (state.kind === 'done') {
    return (
      <Card>
        <p className="font-medium text-ok">Data awal berhasil diisi.</p>
        <p className="mt-1 text-sm text-muted">
          Anggaran {formatBulan(month)} dan {cycleName} siap. Semuanya bisa diubah nanti dari aplikasi.
        </p>
      </Card>
    )
  }

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-semibold">Isi data awal</h2>
        <p className="mt-1 text-sm text-muted">Akun kamu masih kosong. Isi sekali untuk memulai:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>
            Anggaran <span className="text-text">{formatBulan(month)}</span>: gaji{' '}
            <span className="num text-text">Rp3.900.000</span>, 8 pos anggaran
          </li>
          <li>
            Siklus belajar pertama: jalur Finansial, AWS, CTF, topik 12 minggu, taktik, dan jadwal harian
          </li>
          <li>Catatan platform belajar dan aturan fokus</li>
        </ul>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Tanggal mulai siklus (hari Senin)</span>
        <input
          type="date"
          value={cycleStart}
          onChange={(e) => setCycleStart(e.target.value)}
          className={`${inputClass} num`}
        />
        <span className={`block text-xs ${validStart ? 'text-muted' : 'text-bad'}`}>
          {validStart ? `${cycleName}, mulai ${formatTanggal(cycleStart)}` : 'Pilih tanggal yang jatuh pada hari Senin.'}
        </span>
      </label>

      {state.kind === 'error' && (
        <p role="alert" className="text-sm text-bad">
          Gagal: {state.message}
        </p>
      )}

      <Button onClick={handleSeed} disabled={!validStart || state.kind === 'saving'}>
        {state.kind === 'saving' ? 'Mengisi…' : 'Isi data awal'}
      </Button>
    </Card>
  )
}
