import type { AlertSeverity } from '../../lib/alerts'

export const SEVERITY_STYLE: Record<AlertSeverity, { border: string; text: string; label: string }> = {
  bad: { border: 'border-bad/50', text: 'text-bad', label: 'Penting' },
  warn: { border: 'border-warn/50', text: 'text-warn', label: 'Perhatian' },
  info: { border: 'border-border', text: 'text-primary', label: 'Info' },
}
