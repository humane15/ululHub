import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Sheet } from '../components/Sheet'
import { EmptyState, ErrorMessage, PageHeader } from '../components/ui'
import { getMonthBudget, listCategories, listMonthTransactions, toCategoryLike } from '../db/finance'
import { getActiveCycle, getCycleDetail, type CycleDetail } from '../db/learning'
import type { LearningCycle } from '../db/types'
import { useQuery, type QueryState } from '../db/useQuery'
import { MoneyTodayCard } from '../features/dashboard/MoneyTodayCard'
import { TodayLearningCard } from '../features/dashboard/TodayLearningCard'
import { TransactionForm, type TransactionDraft } from '../features/finance/TransactionForm'
import { ScoreCard } from '../features/learning/ScoreCard'
import { useCycleActions, type ActiveCycleData } from '../features/learning/useCycleActions'
import { budgetControlRows, spentByCategory, summarizeMonth } from '../lib/budget'
import { cyclePosition, formatBulan, formatTanggal, monthStart, namaHari, todayJakarta, weekdayIso } from '../lib/dates'
import { tacticProgress } from '../lib/learning'

export default function BerandaPage() {
  const today = todayJakarta()
  const month = monthStart(today)

  const learning = useQuery<ActiveCycleData>(async () => {
    const cycle = await getActiveCycle()
    return cycle ? { cycle, detail: await getCycleDetail(cycle.id) } : { cycle: null }
  }, [])

  const finance = useQuery(async () => {
    const [categories, budget, transactions] = await Promise.all([
      listCategories(),
      getMonthBudget(month),
      listMonthTransactions(month),
    ])
    return { categories, budget, transactions }
  }, [month])

  return (
    <>
      <PageHeader title="Beranda" subtitle={`${namaHari(weekdayIso(today))}, ${formatTanggal(today)}`} />
      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <div className="space-y-4">
          <LearningSection query={learning} today={today} />
        </div>
        <FinanceSection query={finance} monthLabel={formatBulan(month)} today={today} />
      </div>
    </>
  )
}

function LearningSection({ query, today }: { query: QueryState<ActiveCycleData>; today: string }) {
  if (query.error && !query.data) return <ErrorMessage error={query.error} onRetry={query.reload} />
  if (!query.data) return <p className="text-sm text-muted">Memuat rencana belajar…</p>
  if (!query.data.cycle) {
    return (
      <EmptyState
        title="Belum ada siklus belajar aktif."
        action={
          <Link to="/belajar/siklus-baru" className="text-sm font-medium text-primary">
            Buat siklus baru
          </Link>
        }
      />
    )
  }
  return <ActiveLearning cycle={query.data.cycle} detail={query.data.detail} query={query} today={today} />
}

function ActiveLearning({
  cycle,
  detail,
  query,
  today,
}: {
  cycle: LearningCycle
  detail: CycleDetail
  query: QueryState<ActiveCycleData>
  today: string
}) {
  const actions = useCycleActions(cycle.id, query)
  const position = cyclePosition(cycle.start_date, today)
  return (
    <>
      <TodayLearningCard cycle={cycle} detail={detail} today={today} actions={actions} />
      {position.kind === 'minggu' && (
        <ScoreCard
          title={`Skor minggu ${position.week}`}
          progress={tacticProgress(detail.tactics.filter((t) => t.week_number === position.week))}
        />
      )}
    </>
  )
}

type FinanceData = {
  categories: Awaited<ReturnType<typeof listCategories>>
  budget: Awaited<ReturnType<typeof getMonthBudget>>
  transactions: Awaited<ReturnType<typeof listMonthTransactions>>
}

function FinanceSection({ query, monthLabel, today }: { query: QueryState<FinanceData>; monthLabel: string; today: string }) {
  const [draft, setDraft] = useState<TransactionDraft | null>(null)
  const view = useMemo(() => {
    if (!query.data) return null
    const { categories, budget, transactions } = query.data
    const likes = transactions.map((t) => ({ type: t.type, categoryId: t.category_id, amount: t.amount }))
    const rows = budgetControlRows(categories.map(toCategoryLike), budget?.items ?? new Map(), spentByCategory(likes))
    return {
      summary: summarizeMonth(likes, new Map(categories.map((c) => [c.id, c.type]))),
      attention: rows.filter((r) => r.usage.kind === 'pengeluaran' && r.usage.status !== 'aman'),
    }
  }, [query.data])

  if (query.error && !query.data) return <ErrorMessage error={query.error} onRetry={query.reload} />
  if (!query.data || !view) return <p className="text-sm text-muted">Memuat keuangan…</p>

  return (
    <>
      <MoneyTodayCard
        monthLabel={monthLabel}
        summary={view.summary}
        attention={view.attention}
        hasBudget={query.data.budget !== null}
        onAddExpense={() => setDraft({ type: 'keluar', date: today, categoryId: null, incomeSource: 'gaji', amount: null, note: '' })}
      />
      <Sheet open={draft !== null} title="Catat pengeluaran" onClose={() => setDraft(null)}>
        {draft && (
          <TransactionForm
            initial={draft}
            categories={query.data.categories}
            onDone={() => {
              setDraft(null)
              query.reload()
            }}
          />
        )}
      </Sheet>
    </>
  )
}
