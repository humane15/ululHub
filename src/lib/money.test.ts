import { describe, expect, it } from 'vitest'
import {
  formatPercentBp,
  formatRupiah,
  formatRupiahInput,
  formatThousands,
  parseRupiahInput,
  ratioBp,
  sumRupiah,
} from './money'

describe('formatRupiah', () => {
  it('memformat dengan titik ribuan tanpa spasi', () => {
    expect(formatRupiah(3_900_000)).toBe('Rp3.900.000')
    expect(formatRupiah(0)).toBe('Rp0')
    expect(formatRupiah(999)).toBe('Rp999')
    expect(formatRupiah(1000)).toBe('Rp1.000')
    expect(formatRupiah(1_234_567_890_123)).toBe('Rp1.234.567.890.123')
  })

  it('menaruh tanda minus di depan', () => {
    expect(formatRupiah(-50_000)).toBe('-Rp50.000')
  })

  it('menolak float', () => {
    expect(() => formatRupiah(1000.5)).toThrow(TypeError)
    expect(() => formatRupiah(Number.NaN)).toThrow(TypeError)
  })
})

describe('formatThousands', () => {
  it('memformat angka biasa', () => {
    expect(formatThousands(1_200_000)).toBe('1.200.000')
    expect(formatThousands(-1_200)).toBe('-1.200')
  })
})

describe('parseRupiahInput', () => {
  it('membaca input berformat', () => {
    expect(parseRupiahInput('3.900.000')).toBe(3_900_000)
    expect(parseRupiahInput('Rp 1.200.000')).toBe(1_200_000)
    expect(parseRupiahInput('250000')).toBe(250_000)
  })

  it('mengembalikan null untuk input kosong, desimal, atau terlalu besar', () => {
    expect(parseRupiahInput('')).toBeNull()
    expect(parseRupiahInput('Rp')).toBeNull()
    expect(parseRupiahInput('1.000,50')).toBeNull()
    expect(parseRupiahInput('99999999999999999999')).toBeNull()
  })
})

describe('formatRupiahInput', () => {
  it('memformat saat mengetik', () => {
    expect(formatRupiahInput('3900000')).toBe('3.900.000')
    expect(formatRupiahInput('3.9000')).toBe('39.000')
    expect(formatRupiahInput('')).toBe('')
  })
})

describe('sumRupiah', () => {
  it('menjumlahkan integer', () => {
    expect(sumRupiah([1_200_000, 400_000, 1_000_000])).toBe(2_600_000)
    expect(sumRupiah([])).toBe(0)
  })

  it('menolak float', () => {
    expect(() => sumRupiah([1, 0.1])).toThrow(TypeError)
  })
})

describe('ratioBp dan formatPercentBp', () => {
  it('menghitung rasio dalam basis poin', () => {
    expect(ratioBp(1_200_000, 3_900_000)).toBe(3077)
    expect(ratioBp(0, 3_900_000)).toBe(0)
    expect(ratioBp(5, 0)).toBeNull()
  })

  it('memformat persen gaya Indonesia', () => {
    expect(formatPercentBp(3077)).toBe('30,8%')
    expect(formatPercentBp(10000)).toBe('100%')
    expect(formatPercentBp(8500, 0)).toBe('85%')
    expect(formatPercentBp(1000, 0)).toBe('10%')
    expect(formatPercentBp(null)).toBe('–')
  })
})
