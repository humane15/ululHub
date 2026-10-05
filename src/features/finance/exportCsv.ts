import type { BudgetCategory, Transaction } from '../../db/types'
import { toCsv, UTF8_BOM } from '../../lib/csv'

const HEADER = ['Tanggal', 'Jenis', 'Pos', 'Sumber', 'Jumlah', 'Catatan']

/** CSV transaksi (urut tanggal lama -> baru). Jumlah berupa integer rupiah tanpa pemisah ribuan. */
export function transactionsCsv(transactions: readonly Transaction[], categories: ReadonlyMap<string, BudgetCategory>): string {
  const rows = [...transactions]
    .sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at))
    .map((t) => [
      t.date,
      t.type === 'masuk' ? 'Pemasukan' : 'Pengeluaran',
      t.category_id ? (categories.get(t.category_id)?.name ?? '') : '',
      t.income_source === 'gaji' ? 'Gaji' : t.income_source === 'lain' ? 'Lain lain' : '',
      t.amount,
      t.note,
    ])
  return toCsv(HEADER, rows)
}

/** Mengunduh teks sebagai file di browser. */
export function downloadText(filename: string, text: string, mime = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([UTF8_BOM, text], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
