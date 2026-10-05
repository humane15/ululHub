import { Link } from 'react-router'
import { PlusIcon } from '../../components/icons'
import { Button, Card } from '../../components/ui'
import type { BudgetControlRow, MonthSummary } from '../../lib/budget'
import { formatRupiah } from '../../lib/money'
import { BudgetControl } from '../finance/BudgetControl'

/** Sisa uang bulan ini dan pos yang sudah kuning atau merah. */
export function MoneyTodayCard({
  monthLabel,
  summary,
  attention,
  hasBudget,
  onAddExpense,
}: {
  monthLabel: string
  summary: MonthSummary
  /** Pos pengeluaran berstatus waspada/lewat. */
  attention: readonly BudgetControlRow[]
  hasBudget: boolean
  onAddExpense: () => void
}) {
  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Sisa uang {monthLabel}</p>
          <p className={`num mt-1 text-3xl font-semibold tracking-tight ${summary.remaining < 0 ? 'text-bad' : ''}`}>
            {formatRupiah(summary.remaining)}
          </p>
        </div>
        <Link to="/keuangan" className="shrink-0 text-sm font-medium text-primary">
          Buka
        </Link>
      </div>
      <Button onClick={onAddExpense}>
        <PlusIcon className="size-4" />
        Catat pengeluaran
      </Button>
      {!hasBudget ? (
        <p className="text-sm text-muted">
          Belum ada anggaran bulan ini.{' '}
          <Link to="/keuangan/anggaran" className="font-medium text-primary">
            Buat anggaran
          </Link>
        </p>
      ) : attention.length === 0 ? (
        <p className="text-sm text-ok">Semua pos anggaran masih aman.</p>
      ) : (
        <div>
          <p className="mb-3 text-sm font-medium">Perlu perhatian</p>
          <BudgetControl rows={attention} />
        </div>
      )}
    </Card>
  )
}
