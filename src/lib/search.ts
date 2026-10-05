import { isValidISODate, type ISODate } from './dates'

export const SEARCH_PAGE_SIZE = 50

/** Filter kategori: id pos, 'pemasukan' (semua pemasukan), atau null (semua). */
export type CategoryFilter = string | 'pemasukan' | null

export interface TransactionFilter {
  /** Inklusif. */
  from: ISODate | null
  /** Inklusif. */
  to: ISODate | null
  category: CategoryFilter
  /** Kata kunci di catatan. */
  keyword: string
  /** Mulai dari 1. */
  page: number
}

export const EMPTY_FILTER: TransactionFilter = { from: null, to: null, category: null, keyword: '', page: 1 }

const validDate = (v: string | null): ISODate | null => (v && isValidISODate(v) ? v : null)

/** Membaca filter dari URL (?dari=&sampai=&pos=&q=&hal=); nilai tidak valid diabaikan. */
export function parseFilterParams(params: URLSearchParams): TransactionFilter {
  const page = Number(params.get('hal'))
  return {
    from: validDate(params.get('dari')),
    to: validDate(params.get('sampai')),
    category: params.get('pos') || null,
    keyword: (params.get('q') ?? '').trim(),
    page: Number.isSafeInteger(page) && page >= 1 ? page : 1,
  }
}

export function toFilterParams(filter: TransactionFilter): URLSearchParams {
  const params = new URLSearchParams()
  if (filter.from) params.set('dari', filter.from)
  if (filter.to) params.set('sampai', filter.to)
  if (filter.category) params.set('pos', filter.category)
  if (filter.keyword.trim()) params.set('q', filter.keyword.trim())
  if (filter.page > 1) params.set('hal', String(filter.page))
  return params
}

export function hasActiveFilter(filter: TransactionFilter): boolean {
  return Boolean(filter.from || filter.to || filter.category || filter.keyword.trim())
}

/**
 * Pola ILIKE "mengandung kata kunci". Karakter wildcard yang diketik pengguna (% _ \) di-escape
 * supaya dicari apa adanya; '*' dibuang karena PostgREST memperlakukannya sebagai wildcard.
 */
export function containsPattern(keyword: string): string {
  const escaped = keyword.trim().replace(/\*/g, '').replace(/[\\%_]/g, (c) => `\\${c}`)
  return `%${escaped}%`
}

/** Baris pertama dan terakhir (inklusif, mulai 0) untuk `.range()` Supabase. */
export function pageRange(page: number, pageSize = SEARCH_PAGE_SIZE): { from: number; to: number } {
  const from = (Math.max(page, 1) - 1) * pageSize
  return { from, to: from + pageSize - 1 }
}

export function pageCount(totalRows: number, pageSize = SEARCH_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(totalRows / pageSize))
}
