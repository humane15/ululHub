import { useState, type FormEvent } from 'react'
import { Button, Card, inputClass } from '../../components/ui'
import { saveWeeklyReview } from '../../db/learning'
import type { WeeklyReview } from '../../db/types'

/** Review mingguan: menyimpan skor minggu itu beserta catatan singkat. */
export function WeeklyReviewCard({
  cycleId,
  weekNumber,
  score,
  review,
  onSaved,
}: {
  cycleId: string
  weekNumber: number
  /** Skor saat ini; null kalau belum ada taktik. */
  score: number | null
  review: WeeklyReview | undefined
  onSaved: () => void
}) {
  const [wentWell, setWentWell] = useState(review?.went_well ?? '')
  const [toImprove, setToImprove] = useState(review?.to_improve ?? '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (score === null) return
    setBusy(true)
    setMessage(null)
    try {
      await saveWeeklyReview({ cycleId, weekNumber, score, wentWell, toImprove })
      setMessage({ ok: true, text: `Review tersimpan dengan skor ${score}%.` })
      onSaved()
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="font-semibold">Review mingguan</h3>
        {review && (
          <span className="num text-xs text-muted">
            Skor tersimpan {review.score}%{score !== null && score !== review.score && ` · sekarang ${score}%`}
          </span>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Apa yang berjalan baik?</span>
          <textarea value={wentWell} onChange={(e) => setWentWell(e.target.value)} rows={2} className={inputClass} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Apa yang perlu diperbaiki?</span>
          <textarea value={toImprove} onChange={(e) => setToImprove(e.target.value)} rows={2} className={inputClass} />
        </label>
        {message && <p className={`text-sm ${message.ok ? 'text-ok' : 'text-bad'}`}>{message.text}</p>}
        <Button type="submit" disabled={busy || score === null}>
          {busy ? 'Menyimpan…' : score === null ? 'Belum ada taktik' : `Simpan review (skor ${score}%)`}
        </Button>
      </form>
    </Card>
  )
}
