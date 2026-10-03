import { ratioBp, sumRupiah, type BasisPoints } from './money'

export type CategoryType = 'tabungan' | 'kebutuhan' | 'belajar' | 'keinginan'
export type TransactionType = 'masuk' | 'keluar'

export interface TransactionLike {
  type: TransactionType
  categoryId: string | null
  amount: number
}

export interface MonthSummary {
  /** Total pemasukan. */
  income: number
  /** Semua uang keluar, termasuk setoran tabungan. */
  totalOut: number
  /** Setoran ke pos bertipe tabungan. */
  saved: number
  /** Pengeluaran sebenarnya = totalOut - saved. */
  spending: number
  /** Sisa uang = income - totalOut. */
  remaining: number
  /** saved / income, null kalau belum ada pemasukan. */
  savingsRatioBp: BasisPoints | null
}

/**
 * Ringkasan satu bulan. `categoryTypes` memetakan id kategori ke tipenya,
 * dipakai untuk memisahkan tabungan dari pengeluaran.
 */
export function summarizeMonth(
  transactions: readonly TransactionLike[],
  categoryTypes: ReadonlyMap<string, CategoryType>,
): MonthSummary {
  const income = sumRupiah(transactions.filter((t) => t.type === 'masuk').map((t) => t.amount))
  const out = transactions.filter((t) => t.type === 'keluar')
  const totalOut = sumRupiah(out.map((t) => t.amount))
  const saved = sumRupiah(
    out
      .filter((t) => t.categoryId !== null && categoryTypes.get(t.categoryId) === 'tabungan')
      .map((t) => t.amount),
  )
  return {
    income,
    totalOut,
    saved,
    spending: totalOut - saved,
    remaining: income - totalOut,
    savingsRatioBp: ratioBp(saved, income),
  }
}

/** Total uang keluar per kategori. */
export function spentByCategory(transactions: readonly TransactionLike[]): Map<string, number> {
  const result = new Map<string, number>()
  for (const t of transactions) {
    if (t.type !== 'keluar' || t.categoryId === null) continue
    result.set(t.categoryId, (result.get(t.categoryId) ?? 0) + t.amount)
  }
  return result
}

export const WARNING_THRESHOLD_BP = 8000
export const LIMIT_BP = 10000

export type SpendingStatus = 'aman' | 'waspada' | 'lewat'
export type SavingStatus = 'kurang' | 'tercapai'

export type CategoryUsage =
  | {
      kind: 'pengeluaran'
      used: number
      limit: number
      /** limit - used, negatif kalau lewat batas. */
      remaining: number
      /** used / limit; null kalau limit 0. */
      usedBp: BasisPoints | null
      /** Lebar progress bar 0..10000. */
      barBp: BasisPoints
      status: SpendingStatus
    }
  | {
      kind: 'tabungan'
      used: number
      limit: number
      /** Kekurangan sampai target, minimal 0. */
      shortfall: number
      usedBp: BasisPoints | null
      barBp: BasisPoints
      status: SavingStatus
    }

/**
 * Pemakaian satu pos anggaran.
 * Pengeluaran: aman < 80%, waspada 80%-100%, lewat > 100%.
 * Tabungan (logika terbalik): kurang sampai target tercapai.
 */
export function categoryUsage(type: CategoryType, limit: number, used: number): CategoryUsage {
  const usedBp = ratioBp(used, limit)
  const barBp = usedBp === null ? (used > 0 ? LIMIT_BP : 0) : Math.min(Math.max(usedBp, 0), LIMIT_BP)

  if (type === 'tabungan') {
    return {
      kind: 'tabungan',
      used,
      limit,
      shortfall: Math.max(limit - used, 0),
      usedBp,
      barBp,
      status: used >= limit ? 'tercapai' : 'kurang',
    }
  }

  // Dibandingkan eksak (tanpa pembulatan): used/limit >= 80% <=> used * 10000 >= limit * 8000
  let status: SpendingStatus
  if (used > limit) status = 'lewat'
  else if (limit > 0 && used * LIMIT_BP >= limit * WARNING_THRESHOLD_BP) status = 'waspada'
  else status = 'aman'

  return { kind: 'pengeluaran', used, limit, remaining: limit - used, usedBp, barBp, status }
}

export type AllocationStatus = 'pas' | 'belum_teralokasi' | 'lebih'

export interface AllocationCheck {
  income: number
  allocated: number
  /** income - allocated: positif = belum dialokasikan, negatif = kelebihan. */
  difference: number
  status: AllocationStatus
}

/** Zero based budget: setiap rupiah gaji harus punya pos. */
export function allocationCheck(income: number, itemAmounts: readonly number[]): AllocationCheck {
  const allocated = sumRupiah(itemAmounts)
  const difference = income - allocated
  const status: AllocationStatus =
    difference === 0 ? 'pas' : difference > 0 ? 'belum_teralokasi' : 'lebih'
  return { income, allocated, difference, status }
}
