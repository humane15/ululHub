import { useState } from 'react'
import {
  createTactic,
  deleteTactic,
  setTacticDone,
  updateTacticLabel,
  upsertWeek,
  type CycleDetail,
} from '../../db/learning'
import type { LearningCycle, LearningTactic } from '../../db/types'
import type { QueryState } from '../../db/useQuery'
import { nextSortOrder } from '../../lib/learning'

/** Data halaman Belajar: siklus aktif beserta isinya, atau tidak ada siklus aktif. */
export type ActiveCycleData = { cycle: LearningCycle; detail: CycleDetail } | { cycle: null }

/** Aksi untuk isi minggu (taktik, topik, sumber). Setiap aksi memuat ulang data setelah berhasil. */
export function useCycleActions(cycleId: string, query: QueryState<ActiveCycleData>) {
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<unknown>) {
    setError(null)
    try {
      await action()
      query.reload()
    } catch (e) {
      setError((e as Error).message)
      query.reload()
    }
  }

  const setDoneLocal = (id: string, done: boolean) =>
    query.mutate((prev) =>
      prev.cycle
        ? {
            ...prev,
            detail: { ...prev.detail, tactics: prev.detail.tactics.map((t) => (t.id === id ? { ...t, done } : t)) },
          }
        : prev,
    )

  return {
    error,
    clearError: () => setError(null),

    /** Optimistic: centang langsung berubah, dikembalikan kalau gagal. */
    async toggleTactic(t: LearningTactic) {
      setError(null)
      setDoneLocal(t.id, !t.done)
      try {
        await setTacticDone(t.id, !t.done)
      } catch (e) {
        setDoneLocal(t.id, t.done)
        setError((e as Error).message)
      }
    },

    addTactic(input: { trackId: string | null; weekNumber: number; label: string; siblings: readonly LearningTactic[] }) {
      return run(async () => {
        let weekId: string | null = null
        if (input.trackId) {
          // Taktik jalur butuh baris minggu; buat kalau belum ada.
          const week = await upsertWeek({ cycleId, trackId: input.trackId, weekNumber: input.weekNumber })
          weekId = week.id
        }
        await createTactic({
          cycleId,
          weekId,
          weekNumber: input.weekNumber,
          label: input.label,
          sortOrder: nextSortOrder(input.siblings),
        })
      })
    },

    renameTactic: (t: LearningTactic, label: string) => run(() => updateTacticLabel(t.id, label)),
    deleteTactic: (t: LearningTactic) => run(() => deleteTactic(t.id)),

    saveWeek: (trackId: string, weekNumber: number, topic: string, source: string) =>
      run(() => upsertWeek({ cycleId, trackId, weekNumber, topic, source })),
  }
}

export type CycleActions = ReturnType<typeof useCycleActions>
