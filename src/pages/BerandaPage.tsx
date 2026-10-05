import { Link } from 'react-router'
import { EmptyState, PageHeader } from '../components/ui'
import { formatTanggal, namaHari, todayJakarta, weekdayIso } from '../lib/dates'

export default function BerandaPage() {
  const today = todayJakarta()
  return (
    <>
      <PageHeader title="Beranda" subtitle={`${namaHari(weekdayIso(today))}, ${formatTanggal(today)}`} />
      <EmptyState
        title="Belum ada data"
        description="Ringkasan belajar dan keuangan hari ini akan muncul di sini. Akun baru? Isi data awal dulu di Pengaturan."
        action={
          <Link to="/pengaturan" className="text-sm font-medium text-primary">
            Buka Pengaturan
          </Link>
        }
      />
    </>
  )
}
