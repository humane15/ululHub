import { EmptyState, PageHeader } from '../components/ui'
import { formatBulan, todayJakarta } from '../lib/dates'

export default function KeuanganPage() {
  return (
    <>
      <PageHeader title="Keuangan" subtitle={formatBulan(todayJakarta())} />
      <EmptyState title="Belum ada transaksi bulan ini." description="Mulai dengan mencatat gaji." />
    </>
  )
}
