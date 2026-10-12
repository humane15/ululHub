import { useState, type FormEvent } from 'react'
import { announceDataChanged } from '../alerts/useAlerts'
import { MoneyInput } from '../../components/MoneyInput'
import { Button, inputClass } from '../../components/ui'
import { createTransaction, deleteTransaction, updateTransaction, type TransactionInput } from '../../db/finance'
import type { BudgetCategory, IncomeSource } from '../../db/types'
import type { TransactionType } from '../../lib/budget'
import { isValidISODate, type ISODate } from '../../lib/dates'
import { formatRupiah } from '../../lib/money'

export interface TransactionDraft {
  /** Ada = edit transaksi lama. */
  id?: string
  type: TransactionType
  date: ISODate
  categoryId: string | null
  incomeSource: IncomeSource
  amount: number | null
  note: string
}

function toInput(d: TransactionDraft): TransactionInput {
  return {
    date: d.date,
    type: d.type,
    category_id: d.type === 'keluar' ? d.categoryId : null,
    income_source: d.type === 'masuk' ? d.incomeSource : null,
    amount: d.amount ?? 0,
    note: d.note.trim(),
  }
}

function validate(d: TransactionDraft): string | null {
  if (!isValidISODate(d.date)) return 'Tanggal tidak valid.'
  if (d.amount === null || d.amount <= 0) return 'Isi jumlah lebih dari Rp0.'
  if (d.type === 'keluar' && !d.categoryId) return 'Pilih pos anggaran.'
  return null
}

export function TransactionForm({
  initial,
  categories,
  onDone,
}: {
  initial: TransactionDraft
  /** Semua kategori; yang diarsipkan hanya tampil kalau sedang dipakai transaksi ini. */
  categories: readonly BudgetCategory[]
  onDone: () => void
}) {
  const [draft, setDraft] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const set = (patch: Partial<TransactionDraft>) => setDraft((d) => ({ ...d, ...patch }))

  const options = categories.filter((c) => c.archived_at === null || c.id === initial.categoryId)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      announceDataChanged()
      onDone()
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const problem = validate(draft)
    if (problem) return setError(problem)
    const input = toInput(draft)
    void run(() => (draft.id ? updateTransaction(draft.id, input) : createTransaction(input)))
  }

  const typeButton = (type: TransactionType, label: string) => (
    <button
      type="button"
      onClick={() => set({ type })}
      aria-pressed={draft.type === type}
      className={`flex-1 rounded-md py-1.5 text-sm font-medium ${
        draft.type === type ? 'bg-surface shadow-sm' : 'text-muted'
      }`}
    >
      {label}
    </button>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-1 rounded-lg bg-surface-2 p-1">
        {typeButton('keluar', 'Pengeluaran')}
        {typeButton('masuk', 'Pemasukan')}
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Jumlah</span>
        <MoneyInput value={draft.amount} onChange={(amount) => set({ amount })} autoFocus={!draft.id && draft.amount === null} />
      </label>

      {draft.type === 'keluar' ? (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Pos anggaran</span>
          <select
            value={draft.categoryId ?? ''}
            onChange={(e) => set({ categoryId: e.target.value || null })}
            className={inputClass}
          >
            <option value="">Pilih pos…</option>
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.archived_at ? ' (diarsipkan)' : ''}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">Sumber</legend>
          <div className="flex gap-4 text-sm">
            {(['gaji', 'lain'] as const).map((source) => (
              <label key={source} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="income_source"
                  checked={draft.incomeSource === source}
                  onChange={() => set({ incomeSource: source })}
                  className="accent-primary"
                />
                {source === 'gaji' ? 'Gaji' : 'Lain lain'}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Tanggal</span>
        <input type="date" required value={draft.date} onChange={(e) => set({ date: e.target.value })} className={`${inputClass} num`} />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">
          Catatan <span className="font-normal text-muted">(opsional)</span>
        </span>
        <input type="text" value={draft.note} onChange={(e) => set({ note: e.target.value })} className={inputClass} maxLength={500} />
      </label>

      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}

      {confirmDelete ? (
        <div className="space-y-3 rounded-lg border border-bad/40 bg-bad/10 p-3">
          <p className="text-sm">
            Hapus transaksi <span className="num font-medium">{formatRupiah(initial.amount ?? 0)}</span> ini? Tindakan ini
            tidak bisa dibatalkan.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(false)} disabled={busy}>
              Batal
            </Button>
            <Button variant="danger" className="flex-1" disabled={busy} onClick={() => void run(() => deleteTransaction(initial.id!))}>
              {busy ? 'Menghapus…' : 'Ya, hapus'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          {draft.id && (
            <Button variant="secondary" className="text-bad" onClick={() => setConfirmDelete(true)} disabled={busy}>
              Hapus
            </Button>
          )}
          <Button type="submit" className="flex-1" disabled={busy}>
            {busy ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </div>
      )}
    </form>
  )
}
