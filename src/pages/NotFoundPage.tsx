import { Link } from 'react-router'
import { EmptyState } from '../components/ui'

export default function NotFoundPage() {
  return (
    <EmptyState
      title="Halaman tidak ditemukan."
      action={
        <Link to="/" className="text-sm font-medium text-primary">
          Kembali ke Beranda
        </Link>
      }
    />
  )
}
