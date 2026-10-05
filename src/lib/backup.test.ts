import { describe, expect, it } from 'vitest'
import { BACKUP_TABLES, backupFileName, makeBackup, parseBackup, type BackupRow, type BackupTable } from './backup'

const emptyTables = () => Object.fromEntries(BACKUP_TABLES.map((t) => [t, [] as BackupRow[]])) as Record<BackupTable, BackupRow[]>

describe('parseBackup', () => {
  it('membaca kembali hasil makeBackup', () => {
    const tables = emptyTables()
    tables.transactions = [{ id: 't1', amount: 5000 }, { id: 't2', amount: 1 }]
    tables.learning_cycles = [{ id: 'c1', status: 'aktif' }, { id: 'c2', status: 'selesai' }]
    const text = JSON.stringify(makeBackup(tables, { exportedAt: '2026-10-05T00:00:00Z', appVersion: '0.7.0' }))
    const result = parseBackup(text)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.counts.transactions).toBe(2)
    expect(result.counts.notes).toBe(0)
    expect(result.backup.app_version).toBe('0.7.0')
  })

  it('tabel yang tidak ada di file dianggap kosong', () => {
    const result = parseBackup(JSON.stringify({ format: 'ulul-hub-backup', version: 1, tables: { notes: [{ id: 'n1' }] } }))
    expect(result.ok && result.counts).toMatchObject({ notes: 1, transactions: 0 })
  })

  it.each([
    ['bukan json', 'File bukan JSON'],
    ['{"format":"lain"}', 'bukan cadangan Ulul Hub'],
    ['{"format":"ulul-hub-backup","version":2,"tables":{}}', 'Versi cadangan 2'],
    ['{"format":"ulul-hub-backup","version":1}', 'tidak berisi tabel'],
    ['{"format":"ulul-hub-backup","version":1,"tables":{"notes":{}}}', 'notes tidak valid'],
    ['{"format":"ulul-hub-backup","version":1,"tables":{"notes":[{"title":"x"}]}}', 'tanpa id'],
    [
      '{"format":"ulul-hub-backup","version":1,"tables":{"learning_cycles":[{"id":"a","status":"aktif"},{"id":"b","status":"aktif"}]}}',
      'lebih dari satu siklus aktif',
    ],
  ])('menolak %s', (text, message) => {
    const result = parseBackup(text)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain(message)
  })
})

describe('backupFileName', () => {
  it('memakai tanggal', () => {
    expect(backupFileName('2026-10-05')).toBe('ulul-hub-cadangan-2026-10-05.json')
  })
})
