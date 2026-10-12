import { Button, Card, PageHeader } from '../components/ui'
import { ReminderSettings } from '../features/alerts/ReminderSettings'
import { signOut, useSession } from '../features/auth/auth'
import { BackupCard } from '../features/settings/BackupCard'
import { SeedDataCard } from '../features/settings/SeedDataCard'

export default function PengaturanPage() {
  const session = useSession()
  return (
    <>
      <PageHeader title="Pengaturan" />
      <div className="space-y-4">
        <ReminderSettings />
        <SeedDataCard />
        <BackupCard />
        <Card className="space-y-3">
          <dl className="flex items-center justify-between gap-3 text-sm">
            <dt className="text-muted">Masuk sebagai</dt>
            <dd className="truncate font-medium">{session.user.email}</dd>
          </dl>
          <Button variant="secondary" onClick={() => void signOut()}>
            Keluar
          </Button>
        </Card>
        <Card>
          <dl className="flex items-center justify-between text-sm">
            <dt className="text-muted">Versi aplikasi</dt>
            <dd className="num">{__APP_VERSION__}</dd>
          </dl>
        </Card>
      </div>
    </>
  )
}
