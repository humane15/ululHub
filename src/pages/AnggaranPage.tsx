import { useState } from 'react'
import { BackLink } from '../components/BackLink'
import { MonthNav } from '../components/MonthNav'
import { Button, Card, ErrorMessage, PageHeader } from '../components/ui'
import { createMonthBudget, getMonthBudget, getPreviousMonthBudget, listCategories } from '../db/finance'
import { useQuery } from '../db/useQuery'
import { BudgetEditor } from '../features/finance/BudgetEditor'
import { CategoryManager } from '../features/finance/CategoryManager'
import { useMonthParam } from '../features/finance/useMonthParam'
import { formatBulan, toMonthParam } from '../lib/dates'
import { formatRupiah } from '../lib/money'

export default function AnggaranPage() {
  const [month, setMonth] = useMonthParam()
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const query = useQuery(async () => {
    const [categories, budget] = await Promise.all([listCategories(), getMonthBudget(month)])
    const previous = budget ? null : await getPreviousMonthBudget(month)
    return { categories, budget, previous }
  }, [month])
  const data = query.data

  async function create(copy: boolean) {
    if (!data) return
    setCreating(true)
    setCreateError(null)
    try {
      const archived = new Set(data.categories.filter((c) => c.archived_at !== null).map((c) => c.id))
      const source = copy ? data.previous : null
      const items = new Map([...(source?.items ?? [])].filter(([id]) => !archived.has(id)))
      await createMonthBudget(month, source?.month.income ?? 0, items)
      query.reload()
    } catch (e) {
      setCreateError((e as Error).message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <BackLink to={`/keuangan?bulan=${toMonthParam(month)}`} label="Keuangan" />
      <PageHeader title="Atur anggaran" subtitle="Zero based budget: setiap rupiah punya pos" actions={<MonthNav month={month} onChange={setMonth} />} />

      {query.error && <ErrorMessage error={query.error} onRetry={query.reload} />}
      {!data && !query.error && <p className="text-sm text-muted">Memuat…</p>}

      {data && (
        <div className="space-y-4">
          {data.budget ? (
            // key: editor diisi ulang saat pindah bulan.
            <BudgetEditor key={data.budget.month.id} budget={data.budget} categories={data.categories} onSaved={query.reload} />
          ) : (
            <Card className="space-y-3">
              <p className="font-medium">Belum ada anggaran untuk {formatBulan(month)}.</p>
              {data.previous ? (
                <p className="text-sm text-muted">
                  Salin dari {formatBulan(data.previous.month.month)} (pemasukan{' '}
                  <span className="num">{formatRupiah(data.previous.month.income)}</span>), lalu ubah seperlunya. Bulan lain
                  tidak akan berubah.
                </p>
              ) : (
                <p className="text-sm text-muted">Mulai dari nol, lalu isi pemasukan dan nominal tiap pos.</p>
              )}
              {createError && (
                <p role="alert" className="text-sm text-bad">
                  {createError}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {data.previous && (
                  <Button onClick={() => void create(true)} disabled={creating}>
                    Salin anggaran dari {formatBulan(data.previous.month.month)}
                  </Button>
                )}
                <Button variant={data.previous ? 'secondary' : 'primary'} onClick={() => void create(false)} disabled={creating}>
                  Mulai dari nol
                </Button>
              </div>
            </Card>
          )}

          <CategoryManager categories={data.categories} onChanged={query.reload} />
        </div>
      )}
    </>
  )
}
