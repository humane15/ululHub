import { useState, type FormEvent } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '../../components/icons'
import { Button, Card, inputClass } from '../../components/ui'
import { createCategory, deleteCategory, reorderCategories, setCategoryArchived, updateCategory } from '../../db/finance'
import type { BudgetCategory } from '../../db/types'
import type { CategoryType } from '../../lib/budget'
import { CATEGORY_TYPE_LABEL, CATEGORY_TYPES } from './labels'

/**
 * Kelola pos anggaran (berlaku untuk semua bulan).
 * Jenis pos tidak bisa diubah setelah dibuat supaya laporan bulan lalu tetap sama;
 * pos yang sudah dipakai hanya bisa diarsipkan.
 */
export function CategoryManager({ categories, onChanged }: { categories: readonly BudgetCategory[]; onChanged: () => void }) {
  const active = categories.filter((c) => c.archived_at === null)
  const archived = categories.filter((c) => c.archived_at !== null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<CategoryType>('kebutuhan')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      onChanged()
      return true
    } catch (e) {
      setError((e as Error).message)
      return false
    } finally {
      setBusy(false)
    }
  }

  function move(index: number, delta: number) {
    const ids = active.map((c) => c.id)
    const target = index + delta
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target]!, ids[index]!]
    void run(() => reorderCategories(ids))
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    if (!newName.trim()) return
    const maxOrder = Math.max(0, ...categories.map((c) => c.sort_order))
    if (await run(() => createCategory({ name: newName, type: newType, sortOrder: maxOrder + 1 }))) setNewName('')
  }

  async function saveName() {
    if (!editing) return
    const name = editing.name.trim()
    if (!name) return setEditing(null)
    if (await run(() => updateCategory(editing.id, { name }))) setEditing(null)
  }

  const iconButton = 'rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-text disabled:opacity-30'

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-semibold">Pos anggaran</h2>
        <p className="mt-1 text-xs text-muted">
          Berlaku untuk semua bulan. Ketuk nama pos untuk menggantinya. Pos yang sudah dipakai tidak dihapus, hanya diarsipkan, supaya laporan lama tetap utuh.
        </p>
      </div>

      <ul className="divide-y divide-border">
        {active.map((c, i) => (
          <li key={c.id} className="flex items-center gap-2 py-2">
            <div className="flex flex-col">
              <button type="button" className={iconButton} onClick={() => move(i, -1)} disabled={busy || i === 0} aria-label={`Naikkan ${c.name}`}>
                <ChevronUpIcon className="size-4" />
              </button>
              <button
                type="button"
                className={iconButton}
                onClick={() => move(i, 1)}
                disabled={busy || i === active.length - 1}
                aria-label={`Turunkan ${c.name}`}
              >
                <ChevronDownIcon className="size-4" />
              </button>
            </div>
            {editing?.id === c.id ? (
              <form
                className="flex flex-1 gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  void saveName()
                }}
              >
                <input
                  autoFocus
                  value={editing.name}
                  onChange={(e) => setEditing({ id: c.id, name: e.target.value })}
                  className={inputClass}
                  aria-label="Nama pos"
                />
                <Button type="submit" disabled={busy}>
                  Simpan
                </Button>
              </form>
            ) : (
              <>
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEditing({ id: c.id, name: c.name })}>
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted">{CATEGORY_TYPE_LABEL[c.type]}</p>
                </button>
                <Button variant="secondary" className="px-3 py-1.5" disabled={busy} onClick={() => void run(() => setCategoryArchived(c.id, true))}>
                  Arsipkan
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nama pos baru"
          className={`${inputClass} min-w-40 flex-1`}
          aria-label="Nama pos baru"
        />
        <select value={newType} onChange={(e) => setNewType(e.target.value as CategoryType)} className={`${inputClass} w-auto`} aria-label="Jenis pos">
          {CATEGORY_TYPES.map((t) => (
            <option key={t} value={t}>
              {CATEGORY_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={busy || !newName.trim()}>
          Tambah
        </Button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}

      {archived.length > 0 && (
        <details className="rounded-xl bg-surface-2 p-3">
          <summary className="cursor-pointer text-sm font-medium">Diarsipkan ({archived.length})</summary>
          <ul className="mt-2 divide-y divide-border">
            {archived.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 py-2">
                <p className="min-w-0 flex-1 truncate text-sm">
                  {c.name} <span className="text-xs text-muted">{CATEGORY_TYPE_LABEL[c.type]}</span>
                </p>
                {confirmDeleteId === c.id ? (
                  <>
                    <span className="text-xs text-muted">Hapus permanen?</span>
                    <Button variant="secondary" className="px-3 py-1.5" onClick={() => setConfirmDeleteId(null)}>
                      Batal
                    </Button>
                    <Button
                      variant="danger"
                      className="px-3 py-1.5"
                      disabled={busy}
                      onClick={() => void run(() => deleteCategory(c.id)).then(() => setConfirmDeleteId(null))}
                    >
                      Hapus
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="secondary" className="px-3 py-1.5" disabled={busy} onClick={() => void run(() => setCategoryArchived(c.id, false))}>
                      Pulihkan
                    </Button>
                    <Button variant="secondary" className="px-3 py-1.5 text-bad" disabled={busy} onClick={() => setConfirmDeleteId(c.id)}>
                      Hapus
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  )
}
