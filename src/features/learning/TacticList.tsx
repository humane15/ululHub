import { useState, type FormEvent } from 'react'
import { CloseIcon } from '../../components/icons'
import { inputClass } from '../../components/ui'
import type { LearningTactic } from '../../db/types'

export function TacticList({
  tactics,
  editing,
  onToggle,
  onRename,
  onDelete,
  onAdd,
}: {
  tactics: readonly LearningTactic[]
  editing: boolean
  onToggle: (t: LearningTactic) => void
  onRename: (t: LearningTactic, label: string) => void
  onDelete: (t: LearningTactic) => void
  onAdd: (label: string) => void
}) {
  const [newLabel, setNewLabel] = useState('')

  function handleAdd(event: FormEvent) {
    event.preventDefault()
    if (!newLabel.trim()) return
    onAdd(newLabel)
    setNewLabel('')
  }

  return (
    <div className="space-y-1">
      {tactics.length === 0 && !editing && <p className="text-sm text-muted">Belum ada taktik.</p>}
      <ul className="space-y-1">
        {tactics.map((t) =>
          editing ? (
            <li key={t.id} className="flex items-center gap-2">
              <input
                defaultValue={t.label}
                onBlur={(e) => {
                  const label = e.target.value.trim()
                  if (label && label !== t.label) onRename(t, label)
                  if (!label) e.target.value = t.label
                }}
                className={`${inputClass} py-1.5 text-sm`}
                aria-label="Label taktik"
              />
              <button
                type="button"
                onClick={() => onDelete(t)}
                className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-bad"
                aria-label={`Hapus taktik ${t.label}`}
              >
                <CloseIcon className="size-4" />
              </button>
            </li>
          ) : (
            <li key={t.id}>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg px-1 py-1.5 hover:bg-surface-2">
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() => onToggle(t)}
                  className="mt-0.5 size-5 shrink-0 accent-primary"
                />
                <span className={`text-sm ${t.done ? 'text-muted line-through' : ''}`}>{t.label}</span>
              </label>
            </li>
          ),
        )}
      </ul>
      {editing && (
        <form onSubmit={handleAdd} className="flex gap-2 pt-1">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Taktik baru"
            className={`${inputClass} py-1.5 text-sm`}
            aria-label="Taktik baru"
          />
          <button type="submit" className="shrink-0 rounded-lg px-3 text-sm font-medium text-primary disabled:opacity-40" disabled={!newLabel.trim()}>
            Tambah
          </button>
        </form>
      )}
    </div>
  )
}
