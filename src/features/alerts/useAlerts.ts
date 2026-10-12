import { createContext, useContext } from 'react'
import type { AppAlert } from '../../lib/alerts'
import type { ReminderPrefs } from '../../lib/alertState'

export interface AlertsValue {
  /** Peringatan aktif, paling mendesak dulu. */
  alerts: AppAlert[]
  loading: boolean
  error: Error | null
  prefs: ReminderPrefs
  setPrefs: (prefs: ReminderPrefs) => void
  /** Sembunyikan sampai besok. */
  snooze: (id: string) => void
  /** Sembunyikan sampai kondisinya berganti. */
  dismiss: (id: string) => void
  /** Hitung ulang setelah data berubah. */
  refresh: () => void
}

export const AlertsContext = createContext<AlertsValue | null>(null)

export function useAlerts(): AlertsValue {
  const value = useContext(AlertsContext)
  if (!value) throw new Error('useAlerts harus dipakai di dalam AlertsProvider')
  return value
}

/** Dipanggil setelah menyimpan transaksi/taktik supaya peringatan dihitung ulang. */
export const DATA_CHANGED_EVENT = 'ulul:data-changed'

export function announceDataChanged() {
  window.dispatchEvent(new Event(DATA_CHANGED_EVENT))
}
