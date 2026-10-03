import { Card, PageHeader } from '../components/ui'

export default function PengaturanPage() {
  return (
    <>
      <PageHeader title="Pengaturan" />
      <Card>
        <dl className="flex items-center justify-between text-sm">
          <dt className="text-muted">Versi aplikasi</dt>
          <dd className="num">{__APP_VERSION__}</dd>
        </dl>
      </Card>
    </>
  )
}
