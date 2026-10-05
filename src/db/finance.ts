import type { CategoryLike, CategoryType } from '../lib/budget'
import { monthRange, yearRange, type ISODate } from '../lib/dates'
import { containsPattern, pageRange, SEARCH_PAGE_SIZE, type TransactionFilter } from '../lib/search'
import { DbError, FK_VIOLATION, fail } from './errors'
import { supabase } from './supabase'
import type { BudgetCategory, BudgetMonth, Database, MonthlyCategoryTotal, MonthlyTotal, Transaction } from './types'

type TransactionInsert = Database['public']['Tables']['transactions']['Insert']

export function toCategoryLike(c: BudgetCategory): CategoryLike {
  return { id: c.id, name: c.name, type: c.type, sortOrder: c.sort_order, archived: c.archived_at !== null }
}

// ---------- Kategori ----------

/** Semua kategori termasuk yang diarsipkan (dibutuhkan untuk menampilkan transaksi lama). */
export async function listCategories(): Promise<BudgetCategory[]> {
  const { data, error } = await supabase
    .from('budget_categories')
    .select('*')
    .order('sort_order')
    .order('name')
  if (error) fail(error)
  return data
}

export async function createCategory(input: { name: string; type: CategoryType; sortOrder: number }) {
  const { error } = await supabase
    .from('budget_categories')
    .insert({ name: input.name.trim(), type: input.type, sort_order: input.sortOrder })
  if (error) fail(error)
}

export async function updateCategory(
  id: string,
  patch: Partial<Pick<BudgetCategory, 'name' | 'type' | 'sort_order' | 'archived_at'>>,
) {
  const { error } = await supabase.from('budget_categories').update(patch).eq('id', id)
  if (error) fail(error)
}

export async function setCategoryArchived(id: string, archived: boolean) {
  await updateCategory(id, { archived_at: archived ? new Date().toISOString() : null })
}

/** Hapus permanen; ditolak database kalau pos sudah dipakai di anggaran atau transaksi. */
export async function deleteCategory(id: string) {
  const { error } = await supabase.from('budget_categories').delete().eq('id', id)
  if (error?.code === FK_VIOLATION) {
    throw new DbError('Pos ini sudah dipakai di anggaran atau transaksi, jadi tidak bisa dihapus. Arsipkan saja.', error.code)
  }
  if (error) fail(error)
}

/** Simpan urutan baru (sort_order = posisi + 1). */
export async function reorderCategories(ids: readonly string[]) {
  const results = await Promise.all(
    ids.map((id, i) => supabase.from('budget_categories').update({ sort_order: i + 1 }).eq('id', id)),
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) fail(failed.error)
}

// ---------- Anggaran per bulan ----------

export interface MonthBudget {
  month: BudgetMonth
  /** category_id -> nominal */
  items: Map<string, number>
}

async function loadItems(budgetMonthId: string): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('budget_month_items')
    .select('category_id, amount')
    .eq('budget_month_id', budgetMonthId)
  if (error) fail(error)
  return new Map(data.map((i) => [i.category_id, i.amount]))
}

/** Anggaran satu bulan, null kalau belum dibuat. */
export async function getMonthBudget(month: ISODate): Promise<MonthBudget | null> {
  const { data, error } = await supabase.from('budget_months').select('*').eq('month', month).maybeSingle()
  if (error) fail(error)
  if (!data) return null
  return { month: data, items: await loadItems(data.id) }
}

/** Anggaran terakhir sebelum `month` (sumber "Salin anggaran dari bulan sebelumnya"). */
export async function getPreviousMonthBudget(month: ISODate): Promise<MonthBudget | null> {
  const { data, error } = await supabase
    .from('budget_months')
    .select('*')
    .lt('month', month)
    .order('month', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) fail(error)
  if (!data) return null
  return { month: data, items: await loadItems(data.id) }
}

/**
 * Membuat anggaran bulan baru. Pos yang sudah diarsipkan tidak ikut disalin.
 * Anggaran bulan lain tidak tersentuh.
 */
export async function createMonthBudget(
  month: ISODate,
  income: number,
  items: ReadonlyMap<string, number>,
): Promise<void> {
  const { data, error } = await supabase.from('budget_months').insert({ month, income }).select('id').single()
  if (error) fail(error)
  const rows = [...items].map(([category_id, amount]) => ({ budget_month_id: data.id, category_id, amount }))
  if (rows.length === 0) return
  const { error: itemsError } = await supabase.from('budget_month_items').insert(rows)
  if (itemsError) {
    // Jangan tinggalkan bulan setengah jadi.
    await supabase.from('budget_months').delete().eq('id', data.id)
    fail(itemsError)
  }
}

