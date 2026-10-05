// CSV sesuai RFC 4180: pemisah koma, baris CRLF, sel dikutip kalau perlu.

export type CsvCell = string | number | null

function escapeCell(value: CsvCell): string {
  if (value === null) return ''
  const text = String(value)
  return /[",\r\n]/.test(text) || /^\s|\s$/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(header: readonly string[], rows: readonly (readonly CsvCell[])[]): string {
  return [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n') + '\r\n'
}

/** BOM supaya Excel membaca UTF-8 dengan benar. */
export const UTF8_BOM = '﻿'
