import { EmptyState, PageHeader } from '../components/ui'
import { formatTanggal, namaHari, todayJakarta, weekdayIso } from '../lib/dates'

export default function BerandaPage() {
  const today = todayJakarta()
  return (
    <>
      <PageHeader title="Beranda" subtitle={`${namaHari(weekdayIso(today))}, ${formatTanggal(today)}`} />
      <EmptyState
        title="Belum ada data"
        description="Ringkasan belajar dan keuangan hari ini akan muncul di sini setelah akun tersambung (Fase 2)."
      />
    </>
  )
}
