import { Link } from 'react-router'
import { ChevronLeftIcon } from './icons'

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-text">
      <ChevronLeftIcon className="size-4" />
      {label}
    </Link>
  )
}
