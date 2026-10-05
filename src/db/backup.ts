import {
  BACKUP_TABLES,
  makeBackup,
  type BackupCounts,
  type BackupFile,
  type BackupRow,
  type BackupTable,
} from '../lib/backup'
import { fail } from './errors'
import { supabase } from './supabase'

const CHUNK = 1000

async function fetchTable(table: BackupTable): Promise<BackupRow[]> {
  const rows: BackupRow[] = []
  for (let from = 0; ; from += CHUNK) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('id')
      .range(from, from + CHUNK - 1)
    if (error) fail(error)
    rows.push(...(data as BackupRow[]))
    if (data.length < CHUNK) return rows
  }
}

/** Semua data milik user yang sedang login, siap disimpan sebagai JSON. */
export async function exportBackup(appVersion: string): Promise<BackupFile> {
  const tables = {} as Record<BackupTable, BackupRow[]>
  // Berurutan, bukan paralel, supaya tidak membanjiri project gratis.
  for (const table of BACKUP_TABLES) tables[table] = await fetchTable(table)
  return makeBackup(tables, { exportedAt: new Date().toISOString(), appVersion })
}

/** Mengganti SEMUA data user dengan isi cadangan (satu transaksi di database). */
export async function restoreBackup(backup: BackupFile) {
  const { error } = await supabase.rpc('restore_backup', { p_data: backup })
  if (error) fail(error)
}

/** Jumlah baris tiap tabel milik user sekarang (untuk pratinjau pemulihan). */
export async function currentCounts(): Promise<BackupCounts> {
  const results = await Promise.all(
    BACKUP_TABLES.map((table) => supabase.from(table).select('id', { count: 'exact', head: true })),
  )
  const counts = {} as BackupCounts
  results.forEach((r, i) => {
    if (r.error) fail(r.error)
    counts[BACKUP_TABLES[i]!] = r.count ?? 0
  })
  return counts
}
