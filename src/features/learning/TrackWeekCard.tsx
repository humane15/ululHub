import { useState } from 'react'
import { Button, inputClass } from '../../components/ui'
import type { LearningTactic, LearningTrack, LearningWeek } from '../../db/types'
import { tacticProgress } from '../../lib/learning'
import { trackColor } from './colors'
import { TacticList } from './TacticList'
import type { CycleActions } from './useCycleActions'

/** Satu kolom jalur pada satu minggu: topik, taktik (checklist), sumber. */
export function TrackWeekCard({
  track,
  week,
  weekNumber,
  tactics,
  actions,
  isToday,
}: {
  track: LearningTrack
  week: LearningWeek | undefined
  weekNumber: number
  tactics: readonly LearningTactic[]
  actions: CycleActions
  isToday: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [topic, setTopic] = useState(week?.topic ?? '')
  const [source, setSource] = useState(week?.source ?? '')
  const color = trackColor(track.color)
  const progress = tacticProgress(tactics)

  function startEdit() {
    setTopic(week?.topic ?? '')
    setSource(week?.source ?? '')
    setEditing(true)
  }

  async function finishEdit() {
    if (topic.trim() !== (week?.topic ?? '') || source.trim() !== (week?.source ?? '')) {
      await actions.saveWeek(track.id, weekNumber, topic, source)
    }
    setEditing(false)
  }

  return (
    <section className={`flex flex-col rounded-2xl border bg-surface p-4 ${isToday ? color.border : 'border-border'}`}>
      <header className="mb-3 flex items-center gap-2">
        <span className={`size-2.5 shrink-0 rounded-full ${color.dot}`} aria-hidden="true" />
        <h3 className="min-w-0 flex-1 truncate font-semibold">{track.name}</h3>
        {isToday && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color.soft}`}>Hari ini</span>}
        <span className="num text-xs text-muted">
          {progress.done}/{progress.total}
        </span>
      </header>

      {editing ? (
        <label className="mb-3 block space-y-1">
          <span className="text-xs font-medium text-muted">Topik</span>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} className={`${inputClass} text-sm`} />
        </label>
      ) : (
        <p className={`mb-3 font-medium ${week?.topic ? '' : 'text-muted'}`}>{week?.topic || 'Belum ada topik'}</p>
      )}

      <div className="flex-1">
        <TacticList
          tactics={tactics}
          editing={editing}
          onToggle={actions.toggleTactic}
          onRename={actions.renameTactic}
          onDelete={actions.deleteTactic}
          onAdd={(label) => actions.addTactic({ trackId: track.id, weekNumber, label, siblings: tactics })}
        />
      </div>

      <div className="mt-3 flex items-end justify-between gap-2 border-t border-border pt-3">
        {editing ? (
          <label className="block flex-1 space-y-1">
            <span className="text-xs font-medium text-muted">Sumber</span>
            <input value={source} onChange={(e) => setSource(e.target.value)} className={`${inputClass} text-sm`} />
          </label>
        ) : (
          <p className="min-w-0 flex-1 truncate text-xs text-muted">
            Sumber: <span className="text-text">{week?.source || '–'}</span>
          </p>
        )}
        {editing ? (
          <Button className="px-3 py-1.5" onClick={() => void finishEdit()}>
            Selesai
          </Button>
        ) : (
          <button type="button" onClick={startEdit} className="text-xs font-medium text-primary">
            Edit
          </button>
        )}
      </div>
    </section>
  )
}
