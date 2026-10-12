import { useEffect } from 'react'
import { Link } from 'react-router'
import type { AppAlert } from '../../lib/alerts'
import { CloseIcon } from '../../components/icons'
import { SEVERITY_STYLE } from './severity'

const AUTO_CLOSE_MS = 10_000

/** Pemberitahuan yang muncul sesaat setelah data berubah dan melahirkan peringatan baru. */
export function AlertToast({ alert, onClose }: { alert: AppAlert | null; onClose: () => void }) {
  useEffect(() => {
    if (!alert) return
    const id = setTimeout(onClose, AUTO_CLOSE_MS)
    return () => clearTimeout(id)
  }, [alert, onClose])

  if (!alert) return null
  const action = alert.actions[0]
  return (
    <div
      role="alert"
      className={`fixed inset-x-4 top-4 z-40 mx-auto max-w-md rounded-2xl border bg-surface p-3 pr-10 shadow-lg ${SEVERITY_STYLE[alert.severity].border}`}
    >
      <button type="button" onClick={onClose} aria-label="Tutup" className="absolute top-2 right-2 rounded-lg p-1 text-muted hover:text-text">
        <CloseIcon className="size-4" />
      </button>
      <p className={`text-sm font-semibold ${SEVERITY_STYLE[alert.severity].text}`}>{alert.title}</p>
      <p className="mt-0.5 text-sm text-muted">{alert.message}</p>
      {action && (
        <Link to={action.to} onClick={onClose} className="mt-2 inline-block text-sm font-medium text-primary">
          {action.label}
        </Link>
      )}
    </div>
  )
}
