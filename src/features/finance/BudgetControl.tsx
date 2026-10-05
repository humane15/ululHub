import { ProgressBar } from '../../components/ui'
import type { BudgetControlRow, CategoryUsage } from '../../lib/budget'
import { formatRupiah } from '../../lib/money'

function describe(usage: CategoryUsage): { tone: 'ok' | 'warn' | 'bad' | 'primary'; note: string; noteClass: string } {
  if (usage.kind === 'tabungan') {
    return usage.status === 'tercapai'
      ? { tone: 'ok', note: 'Target tercapai', noteClass: 'text-ok' }
      : { tone: 'primary', note: `kurang ${formatRupiah(usage.shortfall)}`, noteClass: 'text-muted' }
  }
  if (usage.status === 'lewat') {
    return { tone: 'bad', note: `lewat ${formatRupiah(-usage.remaining)}`, noteClass: 'text-bad' }
  }
  return {
    tone: usage.status === 'waspada' ? 'warn' : 'ok',
    note: `sisa ${formatRupiah(usage.remaining)}`,
    noteClass: usage.status === 'waspada' ? 'text-warn' : 'text-muted',
  }
}

/** Daftar pos: terpakai vs batas. Hijau < 80%, kuning 80-100%, merah lewat batas; tabungan terbalik. */
export function BudgetControl({ rows }: { rows: readonly BudgetControlRow[] }) {
  return (
    <ul className="space-y-4">
      {rows.map(({ category, usage }) => {
        const { tone, note, noteClass } = describe(usage)
        return (
          <li key={category.id} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium">
                {category.name}
                {category.archived && <span className="font-normal text-muted"> (diarsipkan)</span>}
              </span>
              <span className="num shrink-0 text-muted">
                {formatRupiah(usage.used)} / {formatRupiah(usage.limit)}
              </span>
            </div>
            <ProgressBar valueBp={usage.barBp} tone={tone} label={category.name} />
            <p className={`num text-xs ${noteClass}`}>{note}</p>
          </li>
        )
      })}
    </ul>
  )
}
