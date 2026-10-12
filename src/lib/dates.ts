// Tanggal di aplikasi ini adalah tanggal kalender (tanpa jam) dalam format
// ISO "YYYY-MM-DD", selalu menurut zona waktu Asia/Jakarta.
// Aritmetika dilakukan di UTC supaya tidak terpengaruh zona waktu perangkat.

export type ISODate = string

export const APP_TIME_ZONE = 'Asia/Jakarta'
export const CYCLE_WEEKS = 12
/** 12 minggu eksekusi + 1 minggu evaluasi/istirahat. */
export const CYCLE_TOTAL_WEEKS = CYCLE_WEEKS + 1

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const DAY_MS = 86_400_000

const jakartaFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]
const NAMA_HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function isValidISODate(value: string): boolean {
  const match = ISO_RE.exec(value)
  if (!match) return false
  const [, y, m, d] = match.map(Number) as [number, number, number, number]
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m)
}

export function parseISODate(value: ISODate): { year: number; month: number; day: number } {
  if (!isValidISODate(value)) throw new RangeError(`Tanggal tidak valid: ${value}`)
  const [year, month, day] = value.split('-').map(Number) as [number, number, number]
  return { year, month, day }
}

function toUtcMs(value: ISODate): number {
  const { year, month, day } = parseISODate(value)
  return Date.UTC(year, month - 1, day)
}

function fromUtcMs(ms: number): ISODate {
  return new Date(ms).toISOString().slice(0, 10)
}

export function makeISODate(year: number, month: number, day: number): ISODate {
  const value = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  if (!isValidISODate(value)) throw new RangeError(`Tanggal tidak valid: ${value}`)
  return value
}

/** Tanggal hari ini menurut Asia/Jakarta, berapa pun zona waktu perangkat. */
export function todayJakarta(now: Date = new Date()): ISODate {
  return jakartaFormatter.format(now)
}

const jakartaHourFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: APP_TIME_ZONE,
  hour: '2-digit',
  hour12: false,
})

/** Jam saat ini (0..23) menurut Asia/Jakarta. */
export function jakartaHour(now: Date = new Date()): number {
  return Number(jakartaHourFormatter.format(now)) % 24
}

export function addDays(value: ISODate, days: number): ISODate {
  return fromUtcMs(toUtcMs(value) + days * DAY_MS)
}

/** Selisih hari b - a. */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / DAY_MS)
}

