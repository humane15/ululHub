import { useState } from 'react'
import { BackLink } from '../components/BackLink'
import { Markdown } from '../components/Markdown'
import { PlusIcon } from '../components/icons'
import { Button, Card, EmptyState, ErrorMessage, inputClass, PageHeader } from '../components/ui'
import { createNote, deleteNote, listNotes, updateNote } from '../db/learning'
import type { Note } from '../db/types'
import { useQuery } from '../db/useQuery'
import { nextSortOrder } from '../lib/learning'

export default function CatatanPage() {
  const query = useQuery(listNotes, [])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    setError(null)
    try {
      const note = await createNote(nextSortOrder(query.data ?? []))
      setEditingId(note.id)
      query.reload()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <>
      <BackLink to="/belajar" label="Belajar" />
      <PageHeader
        title="Catatan"
        subtitle="Platform belajar, aturan fokus, dan lainnya"
        actions={
          <Button onClick={() => void handleAdd()}>
            <PlusIcon className="size-4" />
            Catatan baru
          </Button>
        }
      />
      {(query.error || error) && <ErrorMessage error={query.error ?? new Error(error!)} onRetry={query.reload} />}
      {!query.data && !query.error && <p className="text-sm text-muted">Memuat…</p>}
      {query.data?.length === 0 && <EmptyState title="Belum ada catatan." description="Tulis daftar platform belajar atau aturan fokusmu." />}
      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        {query.data?.map((note) =>
          editingId === note.id ? (
            <NoteEditor
              key={note.id}
              note={note}
              onDone={() => {
                setEditingId(null)
                query.reload()
              }}
            />
          ) : (
            <Card key={note.id}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <h2 className="font-semibold">{note.title || 'Tanpa judul'}</h2>
                <button type="button" onClick={() => setEditingId(note.id)} className="text-xs font-medium text-primary">
                  Edit
                </button>
              </div>
              {note.body.trim() ? <Markdown source={note.body} /> : <p className="text-sm text-muted">Catatan kosong.</p>}
            </Card>
          ),
        )}
      </div>
    </>
  )
}

function NoteEditor({ note, onDone }: { note: Note; onDone: () => void }) {
  const [title, setTitle] = useState(note.title)
  const [body, setBody] = useState(note.body)
  const [preview, setPreview] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      onDone()
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-3 md:col-span-2">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul" className={`${inputClass} font-semibold`} aria-label="Judul catatan" />
      <div className="flex gap-1 rounded-lg bg-surface-2 p-1 text-sm">
        {[false, true].map((p) => (
          <button
            key={String(p)}
            type="button"
            onClick={() => setPreview(p)}
            aria-pressed={preview === p}
            className={`flex-1 rounded-md py-1 font-medium ${preview === p ? 'bg-surface shadow-sm' : 'text-muted'}`}
          >
            {p ? 'Pratinjau' : 'Tulis'}
          </button>
        ))}
      </div>
      {preview ? (
        <div className="min-h-40 rounded-lg border border-border p-3">
          {body.trim() ? <Markdown source={body} /> : <p className="text-sm text-muted">Belum ada isi.</p>}
        </div>
      ) : (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={12}
          className={`${inputClass} num text-sm`}
          aria-label="Isi catatan"
          placeholder={'# Judul\n- daftar\n**tebal**, _miring_, [link](https://...)'}
        />
      )}
      <p className="text-xs text-muted">Markdown: # judul, - daftar, 1. daftar bernomor, **tebal**, _miring_, `kode`, [teks](https://…)</p>
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      {confirmDelete ? (
        <div className="space-y-2 rounded-lg border border-bad/40 bg-bad/10 p-3 text-sm">
          <p>Hapus catatan ini? Tindakan ini tidak bisa dibatalkan.</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Batal
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => void run(() => deleteNote(note.id))}>
              Ya, hapus
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button variant="secondary" className="text-bad" onClick={() => setConfirmDelete(true)}>
            Hapus
          </Button>
          <div className="flex-1" />
          <Button variant="secondary" onClick={onDone} disabled={busy}>
            Batal
          </Button>
          <Button disabled={busy} onClick={() => void run(() => updateNote(note.id, { title: title.trim(), body }))}>
            {busy ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </div>
      )}
    </Card>
  )
}
