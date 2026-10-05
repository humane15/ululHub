import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  cycleEndDate,
  cyclePosition,
  cycleRestEndDate,
  cycleWeekRange,
  daysInMonth,
  defaultCycleName,
  diffDays,
  formatBulan,
  formatTanggal,
  isLeapYear,
  isMonday,
  isValidISODate,
  mondayOnOrAfter,
  mondayOnOrBefore,
  monthRange,
  monthStart,
  namaHari,
  quarterOf,
  todayJakarta,
  weekdayIso,
  yearRange,
} from './dates'

describe('tahun kabisat', () => {
  it('mengenali aturan 4, 100, 400', () => {
    expect(isLeapYear(2028)).toBe(true)
    expect(isLeapYear(2026)).toBe(false)
    expect(isLeapYear(2100)).toBe(false)
    expect(isLeapYear(2000)).toBe(true)
  })

  it('Februari 28 atau 29 hari', () => {
    expect(daysInMonth(2028, 2)).toBe(29)
    expect(daysInMonth(2027, 2)).toBe(28)
    expect(isValidISODate('2028-02-29')).toBe(true)
    expect(isValidISODate('2027-02-29')).toBe(false)
  })

  it('melewati 29 Februari', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01')
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01')
    expect(diffDays('2028-02-01', '2028-03-01')).toBe(29)
  })

  it('addMonths memotong ke akhir bulan', () => {
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29')
    expect(addMonths('2027-01-31', 1)).toBe('2027-02-28')
    expect(addMonths('2028-02-29', 12)).toBe('2029-02-28')
  })
})

describe('pergantian tahun', () => {
  it('addDays dan addMonths melewati tahun baru', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
    expect(addMonths('2026-12-01', 1)).toBe('2027-01-01')
    expect(addMonths('2027-01-01', -1)).toBe('2026-12-01')
    expect(addMonths('2026-10-01', -24)).toBe('2024-10-01')
  })

  it('rentang bulan Desember berakhir di Januari tahun berikutnya', () => {
    expect(monthRange('2026-12-15')).toEqual({ start: '2026-12-01', end: '2027-01-01' })
    expect(yearRange(2026)).toEqual({ start: '2026-01-01', end: '2027-01-01' })
  })

  it('monthStart selalu tanggal 1', () => {
    expect(monthStart('2026-10-31')).toBe('2026-10-01')
  })
})

describe('todayJakarta', () => {
  it('memakai Asia/Jakarta, bukan zona waktu perangkat', () => {
    // 16:59 UTC = 23:59 WIB, masih tanggal yang sama
    expect(todayJakarta(new Date('2026-12-31T16:59:59Z'))).toBe('2026-12-31')
    // 17:00 UTC = 00:00 WIB tanggal berikutnya
    expect(todayJakarta(new Date('2026-12-31T17:00:00Z'))).toBe('2027-01-01')
    expect(todayJakarta(new Date('2028-02-28T17:30:00Z'))).toBe('2028-02-29')
  })
})

describe('hari dalam minggu', () => {
  it('1 = Senin, 7 = Minggu', () => {
    expect(weekdayIso('2026-10-05')).toBe(1)
    expect(weekdayIso('2026-10-09')).toBe(5)
    expect(weekdayIso('2026-10-11')).toBe(7)
    expect(isMonday('2026-10-05')).toBe(true)
    expect(isMonday('2026-10-04')).toBe(false)
    expect(namaHari(5)).toBe('Jumat')
  })

  it('mondayOnOrBefore melewati tahun baru', () => {
    expect(mondayOnOrBefore('2027-01-01')).toBe('2026-12-28')
    expect(mondayOnOrBefore('2026-10-05')).toBe('2026-10-05')
  })
})

describe('siklus 12 Week Year', () => {
  const start = '2026-10-05' // Siklus 1

  it('menghitung akhir siklus yang melewati tahun baru', () => {
    expect(cycleEndDate(start)).toBe('2026-12-27')
    expect(cycleRestEndDate(start)).toBe('2027-01-03')
    expect(cycleWeekRange(start, 1)).toEqual({ start: '2026-10-05', end: '2026-10-11' })
    expect(cycleWeekRange(start, 12)).toEqual({ start: '2026-12-21', end: '2026-12-27' })
    expect(cycleWeekRange(start, 13)).toEqual({ start: '2026-12-28', end: '2027-01-03' })
  })

  it('menentukan posisi minggu dari tanggal hari ini', () => {
    expect(cyclePosition(start, '2026-10-04')).toEqual({ kind: 'belum_mulai', daysUntilStart: 1 })
    expect(cyclePosition(start, '2026-10-05')).toEqual({ kind: 'minggu', week: 1 })
    expect(cyclePosition(start, '2026-10-11')).toEqual({ kind: 'minggu', week: 1 })
    expect(cyclePosition(start, '2026-10-12')).toEqual({ kind: 'minggu', week: 2 })
    expect(cyclePosition(start, '2026-12-27')).toEqual({ kind: 'minggu', week: 12 })
    expect(cyclePosition(start, '2026-12-28')).toEqual({ kind: 'evaluasi' })
    expect(cyclePosition(start, '2027-01-01')).toEqual({ kind: 'evaluasi' })
    expect(cyclePosition(start, '2027-01-04')).toEqual({ kind: 'selesai', daysSinceEnd: 1 })
  })

  it('siklus yang melewati 29 Februari', () => {
    const s = '2028-01-03'
    expect(isMonday(s)).toBe(true)
    expect(cycleWeekRange(s, 9)).toEqual({ start: '2028-02-28', end: '2028-03-05' })
    expect(cyclePosition(s, '2028-02-29')).toEqual({ kind: 'minggu', week: 9 })
  })

  it('menolak nomor minggu di luar 1..13', () => {
    expect(() => cycleWeekRange(start, 0)).toThrow(RangeError)
    expect(() => cycleWeekRange(start, 14)).toThrow(RangeError)
  })
})

describe('format tampilan', () => {
  it('memakai nama bulan Indonesia', () => {
    expect(formatTanggal('2026-10-05')).toBe('5 Oktober 2026')
    expect(formatTanggal('2026-10-05', { short: true })).toBe('5 Okt 2026')
    expect(formatBulan('2027-01-01')).toBe('Januari 2027')
  })
})

describe('Senin terdekat dan kuartal', () => {
  it('mondayOnOrAfter tidak bergeser kalau sudah Senin', () => {
    expect(mondayOnOrAfter('2026-10-05')).toBe('2026-10-05')
  })

  it('mondayOnOrAfter melewati pergantian tahun', () => {
    expect(mondayOnOrAfter('2026-12-30')).toBe('2027-01-04')
    expect(mondayOnOrAfter('2027-01-03')).toBe('2027-01-04') // Minggu
  })

  it('quarterOf', () => {
    expect(quarterOf('2026-01-01')).toBe(1)
    expect(quarterOf('2026-03-31')).toBe(1)
    expect(quarterOf('2026-04-01')).toBe(2)
    expect(quarterOf('2026-10-05')).toBe(4)
    expect(quarterOf('2026-12-31')).toBe(4)
  })

  it('defaultCycleName', () => {
    expect(defaultCycleName(1, '2026-10-05')).toBe('Siklus 1: Q4 2026')
    expect(defaultCycleName(2, '2027-01-04')).toBe('Siklus 2: Q1 2027')
  })
})
