import type { CategoryType } from '../../lib/budget'
import type { BudgetCategory, Transaction } from '../../db/types'

export const CATEGORY_TYPE_LABEL: Record<CategoryType, string> = {
  tabungan: 'Tabungan',
  kebutuhan: 'Kebutuhan',
  belajar: 'Belajar',
  keinginan: 'Keinginan',
}

export const CATEGORY_TYPES = Object.keys(CATEGORY_TYPE_LABEL) as CategoryType[]

/** Judul baris transaksi: nama pos untuk pengeluaran, sumber untuk pemasukan. */
export function transactionTitle(t: Transaction, categories: ReadonlyMap<string, BudgetCategory>): string {
  if (t.type === 'masuk') {
    const source = t.income_source === 'gaji' ? 'Gaji' : 'Pemasukan lain'
    const category = t.category_id ? categories.get(t.category_id)?.name : undefined
    return category ? `${source} · ${category}` : source
  }
  return (t.category_id && categories.get(t.category_id)?.name) || 'Tanpa pos'
}
