import { EmptyState, PageHeader } from '../components/ui'

export default function LaporanPage() {
  return (
    <>
      <PageHeader title="Laporan" subtitle="Bulanan dan tahunan" />
      <EmptyState title="Belum ada laporan." description="Laporan muncul setelah ada transaksi yang tercatat." />
    </>
  )
}