/** Menyimpan gaji dan nominal pos satu bulan. Nominal 0 = pos dihapus dari bulan ini. */
export async function saveMonthBudget(
  budgetMonthId: string,
  income: number,
  items: ReadonlyMap<string, number>,
): Promise<void> {
  const { error } = await supabase.from('budget_months').update({ income }).eq('id', budgetMonthId)
  if (error) fail(error)

  const keep = [...items].filter(([, amount]) => amount > 0)
  const remove = [...items].filter(([, amount]) => amount === 0).map(([id]) => id)

  if (keep.length > 0) {
    const { error: upsertError } = await supabase.from('budget_month_items').upsert(
      keep.map(([category_id, amount]) => ({ budget_month_id: budgetMonthId, category_id, amount })),
      { onConflict: 'budget_month_id,category_id' },
    )
    if (upsertError) fail(upsertError)
  }
  if (remove.length > 0) {
    const { error: deleteError } = await supabase
      .from('budget_month_items')
      .delete()
      .eq('budget_month_id', budgetMonthId)
      .in('category_id', remove)
    if (deleteError) fail(deleteError)
  }
}

// ---------- Transaksi ----------

/** Transaksi satu bulan, terbaru dulu. Selalu dibatasi rentang tanggal. */
export async function listMonthTransactions(month: ISODate): Promise<Transaction[]> {
  const { start, end } = monthRange(month)
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('date', start)
    .lt('date', end)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) fail(error)
  return data
}

/** Batas baris per permintaan PostgREST (bawaan Supabase: 1000). */
const FETCH_CHUNK = 1000

/** Semua transaksi dalam rentang [start, end), diambil per 1000 baris. Urut tanggal lama -> baru. */
export async function listTransactionsInRange(start: ISODate, end: ISODate): Promise<Transaction[]> {
  const all: Transaction[] = []
  for (let from = 0; ; from += FETCH_CHUNK) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .gte('date', start)
      .lt('date', end)
      .order('date')
      .order('created_at')
      .order('id')
      .range(from, from + FETCH_CHUNK - 1)
    if (error) fail(error)
    all.push(...data)
    if (data.length < FETCH_CHUNK) return all
  }
}

export interface SearchResult {
  rows: Transaction[]
  /** Jumlah semua baris yang cocok (untuk paginasi). */
  total: number
}

/** Pencarian transaksi per halaman (terbaru dulu). Tidak pernah memuat semua transaksi. */
export async function searchTransactions(filter: TransactionFilter): Promise<SearchResult> {
  let q = supabase.from('transactions').select('*', { count: 'exact' })
  if (filter.from) q = q.gte('date', filter.from)
  if (filter.to) q = q.lte('date', filter.to)
  if (filter.category === 'pemasukan') q = q.eq('type', 'masuk')
  else if (filter.category) q = q.eq('category_id', filter.category)
  if (filter.keyword.trim()) q = q.ilike('note', containsPattern(filter.keyword))
  const { from, to } = pageRange(filter.page, SEARCH_PAGE_SIZE)
  const { data, error, count } = await q
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id')
    .range(from, to)
  if (error) fail(error)
  return { rows: data, total: count ?? 0 }
}

export type TransactionInput = Pick<TransactionInsert, 'date' | 'type' | 'category_id' | 'income_source' | 'amount' | 'note'>

export async function createTransaction(input: TransactionInput) {
  const { error } = await supabase.from('transactions').insert(input)
  if (error) fail(error)
}

export async function updateTransaction(id: string, input: TransactionInput) {
  const { error } = await supabase.from('transactions').update(input).eq('id', id)
  if (error) fail(error)
}

export async function deleteTransaction(id: string) {
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) fail(error)
}

// ---------- Laporan ----------

/** Total semua bulan yang punya transaksi, terbaru dulu. */
export async function listMonthlyTotals(): Promise<MonthlyTotal[]> {
  const { data, error } = await supabase
    .from('monthly_totals')
    .select('*')
    .order('month', { ascending: false })
  if (error) fail(error)
  return data
}

/** Uang keluar per pos per bulan dalam satu tahun. */
export async function listCategoryTotalsInYear(year: number): Promise<MonthlyCategoryTotal[]> {
  const { start, end } = yearRange(year)
  const { data, error } = await supabase.from('monthly_category_totals').select('*').gte('month', start).lt('month', end)
  if (error) fail(error)
  return data
}

export interface YearBudgets {
  /** Bulan (tanggal 1) yang punya anggaran. */
  months: Set<ISODate>
  items: { month: ISODate; categoryId: string; amount: number }[]
}

/** Anggaran semua bulan dalam satu tahun. */
export async function listBudgetsInYear(year: number): Promise<YearBudgets> {
  const { start, end } = yearRange(year)
  const { data: months, error } = await supabase.from('budget_months').select('id, month').gte('month', start).lt('month', end)
  if (error) fail(error)
  if (months.length === 0) return { months: new Set(), items: [] }
  const { data: items, error: itemsError } = await supabase
    .from('budget_month_items')
    .select('budget_month_id, category_id, amount')
    .in('budget_month_id', months.map((m) => m.id))
  if (itemsError) fail(itemsError)
  const monthById = new Map(months.map((m) => [m.id, m.month]))
  return {
    months: new Set(months.map((m) => m.month)),
    items: items.map((i) => ({ month: monthById.get(i.budget_month_id)!, categoryId: i.category_id, amount: i.amount })),
  }
}
