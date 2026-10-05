import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { BackLink } from '../components/BackLink'
import { Button, Card, EmptyState, ErrorMessage, inputClass, PageHeader } from '../components/ui'
import {
  listBudgetsInYear,
  listCategories,
  listCategoryTotalsInYear,
  listMonthlyTotals,
  listTransactionsInRange,
} from '../db/finance'
import type { BudgetCategory } from '../db/types'
import { useQuery } from '../db/useQuery'
import { downloadText, transactionsCsv } from '../features/finance/exportCsv'
import { formatBulan, parseISODate, todayJakarta, toMonthParam, yearRange } from '../lib/dates'
import { formatPercentBp, formatRupiah } from '../lib/money'
import {
  availableYears,
  compareYears,
  overBudgetCounts,
  yearMonths,
  type MonthTotalsLike,
  type OverBudgetCount,
} from '../lib/report'

function useYearParam(currentYear: number): [number, (year: number) => void] {
  const [params, setParams] = useSearchParams()
  const raw = Number(params.get('tahun'))
  const year = Number.isInteger(raw) && raw >= 2000 && raw <= 9999 ? raw : currentYear
  const setYear = (next: number) => setParams({ tahun: String(next) }, { replace: true })
  return [year, setYear]
}

function signedRupiah(value: number): string {
  return value > 0 ? `+${formatRupiah(value)}` : formatRupiah(value)
}

export default function LaporanTahunanPage() {
  const currentYear = parseISODate(todayJakarta()).year
  const [year, setYear] = useYearParam(currentYear)

  const query = useQuery(async () => {
    const [totals, categories, categoryTotals, budgets] = await Promise.all([
      listMonthlyTotals(),
      listCategories(),
      listCategoryTotalsInYear(year),
      listBudgetsInYear(year),
    ])
    return { totals, categories, categoryTotals, budgets }
  }, [year])

  const data = query.data
  const totals = (data?.totals ?? []).map((t) => ({ month: t.month, income: t.income, totalOut: t.total_out, saved: t.saved }))
  const years = availableYears(totals, currentYear)
  if (!years.includes(year)) years.push(year)
  years.sort((a, b) => b - a)
  const hasData = totals.some((t) => parseISODate(t.month).year === year)

  return (
    <>
      <BackLink to="/laporan" label="Laporan" />
      <PageHeader
        title="Laporan tahunan"
        subtitle="Pemasukan, pengeluaran, dan tabungan per bulan dalam satu tahun"
        actions={
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted">Tahun</span>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={`${inputClass} num w-auto py-1.5`}>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        }
      />

      {query.error && <ErrorMessage error={query.error} onRetry={query.reload} />}
      {!data && !query.error && <p className="text-sm text-muted">Memuat…</p>}
      {data && !hasData && (
        <EmptyState title={`Belum ada transaksi di tahun ${year}.`} description="Laporan muncul setelah ada transaksi yang tercatat." />
      )}

      {data && hasData && (
        <div className="space-y-4">
          <YearSummaryCard year={year} totals={totals} />
          <MonthsTable year={year} totals={totals} />
          <OverBudgetCard
            categories={new Map(data.categories.map((c) => [c.id, c]))}
            items={overBudgetCounts(
              data.budgets.months,
              data.budgets.items,
              data.categoryTotals.map((t) => ({ month: t.month, categoryId: t.category_id, amount: t.total_out })),
              new Map(data.categories.map((c) => [c.id, c.type])),
            )}
            hasBudget={data.budgets.months.size > 0}
          />
          <YearCsvCard year={year} categories={data.categories} />
        </div>
      )}
    </>
  )
}

function YearSummaryCard({ year, totals }: { year: number; totals: readonly MonthTotalsLike[] }) {
  const { current, previous, diff } = compareYears(totals, year)
  const hasPrevious = previous.income > 0 || previous.totalOut > 0
  const rows: { label: string; value: number; diff?: number; goodWhenUp?: boolean }[] = [
    { label: 'Pemasukan', value: current.income, diff: diff.income, goodWhenUp: true },
    { label: 'Pengeluaran', value: current.spending, diff: diff.spending, goodWhenUp: false },
    { label: 'Ditabung', value: current.saved, diff: diff.saved, goodWhenUp: true },
    { label: 'Sisa', value: current.remaining },
  ]
  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Total {year}</h2>
        <p className="text-sm text-muted">
          Rasio tabungan <span className="num font-medium text-text">{formatPercentBp(current.savingsRatioBp)}</span>
          {hasPrevious && <> (tahun lalu {formatPercentBp(previous.savingsRatioBp)})</>}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {rows.map((r) => (
          <div key={r.label} className="rounded-xl bg-surface-2 px-3 py-2">
            <dt className="text-xs text-muted">{r.label}</dt>
            <dd className={`num text-lg font-semibold ${r.value < 0 ? 'text-bad' : ''}`}>{formatRupiah(r.value)}</dd>
            {hasPrevious && r.diff !== undefined && (
              <dd
                className={`num text-xs ${
                  r.diff === 0 ? 'text-muted' : (r.diff > 0) === r.goodWhenUp ? 'text-ok' : 'text-bad'
                }`}
              >
                {signedRupiah(r.diff)} vs {year - 1}
              </dd>
            )}
          </div>
        ))}
      </dl>
      {!hasPrevious && <p className="mt-3 text-xs text-muted">Belum ada data {year - 1} untuk dibandingkan.</p>}
    </Card>
  )
}