export function compareISODate(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** 1 = Senin ... 7 = Minggu */
export function weekdayIso(value: ISODate): number {
  const day = new Date(toUtcMs(value)).getUTCDay()
  return day === 0 ? 7 : day
}

export function isMonday(value: ISODate): boolean {
  return weekdayIso(value) === 1
}

/** Senin pada minggu yang sama atau sebelumnya. */
export function mondayOnOrBefore(value: ISODate): ISODate {
  return addDays(value, 1 - weekdayIso(value))
}

/** Senin pada minggu yang sama atau sesudahnya. */
export function mondayOnOrAfter(value: ISODate): ISODate {
  return addDays(value, (8 - weekdayIso(value)) % 7)
}

/** Kuartal 1..4. */
export function quarterOf(value: ISODate): number {
  return Math.ceil(parseISODate(value).month / 3)
}

/** Tanggal 1 pada bulan yang sama. */
export function monthStart(value: ISODate): ISODate {
  const { year, month } = parseISODate(value)
  return makeISODate(year, month, 1)
}

/** Menggeser bulan. Tanggal dipotong ke akhir bulan (31 Jan + 1 bulan = 28/29 Feb). */
export function addMonths(value: ISODate, months: number): ISODate {
  const { year, month, day } = parseISODate(value)
  const index = year * 12 + (month - 1) + months
  const newYear = Math.floor(index / 12)
  const newMonth = index - newYear * 12 + 1
  return makeISODate(newYear, newMonth, Math.min(day, daysInMonth(newYear, newMonth)))
}

/** Rentang query satu bulan: start inklusif, end eksklusif. */
export function monthRange(value: ISODate): { start: ISODate; end: ISODate } {
  const start = monthStart(value)
  return { start, end: addMonths(start, 1) }
}

/** Parameter URL bulan: "2026-10" -> "2026-10-01". null kalau tidak valid. */
export function parseMonthParam(value: string | null): ISODate | null {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null
  const iso = `${value}-01`
  return isValidISODate(iso) ? iso : null
}

/** "2026-10-15" -> "2026-10" */
export function toMonthParam(value: ISODate): string {
  return monthStart(value).slice(0, 7)
}

/** Tanggal bawaan untuk transaksi baru: hari ini kalau di bulan itu, selain itu tanggal 1. */
export function defaultDateInMonth(month: ISODate, today: ISODate): ISODate {
  return monthStart(today) === monthStart(month) ? today : monthStart(month)
}

/** Rentang query satu tahun: start inklusif, end eksklusif. */
export function yearRange(year: number): { start: ISODate; end: ISODate } {
  return { start: makeISODate(year, 1, 1), end: makeISODate(year + 1, 1, 1) }
}

// ---------- Siklus 12 Week Year ----------

/** Rentang tanggal minggu ke-n (1..13) sebuah siklus. */
export function cycleWeekRange(startDate: ISODate, week: number): { start: ISODate; end: ISODate } {
  if (!Number.isInteger(week) || week < 1 || week > CYCLE_TOTAL_WEEKS) {
    throw new RangeError(`Minggu harus 1 sampai ${CYCLE_TOTAL_WEEKS}`)
  }
  const start = addDays(startDate, (week - 1) * 7)
  return { start, end: addDays(start, 6) }
}

/** Hari terakhir minggu ke-12 (akhir eksekusi). */
export function cycleEndDate(startDate: ISODate): ISODate {
  return addDays(startDate, CYCLE_WEEKS * 7 - 1)
}

/** Hari terakhir minggu ke-13 (akhir evaluasi). */
export function cycleRestEndDate(startDate: ISODate): ISODate {
  return addDays(startDate, CYCLE_TOTAL_WEEKS * 7 - 1)
}

/** Nama bawaan siklus: (1, "2026-10-05") -> "Siklus 1: Q4 2026". */
export function defaultCycleName(sequence: number, startDate: ISODate): string {
  return `Siklus ${sequence}: Q${quarterOf(startDate)} ${parseISODate(startDate).year}`
}

export type CyclePosition =
  | { kind: 'belum_mulai'; daysUntilStart: number }
  | { kind: 'minggu'; week: number }
  | { kind: 'evaluasi' }
  | { kind: 'selesai'; daysSinceEnd: number }

/** Posisi tanggal `today` di dalam siklus yang mulai `startDate`. */
export function cyclePosition(startDate: ISODate, today: ISODate): CyclePosition {
  const offset = diffDays(startDate, today)
  if (offset < 0) return { kind: 'belum_mulai', daysUntilStart: -offset }
  const week = Math.floor(offset / 7) + 1
  if (week <= CYCLE_WEEKS) return { kind: 'minggu', week }
  if (week === CYCLE_TOTAL_WEEKS) return { kind: 'evaluasi' }
  return { kind: 'selesai', daysSinceEnd: diffDays(cycleRestEndDate(startDate), today) }
}

// ---------- Format tampilan ----------

/** "2026-10-05" -> "5 Oktober 2026", short -> "5 Okt 2026" */
export function formatTanggal(value: ISODate, options: { short?: boolean } = {}): string {
  const { year, month, day } = parseISODate(value)
  const nama = NAMA_BULAN[month - 1]!
  return `${day} ${options.short ? nama.slice(0, 3) : nama} ${year}`
}

/** "2026-10-01" -> "Oktober 2026" */
export function formatBulan(value: ISODate): string {
  const { year, month } = parseISODate(value)
  return `${NAMA_BULAN[month - 1]} ${year}`
}

/** 1 -> "Senin" ... 7 -> "Minggu" */
export function namaHari(weekday: number): string {
  const nama = NAMA_HARI[weekday - 1]
  if (!nama) throw new RangeError(`Hari harus 1 sampai 7`)
  return nama
}
