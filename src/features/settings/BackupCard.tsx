import { useRef, useState, type ChangeEvent } from 'react'
import { Button, Card } from '../../components/ui'
import { currentCounts, exportBackup, restoreBackup } from '../../db/backup'
import {
  BACKUP_TABLE_LABELS,
  BACKUP_TABLES,
  backupFileName,
  parseBackup,
  type BackupCounts,
  type BackupFile,
} from '../../lib/backup'
import { formatTanggal, todayJakarta } from '../../lib/dates'
import { formatThousands } from '../../lib/money'
import { downloadText } from '../finance/exportCsv'

type RestoreState =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'preview'; fileName: string; backup: BackupFile; counts: BackupCounts; current: BackupCounts }
  | { kind: 'restoring' }
  | { kind: 'done' }
  | { kind: 'error'; message: string }

/** "2026-10-05T03:00:00.000Z" -> "5 Oktober 2026" (tanggal Jakarta). */
function exportedDate(iso: string): string | null {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : formatTanggal(todayJakarta(date))
}

/** Unduh semua data ke satu file JSON dan pulihkan dari file itu (dengan pratinjau). */
export function BackupCard() {
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [restore, setRestore] = useState<RestoreState>({ kind: 'idle' })
  const [understood, setUnderstood] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  async function handleDownload() {
    setDownloading(true)
    setDownloadError(null)
    try {
      const backup = await exportBackup(__APP_VERSION__)
      downloadText(backupFileName(todayJakarta()), JSON.stringify(backup), 'application/json')
    } catch (e) {
      setDownloadError((e as Error).message)
    } finally {
      setDownloading(false)
    }
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUnderstood(false)
    setRestore({ kind: 'reading' })
    try {
      const parsed = parseBackup(await file.text())
      if (!parsed.ok) {
        setRestore({ kind: 'error', message: parsed.error })
        return
      }
      setRestore({ kind: 'preview', fileName: file.name, backup: parsed.backup, counts: parsed.counts, current: await currentCounts() })
    } catch (err) {
      setRestore({ kind: 'error', message: (err as Error).message })
    }
  }

  async function handleRestore(backup: BackupFile) {
    setRestore({ kind: 'restoring' })
    try {
      await restoreBackup(backup)
      setRestore({ kind: 'done' })
    } catch (e) {
      setRestore({ kind: 'error', message: (e as Error).message })
    }
  }

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-semibold">Cadangan data</h2>
        <p className="mt-1 text-sm text-muted">
          Simpan semua data (keuangan, siklus belajar, catatan) ke satu file JSON. Simpan file itu di tempat aman,
          misalnya Google Drive.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleDownload} disabled={downloading}>
          {downloading ? 'Menyiapkan…' : 'Unduh cadangan'}
        </Button>
        <Button
          variant="secondary"
          onClick={() => fileInput.current?.click()}
          disabled={restore.kind === 'reading' || restore.kind === 'restoring'}
        >
          Pulihkan dari cadangan
        </Button>
        <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={handleFile} />
      </div>
      {downloadError && (
        <p role="alert" className="text-sm text-bad">
          Gagal mengunduh: {downloadError}
        </p>
      )}

      {restore.kind === 'reading' && <p className="text-sm text-muted">Membaca file…</p>}
      {restore.kind === 'error' && (
        <p role="alert" className="text-sm text-bad">
          {restore.message}
        </p>
      )}
      {restore.kind === 'restoring' && <p className="text-sm text-muted">Memulihkan… jangan tutup halaman ini.</p>}
      {restore.kind === 'done' && (
        <div className="rounded-xl bg-ok/10 px-3 py-2 text-sm">
          <p className="font-medium text-ok">Data berhasil dipulihkan.</p>
          <button type="button" className="mt-1 font-medium text-primary" onClick={() => window.location.reload()}>
            Muat ulang aplikasi
          </button>
        </div>
      )}

      {restore.kind === 'preview' && (
        <div className="space-y-3 rounded-xl border border-warn/50 bg-warn/10 p-3">
          <div className="text-sm">
            <p className="font-medium">Pratinjau: {restore.fileName}</p>
            <p className="text-muted">
              {exportedDate(restore.backup.exported_at)
                ? `Dibuat ${exportedDate(restore.backup.exported_at)}`
                : 'Tanggal pembuatan tidak diketahui'}
              {restore.backup.app_version && ` · versi aplikasi ${restore.backup.app_version}`}
            </p>
          </div>

          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="py-1 font-medium">Data</th>
                <th className="py-1 text-right font-medium">Sekarang</th>
                <th className="py-1 text-right font-medium">Di file</th>
              </tr>
            </thead>
            <tbody className="num">
              {BACKUP_TABLES.map((t) => (
                <tr key={t} className={restore.counts[t] < restore.current[t] ? 'text-bad' : ''}>
                  <td className="py-0.5 font-sans">{BACKUP_TABLE_LABELS[t]}</td>
                  <td className="py-0.5 text-right">{formatThousands(restore.current[t])}</td>
                  <td className="py-0.5 text-right">{formatThousands(restore.counts[t])}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-sm">
            <strong>Semua data sekarang akan dihapus</strong> lalu diganti isi file ini. Baris merah berarti datanya
            akan berkurang. Unduh cadangan data sekarang dulu kalau ragu.
          </p>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              className="mt-0.5 size-4 accent-current"
            />
            Saya paham data sekarang akan diganti.
          </label>
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" disabled={!understood} onClick={() => handleRestore(restore.backup)}>
              Ganti dengan isi cadangan
            </Button>
            <Button variant="secondary" onClick={() => setRestore({ kind: 'idle' })}>
              Batal
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
