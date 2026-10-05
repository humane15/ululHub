import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-border bg-surface p-4 ${className}`}>{children}</section>
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export const inputClass =
  'w-full rounded-lg border border-border bg-bg px-3 py-2 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60'

type ButtonVariant = 'primary' | 'secondary' | 'danger'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:opacity-90 dark:text-slate-950',
  secondary: 'border border-border bg-surface hover:bg-surface-2',
  danger: 'bg-bad text-white hover:opacity-90 dark:text-slate-950',
}

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-60 ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}

export function LoadingScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status">
      <span className="text-sm text-muted">Memuat…</span>
    </div>
  )
}

const BAR_COLORS = { ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad', primary: 'bg-primary' } as const

/** Progress bar; `valueBp` 0..10000. */
export function ProgressBar({ valueBp, tone, label }: { valueBp: number; tone: keyof typeof BAR_COLORS; label: string }) {
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-surface-2"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(valueBp / 100)}
    >
      <div className={`h-full rounded-full ${BAR_COLORS[tone]}`} style={{ width: `${valueBp / 100}%` }} />
    </div>
  )
}

export function ErrorMessage({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-bad/40 bg-bad/10 p-4 text-sm">
      <p className="font-medium text-bad">Gagal memuat data</p>
      <p className="mt-1 text-muted">{error.message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-2 font-medium text-primary">
          Coba lagi
        </button>
      )}
    </div>
  )
}
