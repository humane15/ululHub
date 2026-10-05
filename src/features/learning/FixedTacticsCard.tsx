import { useState } from 'react'
import { Card } from '../../components/ui'
import type { LearningTactic } from '../../db/types'
import { TacticList } from './TacticList'
import type { CycleActions } from './useCycleActions'

/** Taktik tetap minggu ini (tidak terikat jalur), misalnya review mingguan. */
export function FixedTacticsCard({
  weekNumber,
  tactics,
  actions,
}: {
  weekNumber: number
  tactics: readonly LearningTactic[]
  actions: CycleActions
}) {
  const [editing, setEditing] = useState(false)
  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">Taktik tetap</h3>
        <button type="button" onClick={() => setEditing((v) => !v)} className="text-xs font-medium text-primary">
          {editing ? 'Selesai' : 'Edit'}
        </button>
      </div>
      <TacticList
        tactics={tactics}
        editing={editing}
        onToggle={actions.toggleTactic}
        onRename={actions.renameTactic}
        onDelete={actions.deleteTactic}
        onAdd={(label) => actions.addTactic({ trackId: null, weekNumber, label, siblings: tactics })}
      />
    </Card>
  )
}
