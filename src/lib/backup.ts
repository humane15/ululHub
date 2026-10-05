// Format file cadangan Ulul Hub. Dibaca kembali oleh fungsi database restore_backup.

export const BACKUP_FORMAT = 'ulul-hub-backup'
export const BACKUP_VERSION = 1

/** Urutan tabel = urutan pemulihan (induk sebelum anak). */
export const BACKUP_TABLES = [
  'budget_categories',
  'budget_months',
  'budget_month_items',
  'transactions',
  'learning_cycles',
  'learning_tracks',
  'learning_weeks',
  'learning_tactics',
  'weekly_reviews',
  'study_schedule',
  'notes',
] as const

export type BackupTable = (typeof BACKUP_TABLES)[number]

export const BACKUP_TABLE_LABELS: Record<BackupTable, string> = {
  budget_categories: 'Pos anggaran',
  budget_months: 'Anggaran bulanan',
  budget_month_items: 'Nominal pos per bulan',
  transactions: 'Transaksi',
  learning_cycles: 'Siklus belajar',
  learning_tracks: 'Jalur',
  learning_weeks: 'Topik mingguan',
  learning_tactics: 'Taktik',
  weekly_reviews: 'Review mingguan',
  study_schedule: 'Jadwal harian',
  notes: 'Catatan',
}

export type BackupRow = Record<string, unknown> & { id: string }

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  version: typeof BACKUP_VERSION
  /** Waktu ekspor (ISO). */
  exported_at: string
  app_version: string
  tables: Record<BackupTable, BackupRow[]>
}

export type BackupCounts = Record<BackupTable, number>

export function makeBackup(
  tables: Record<BackupTable, BackupRow[]>,
  meta: { exportedAt: string; appVersion: string },
): BackupFile {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exported_at: meta.exportedAt, app_version: meta.appVersion, tables }
}

export function backupCounts(tables: Record<BackupTable, readonly unknown[]>): BackupCounts {
  return Object.fromEntries(BACKUP_TABLES.map((t) => [t, tables[t].length])) as BackupCounts
}

/** "ulul-hub-cadangan-2026-10-05.json" */
export function backupFileName(today: string): string {
  return `ulul-hub-cadangan-${today}.json`
}

export type ParseBackupResult = { ok: true; backup: BackupFile; counts: BackupCounts } | { ok: false; error: string }

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Memeriksa isi file cadangan sebelum dipulihkan. Tabel yang tidak ada di file dianggap kosong.
 * Pemeriksaan isi kolom dilakukan database (constraint dan foreign key) saat pemulihan.
 */
export function parseBackup(text: string): ParseBackupResult {
  let data: unknown
  try {
    data = JSON.parse(text.replace(/^\uFEFF/, ''))
  } catch {
    return { ok: false, error: 'File bukan JSON yang valid.' }
  }
  if (!isObject(data) || data.format !== BACKUP_FORMAT) {
    return { ok: false, error: 'File ini bukan cadangan Ulul Hub.' }
  }
  if (data.version !== BACKUP_VERSION) {
    return { ok: false, error: `Versi cadangan ${String(data.version)} tidak didukung (yang didukung: ${BACKUP_VERSION}).` }
  }
  if (!isObject(data.tables)) return { ok: false, error: 'Cadangan tidak berisi tabel.' }

  const tables = {} as Record<BackupTable, BackupRow[]>
  for (const table of BACKUP_TABLES) {
    const rows = data.tables[table] ?? []
    if (!Array.isArray(rows)) return { ok: false, error: `Isi tabel ${table} tidak valid.` }
    for (const row of rows) {
      if (!isObject(row) || typeof row.id !== 'string') {
        return { ok: false, error: `Ada baris tanpa id di tabel ${table}.` }
      }
    }
    tables[table] = rows as BackupRow[]
  }
  if (tables.learning_cycles.filter((c) => c.status === 'aktif').length > 1) {
    return { ok: false, error: 'Cadangan berisi lebih dari satu siklus aktif.' }
  }

  const backup: BackupFile = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exported_at: typeof data.exported_at === 'string' ? data.exported_at : '',
    app_version: typeof data.app_version === 'string' ? data.app_version : '',
    tables,
  }
  return { ok: true, backup, counts: backupCounts(tables) }
}
