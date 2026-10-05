import type { BudgetCategory, Transaction } from '../../db/types'
import { formatTanggal } from '../../lib/dates'
import { formatRupiah } from '../../lib/money'
import { transactionTitle } from './labels'

export function TransactionList({
  transactions,
  categories,
  onSelect,
}: {
  transactions: readonly Transaction[]
  categories: ReadonlyMap<string, BudgetCategory>
  onSelect: (t: Transaction) => void
}) {
  return (
    <ul className="-mx-2 divide-y divide-border">
      {transactions.map((t) => (
        <li key={t.id}>
          <button
            type="button"
            onClick={() => onSelect(t)}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-surface-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{transactionTitle(t, categories)}</p>
              <p className="truncate text-xs text-muted">
                {formatTanggal(t.date, { short: true })}
                {t.note && ` · ${t.note}`}
              </p>
            </div>
            <span className={`num shrink-0 text-sm font-medium ${t.type === 'masuk' ? 'text-ok' : ''}`}>
              {t.type === 'masuk' ? '+' : '-'}
              {formatRupiah(t.amount)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
