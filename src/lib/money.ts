// Semua nominal uang adalah integer rupiah. Tidak ada float untuk uang.

/** Basis poin: 10000 = 100%. Dipakai untuk rasio supaya tetap integer. */
export type BasisPoints = number

export function isRupiah(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value)
}

export function assertRupiah(value: number): void {
  if (!isRupiah(value)) {
    throw new TypeError(`Nominal harus integer rupiah, bukan ${value}`)
  }
}

/** 3900000 -> "3.900.000" */
export function formatThousands(value: number): string {
  assertRupiah(value)
  const digits = String(Math.abs(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return value < 0 ? `-${digits}` : digits
}

/** 3900000 -> "Rp3.900.000", -50000 -> "-Rp50.000" */
export function formatRupiah(value: number): string {
  assertRupiah(value)
  const body = `Rp${formatThousands(Math.abs(value))}`
  return value < 0 ? `-${body}` : body
}

/**
 * Mengubah teks input pengguna menjadi integer rupiah.
 * "Rp3.900.000" -> 3900000, "" -> null. Desimal (koma) tidak didukung.
 */
export function parseRupiahInput(text: string): number | null {
  if (text.includes(',')) return null
  const digits = text.replace(/\D/g, '')
  if (digits === '') return null
  const value = Number(digits)
  return Number.isSafeInteger(value) ? value : null
}

/** Memformat teks input saat diketik: "3900000" -> "3.900.000". */
export function formatRupiahInput(text: string): string {
  const value = parseRupiahInput(text.replace(/,/g, ''))
  return value === null ? '' : formatThousands(value)
}

export function sumRupiah(values: Iterable<number>): number {
  let total = 0
  for (const value of values) {
    assertRupiah(value)
    total += value
  }
  assertRupiah(total)
  return total
}

/** part / whole dalam basis poin (dibulatkan). null kalau whole <= 0. */
export function ratioBp(part: number, whole: number): BasisPoints | null {
  assertRupiah(part)
  assertRupiah(whole)
  if (whole <= 0) return null
  return Math.round((part * 10000) / whole)
}

/** 3077 -> "30,8%", 10000 -> "100%", null -> "–" */
export function formatPercentBp(bp: BasisPoints | null, fractionDigits = 1): string {
  if (bp === null) return '–'
  let text = (bp / 100).toFixed(fractionDigits)
  if (text.includes('.')) text = text.replace(/\.?0+$/, '')
  return `${text.replace('.', ',')}%`
}

/** Ringkas untuk sumbu grafik: 1200000 -> "1,2 jt", 500000 -> "500 rb", 0 -> "0". */
export function formatRupiahCompact(value: number): string {
  assertRupiah(value)
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',')
  if (abs >= 1_000_000_000) return `${sign}${fmt(abs / 1_000_000_000)} M`
  if (abs >= 1_000_000) return `${sign}${fmt(abs / 1_000_000)} jt`
  if (abs >= 1_000) return `${sign}${fmt(abs / 1_000)} rb`
  return `${sign}${abs}`
}
