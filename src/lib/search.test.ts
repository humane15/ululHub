import { describe, expect, it } from 'vitest'
import {
  containsPattern,
  EMPTY_FILTER,
  hasActiveFilter,
  pageCount,
  pageRange,
  parseFilterParams,
  toFilterParams,
} from './search'

describe('parseFilterParams / toFilterParams', () => {
  it('bolak-balik lewat URL', () => {
    const filter = { from: '2026-01-01', to: '2026-12-31', category: 'abc', keyword: 'kopi', page: 3 }
    expect(parseFilterParams(toFilterParams(filter))).toEqual(filter)
  })

  it('nilai tidak valid diabaikan', () => {
    const f = parseFilterParams(new URLSearchParams('dari=2026-02-30&sampai=xx&hal=-2&q=%20%20'))
    expect(f).toEqual(EMPTY_FILTER)
    expect(parseFilterParams(new URLSearchParams('dari=2028-02-29')).from).toBe('2028-02-29')
    expect(parseFilterParams(new URLSearchParams('hal=1.5')).page).toBe(1)
  })

  it('halaman 1 dan filter kosong tidak ditulis ke URL', () => {
    expect(toFilterParams(EMPTY_FILTER).toString()).toBe('')
  })
})

describe('hasActiveFilter', () => {
  it('halaman saja bukan filter', () => {
    expect(hasActiveFilter({ ...EMPTY_FILTER, page: 4 })).toBe(false)
    expect(hasActiveFilter({ ...EMPTY_FILTER, category: 'pemasukan' })).toBe(true)
  })
})

describe('containsPattern', () => {
  it('membungkus dengan % dan meng-escape wildcard', () => {
    expect(containsPattern(' kopi ')).toBe('%kopi%')
    expect(containsPattern('50%_off\\')).toBe('%50\\%\\_off\\\\%')
    expect(containsPattern('a*b')).toBe('%ab%')
  })
})

describe('pageRange / pageCount', () => {
  it('rentang inklusif mulai 0', () => {
    expect(pageRange(1, 50)).toEqual({ from: 0, to: 49 })
    expect(pageRange(3, 50)).toEqual({ from: 100, to: 149 })
    expect(pageRange(0, 50)).toEqual({ from: 0, to: 49 })
  })

  it('minimal 1 halaman', () => {
    expect(pageCount(0, 50)).toBe(1)
    expect(pageCount(50, 50)).toBe(1)
    expect(pageCount(51, 50)).toBe(2)
  })
})
