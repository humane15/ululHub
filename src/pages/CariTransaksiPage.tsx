import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { BackLink } from '../components/BackLink'
import { ChevronLeftIcon, ChevronRightIcon } from '../components/icons'
import { Sheet } from '../components/Sheet'
import { Button, Card, EmptyState, ErrorMessage, inputClass, PageHeader } from '../components/ui'
import { listCategories, searchTransactions } from '../db/finance'
import type { Transaction } from '../db/types'
import { useQuery } from '../db/useQuery'
import { TransactionForm, type TransactionDraft } from '../features/finance/TransactionForm'
import { TransactionList } from '../features/finance/TransactionList'
import { formatThousands } from '../lib/money'
import {
  EMPTY_FILTER,
  hasActiveFilter,
  pageCount,
  parseFilterParams,
  SEARCH_PAGE_SIZE,
  toFilterParams,
  type TransactionFilter,
} from '../lib/search'

export default function CariTransaksiPage() {
  const [params, setParams] = useSearchParams()
  const filter = parseFilterParams(params)
  const key = toFilterParams(filter).toString()
  const [editing, setEditing] = useState<TransactionDraft | null>(null)

  const categories = useQuery(listCategories, [])
  const results = useQuery(() => searchTransactions(filter), [key])

  const apply = (next: TransactionFilter) => setParams(toFilterParams(next), { replace: true })
  const byId = new Map((categories.data ?? []).map((c) => [c.id, c]))
  const pages = pageCount(results.data?.total ?? 0)

  const openEdit = (t: Transaction) =>
    setEditing({
      id: t.id,
      type: t.type,
      date: t.date,
      categoryId: t.category_id,
      incomeSource: t.income_source ?? 'gaji',
      amount: t.amount,
      note: t.note,
    })

  return (
    <>
      <BackLink to="/keuangan" label="Keuangan" />
      <PageHeader title="Cari transaksi" subtitle="Filter berdasarkan tanggal, pos, dan kata kunci catatan" />

      <div className="space-y-4">
        <FilterForm key={key} initial={filter} categories={categories.data ?? []} onApply={apply} />

        {results.error && <ErrorMessage error={results.error} onRetry={results.reload} />}
        {!results.data && !results.error && <p className="text-sm text-muted">Memuat…</p>}

        {results.data && (
          <Card>
            <p className="mb-2 text-sm text-muted" aria-live="polite">
              {results.data.total === 0
                ? 'Tidak ada transaksi yang cocok.'
                : `${formatThousands(results.data.total)} transaksi${hasActiveFilter(filter) ? ' cocok' : ''}`}
            </p>
            {results.data.total === 0 ? (
              <EmptyState
                title="Tidak ditemukan."
                description={hasActiveFilter(filter) ? 'Coba longgarkan filter atau ganti kata kunci.' : 'Belum ada transaksi.'}
              />
            ) : (
              <TransactionList transactions={results.data.rows} categories={byId} onSelect={openEdit} />
            )}
            {pages > 1 && (
              <nav className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3" aria-label="Halaman">
                <Button
                  variant="secondary"
                  disabled={filter.page <= 1 || results.loading}
                  onClick={() => apply({ ...filter, page: filter.page - 1 })}
                >
                  <ChevronLeftIcon className="size-4" />
                  Sebelumnya
                </Button>
                <span className="num text-sm text-muted">
                  {Math.min(filter.page, pages)} / {pages}
                </span>
                <Button
                  variant="secondary"
                  disabled={filter.page >= pages || results.loading}
                  onClick={() => apply({ ...filter, page: filter.page + 1 })}
                >
                  Berikutnya
                  <ChevronRightIcon className="size-4" />
                </Button>
              </nav>
            )}
          </Card>
        )}
      </div>

      <Sheet open={editing !== null} title="Edit transaksi" onClose={() => setEditing(null)}>
        {editing && categories.data && (
          <TransactionForm
            initial={editing}
            categories={categories.data}
            onDone={() => {
              setEditing(null)
              results.reload()
            }}
          />
        )}
      </Sheet>
    </>
  )
}

function FilterForm({
  initial,
  categories,
  onApply,
}: {
  initial: TransactionFilter
  categories: readonly { id: string; name: string; archived_at: string | null }[]
  onApply: (filter: TransactionFilter) => void
}) {
  const [draft, setDraft] = useState(initial)
  const set = (patch: Partial<TransactionFilter>) => setDraft((d) => ({ ...d, ...patch }))
  const invalidRange = draft.from !== null && draft.to !== null && draft.from > draft.to

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!invalidRange) onApply({ ...draft, page: 1 })
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Kata kunci catatan</span>
          <input
            type="search"
            value={draft.keyword}
            onChange={(e) => set({ keyword: e.target.value })}
            placeholder="contoh: kopi, bensin, buku"
            className={inputClass}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Dari tanggal</span>
            <input
              type="date"
              value={draft.from ?? ''}
              onChange={(e) => set({ from: e.target.value || null })}
              className={`${inputClass} num`}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Sampai tanggal</span>
            <input
              type="date"
              value={draft.to ?? ''}
              onChange={(e) => set({ to: e.target.value || null })}
              className={`${inputClass} num`}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Pos</span>
            <select value={draft.category ?? ''} onChange={(e) => set({ category: e.target.value || null })} className={inputClass}>
              <option value="">Semua</option>
              <option value="pemasukan">Semua pemasukan</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.archived_at ? ' (diarsipkan)' : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
        {invalidRange && (
          <p role="alert" className="text-sm text-bad">
            Tanggal awal harus sebelum tanggal akhir.
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={invalidRange}>
            Cari
          </Button>
          {hasActiveFilter(draft) && (
            <Button
              variant="secondary"
              onClick={() => {
                setDraft(EMPTY_FILTER)
                onApply(EMPTY_FILTER)
              }}
            >
              Hapus filter
            </Button>
          )}
        </div>
        <p className="text-xs text-muted">Menampilkan {SEARCH_PAGE_SIZE} transaksi per halaman, terbaru dulu.</p>
      </form>
    </Card>
  )
}
