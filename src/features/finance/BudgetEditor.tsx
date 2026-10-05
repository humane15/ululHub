import { useState } from 'react'
import { MoneyInput } from '../../components/MoneyInput'
import { Button, Card } from '../../components/ui'
import { saveMonthBudget, type MonthBudget } from '../../db/finance'
import type { BudgetCategory } from '../../db/types'
import { allocationCheck } from '../../lib/budget'
import { formatRupiah } from '../../lib/money'
import { CATEGORY_TYPE_LABEL } from './labels'

/** Editor zero based budget untuk satu bulan. Tidak menyentuh bulan lain. */
export function BudgetEditor({
  budget,
  categories,
  onSaved,
}: {
  budget: MonthBudget
  categories: readonly BudgetCategory[]
  onSaved: () => void
}) {
  const [income, setIncome] = useState<number | null>(budget.month.income)
  const [amounts, setAmounts] = useState<Map<string, number | null>>(() => new Map(budget.items))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  // Pos aktif + pos arsip yang masih punya anggaran di bulan ini.
  const shown = categories.filter((c) => c.archived_at === null || budget.items.has(c.id))
  const amountOf = (id: string) => amounts.get(id) ?? 0
  const check = allocationCheck(income ?? 0, shown.map((c) => amountOf(c.id)))

  const dirty =
    (income ?? 0) !== budget.month.income || shown.some((c) => amountOf(c.id) !== (budget.items.get(c.id) ?? 0))

  async function handleSave() {
    setBusy(true)
    setMessage(null)
    try {
      // Kirim semua pos yang tampil; nominal 0 menghapus pos dari bulan ini.
      const items = new Map(shown.map((c) => [c.id, amountOf(c.id)]))
      await saveMonthBudget(budget.month.id, income ?? 0, items)
      setMessage({ ok: true, text: 'Anggaran tersimpan.' })
      onSaved()
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const statusText =
    check.status === 'pas'
      ? 'Pas. Setiap rupiah sudah punya pos.'
      : check.status === 'belum_teralokasi'
        ? `${formatRupiah(check.difference)} belum dialokasikan.`
        : `Kelebihan alokasi ${formatRupiah(-check.difference)}.`
  const statusClass = check.status === 'pas' ? 'text-ok' : check.status === 'lebih' ? 'text-bad' : 'text-warn'

  return (
    <Card className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Gaji / pemasukan bulan ini</span>
        <MoneyInput value={income} onChange={setIncome} />
      </label>

      <ul className="divide-y divide-border">
        {shown.map((c) => (
          <li key={c.id} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {c.name}
                {c.archived_at && <span className="font-normal text-muted"> (diarsipkan)</span>}
              </p>
              <p className="text-xs text-muted">{CATEGORY_TYPE_LABEL[c.type]}</p>
            </div>
            <div className="w-40 shrink-0">
              <MoneyInput
                value={amounts.get(c.id) ?? null}
                onChange={(v) => setAmounts((prev) => new Map(prev).set(c.id, v))}
                aria-label={`Anggaran ${c.name}`}
                placeholder="0"
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="sticky bottom-20 space-y-3 rounded-xl border border-border bg-surface-2 p-3 md:bottom-4">
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted">Total pos</dt>
          <dd className="num text-right font-medium">{formatRupiah(check.allocated)}</dd>
          <dt className="text-muted">Pemasukan</dt>
          <dd className="num text-right font-medium">{formatRupiah(check.income)}</dd>
        </dl>
        <p role="status" className={`num text-sm font-medium ${statusClass}`}>
          {statusText}
        </p>
        {message && <p className={`text-sm ${message.ok ? 'text-ok' : 'text-bad'}`}>{message.text}</p>}
        <Button className="w-full" onClick={handleSave} disabled={busy || !dirty}>
          {busy ? 'Menyimpan…' : dirty ? 'Simpan anggaran' : 'Tersimpan'}
        </Button>
      </div>
    </Card>
  )
}
