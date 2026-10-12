import { EmptyState, ErrorMessage, PageHeader } from '../components/ui'
import { AlertList } from '../features/alerts/AlertList'
import { ReminderSettings } from '../features/alerts/ReminderSettings'
import { useAlerts } from '../features/alerts/useAlerts'

export default function PengingatPage() {
  const { alerts, loading, error, refresh } = useAlerts()
  return (
    <>
      <PageHeader title="Pengingat" subtitle="Keuangan dan jadwal belajar" />
      {error && <ErrorMessage error={error} onRetry={refresh} />}
      {loading && <p className="text-sm text-muted">Memuat…</p>}
      {!loading && !error && alerts.length === 0 && (
        <div className="mb-4">
          <EmptyState title="Tidak ada pengingat." description="Anggaran aman dan belajar sesuai jadwal." />
        </div>
      )}
      <AlertList />
      <ReminderSettings />
    </>
  )
}
