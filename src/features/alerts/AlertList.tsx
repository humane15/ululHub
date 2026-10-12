import { Link } from 'react-router'
import { Button } from '../../components/ui'
import type { AppAlert } from '../../lib/alerts'
import { SEVERITY_STYLE } from './severity'
import { useAlerts } from './useAlerts'

function AlertItem({ alert }: { alert: AppAlert }) {
  const { snooze, dismiss } = useAlerts()
  const style = SEVERITY_STYLE[alert.severity]
  return (
    <li className={`rounded-2xl border bg-surface p-4 ${style.border}`}>
      <p className="text-xs font-medium text-muted">
        <span className={style.text}>{style.label}</span> · {alert.area === 'keuangan' ? 'Keuangan' : 'Belajar'}
      </p>
      <p className="mt-1 font-semibold">{alert.title}</p>
      <p className="mt-0.5 text-sm text-muted">{alert.message}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {alert.actions.map((action, i) => (
          <Link
            key={action.to + action.label}
            to={action.to}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${i === 0 ? 'bg-primary text-white dark:text-slate-950' : 'border border-border hover:bg-surface-2'}`}
          >
            {action.label}
          </Link>
        ))}
        <Button variant="secondary" className="px-3 py-1.5" onClick={() => snooze(alert.id)}>
          Besok lagi
        </Button>
        <button type="button" onClick={() => dismiss(alert.id)} className="px-2 py-1.5 text-sm text-muted hover:text-text">
          Abaikan
        </button>
      </div>
    </li>
  )
}

/** Daftar pengingat interaktif. `limit` membatasi jumlah yang tampil (sisanya lewat tautan). */
export function AlertList({ limit }: { limit?: number }) {
  const { alerts } = useAlerts()
  if (alerts.length === 0) return null
  const shown = limit ? alerts.slice(0, limit) : alerts
  return (
    <section aria-label="Pengingat" className="mb-4 space-y-3">
      <ul className="space-y-3">
        {shown.map((alert) => (
          <AlertItem key={alert.id} alert={alert} />
        ))}
      </ul>
      {shown.length < alerts.length && (
        <Link to="/pengingat" className="block text-sm font-medium text-primary">
          Lihat semua {alerts.length} pengingat
        </Link>
      )}
    </section>
  )
}