function MonthsTable({ year, totals }: { year: number; totals: readonly MonthTotalsLike[] }) {
  const months = yearMonths(totals, year)
  const cell = (empty: boolean, value: number) => (empty ? '–' : formatRupiah(value))
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="text-left text-xs text-muted">
          <tr className="border-b border-border">
            <th className="px-4 py-3 font-medium">Bulan</th>
            <th className="px-4 py-3 text-right font-medium">Pemasukan</th>
            <th className="px-4 py-3 text-right font-medium">Pengeluaran</th>
            <th className="px-4 py-3 text-right font-medium">Ditabung</th>
            <th className="px-4 py-3 text-right font-medium">Sisa</th>
            <th className="px-4 py-3 text-right font-medium">Rasio tabungan</th>
          </tr>
        </thead>
        <tbody className="num divide-y divide-border">
          {months.map(({ month, summary: s }) => {
            const empty = s.income === 0 && s.totalOut === 0
            return (
              <tr key={month} className={empty ? 'text-muted' : 'hover:bg-surface-2'}>
                <td className="px-4 py-3 font-sans">
                  {empty ? (
                    formatBulan(month)
                  ) : (
                    <Link to={`/keuangan?bulan=${toMonthParam(month)}`} className="font-medium text-primary">
                      {formatBulan(month)}
                    </Link>
                  )}
                </td>
                <td className="px-4 py-3 text-right">{cell(empty, s.income)}</td>
                <td className="px-4 py-3 text-right">{cell(empty, s.spending)}</td>
                <td className="px-4 py-3 text-right">{cell(empty, s.saved)}</td>
                <td className={`px-4 py-3 text-right ${s.remaining < 0 ? 'text-bad' : ''}`}>{cell(empty, s.remaining)}</td>
                <td className="px-4 py-3 text-right">{empty ? '–' : formatPercentBp(s.savingsRatioBp)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}

function OverBudgetCard({
  categories,
  items,
  hasBudget,
}: {
  categories: ReadonlyMap<string, { name: string }>
  items: readonly OverBudgetCount[]
  hasBudget: boolean
}) {
  return (
    <Card>
      <h2 className="mb-1 font-semibold">Pos yang paling sering lewat batas</h2>
      <p className="mb-3 text-xs text-muted">Dihitung dari bulan yang punya anggaran. Pos tabungan tidak dihitung.</p>
      {!hasBudget ? (
        <p className="text-sm text-muted">Belum ada anggaran bulanan di tahun ini.</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-ok">Tidak ada pos yang lewat batas. Mantap.</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.categoryId} className="flex items-start justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{categories.get(item.categoryId)?.name ?? 'Pos terhapus'}</p>
                <p className="text-xs text-muted">{item.months.map((m) => formatBulan(m).slice(0, 3)).join(', ')}</p>
              </div>
              <span className="num shrink-0 font-medium text-bad">{item.months.length}×</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function YearCsvCard({ year, categories }: { year: number; categories: readonly BudgetCategory[] }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExport() {
    setBusy(true)
    setError(null)
    try {
      const { start, end } = yearRange(year)
      const transactions = await listTransactionsInRange(start, end)
      downloadText(`transaksi-${year}.csv`, transactionsCsv(transactions, new Map(categories.map((c) => [c.id, c]))))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="font-semibold">Ekspor CSV {year}</h2>
        <p className="text-sm text-muted">Semua transaksi tahun ini dalam satu file.</p>
        {error && (
          <p role="alert" className="mt-1 text-sm text-bad">
            Gagal: {error}
          </p>
        )}
      </div>
      <Button variant="secondary" onClick={handleExport} disabled={busy}>
        {busy ? 'Menyiapkan…' : 'Unduh CSV'}
      </Button>
    </Card>
  )
}
