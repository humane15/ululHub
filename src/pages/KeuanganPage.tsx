import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { PlusIcon } from '../components/icons'
import { MonthNav } from '../components/MonthNav'
import { Sheet } from '../components/Sheet'
import { Button, Card, EmptyState, ErrorMessage, PageHeader } from '../components/ui'
import { getMonthBudget, listCategories, listMonthTransactions, toCategoryLike } from '../db/finance'
import type { Transaction } from '../db/types'
import { useQuery } from '../db/useQuery'
import { BudgetControl } from '../features/finance/BudgetControl'
import { MonthSummaryCard } from '../features/finance/MonthSummaryCard'
import { TransactionForm, type TransactionDraft } from '../features/finance/TransactionForm'
import { TransactionList } from '../features/finance/TransactionList'
import { useMonthParam } from '../features/finance/useMonthParam'
import {
  budgetControlRows,
  savingsDepositSuggestion,
  spentByCategory,
  summarizeMonth,
  type TransactionLike,
} from '../lib/budget'
import { defaultDateInMonth, formatBulan, todayJakarta, toMonthParam } from '../lib/dates'

const toLike = (t: Transaction): TransactionLike => ({ type: t.type, categoryId: t.category_id, amount: t.amount })

export default function KeuanganPage() {
  const [month, setMonth] = useMonthParam()
  const [draft, setDraft] = useState<TransactionDraft | null>(null)

  const query = useQuery(async () => {
    const [categories, budget, transactions] = await Promise.all([
      listCategories(),
      getMonthBudget(month),
      listMonthTransactions(month),
    ])
    return { categories, budget, transactions }
  }, [month])

  const view = useMemo(() => {
    if (!query.data) return null
    const { categories, budget, transactions } = query.data
    const byId = new Map(categories.map((c) => [c.id, c]))
    const types = new Map(categories.map((c) => [c.id, c.type]))
    const likes = transactions.map(toLike)
    const spent = spentByCategory(likes)
    const items = budget?.items ?? new Map<string, number>()
    const savingsCategory = categories.find((c) => c.type === 'tabungan' && items.has(c.id))
    return {
      byId,
      summary: summarizeMonth(likes, types),
      rows: budgetControlRows(categories.map(toCategoryLike), items, spent),
      savingsCategory,
      savingsAmount: savingsCategory
        ? savingsDepositSuggestion(items.get(savingsCategory.id) ?? 0, spent.get(savingsCategory.id) ?? 0)
        : null,
    }
  }, [query.data])

  const data = query.data
  const anggaranLink = `/keuangan/anggaran?bulan=${toMonthParam(month)}`
  const baseDraft = (): TransactionDraft => ({
    type: 'keluar',
    date: defaultDateInMonth(month, todayJakarta()),
    categoryId: null,
    incomeSource: 'gaji',
    amount: null,
    note: '',
  })

  const openEdit = (t: Transaction) =>
    setDraft({
      id: t.id,
      type: t.type,
      date: t.date,
      categoryId: t.category_id,
      incomeSource: t.income_source ?? 'gaji',
      amount: t.amount,
      note: t.note,
    })

  const closeSheet = () => setDraft(null)
  const afterSave = () => {
    setDraft(null)
    query.reload()
  }

  return (
    <>
      <PageHeader title="Keuangan" actions={<MonthNav month={month} onChange={setMonth} />} />

      {query.error && <ErrorMessage error={query.error} onRetry={query.reload} />}
      {!view && !query.error && <p className="text-sm text-muted">Memuat…</p>}

      {view && data && (
        <div className="space-y-4">
          <MonthSummaryCard summary={view.summary} />

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setDraft(baseDraft())}>
              <PlusIcon className="size-4" />
              Catat transaksi
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                setDraft({
                  ...baseDraft(),
                  type: 'masuk',
                  incomeSource: 'gaji',
                  amount: data.budget?.month.income || null,
                  note: `Gaji ${formatBulan(month)}`,
                })
              }
            >
              Catat gaji
            </Button>
            {view.savingsCategory && (
              <Button
                variant="secondary"
                onClick={() =>
                  setDraft({ ...baseDraft(), categoryId: view.savingsCategory!.id, amount: view.savingsAmount })
                }
              >
                Setor tabungan
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 md:items-start">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">Kontrol anggaran</h2>
                <Link to={anggaranLink} className="text-sm font-medium text-primary">
                  Atur anggaran
                </Link>
              </div>
              {!data.budget ? (
                <EmptyState
                  title={`Belum ada anggaran untuk ${formatBulan(month)}.`}
                  action={
                    <Link to={anggaranLink} className="text-sm font-medium text-primary">
                      Buat anggaran
                    </Link>
                  }
                />
              ) : view.rows.length === 0 ? (
                <EmptyState title="Anggaran bulan ini belum punya pos." />
              ) : (
                <BudgetControl rows={view.rows} />
              )}
            </Card>

            <Card>
              <h2 className="mb-2 font-semibold">Riwayat transaksi</h2>
              {data.transactions.length === 0 ? (
                <EmptyState title="Belum ada transaksi bulan ini." description="Mulai dengan mencatat gaji." />
              ) : (
                <TransactionList transactions={data.transactions} categories={view.byId} onSelect={openEdit} />
              )}
            </Card>
          </div>
        </div>
      )}

      <Sheet open={draft !== null} title={draft?.id ? 'Edit transaksi' : 'Catat transaksi'} onClose={closeSheet}>
        {draft && data && (
          <TransactionForm initial={draft} categories={data.categories} onDone={afterSave} />
        )}
      </Sheet>
    </>
  )
}
