import { EmptyState, PageHeader } from '../components/ui'

export default function BelajarPage() {
  return (
    <>
      <PageHeader title="Belajar" subtitle="Rencana 12 Week Year" />
      <EmptyState
        title="Belum ada siklus aktif."
        description="Buat siklus baru untuk mulai merencanakan 12 minggu ke depan."
      />
    </>
  )
}
