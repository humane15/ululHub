import { addDays, type ISODate } from './dates'
import type { AppAlert } from './alerts'

/** "Abaikan" = disembunyikan sampai kondisinya berganti (id peringatan memuat bulan/minggu/hari). */
export const FOREVER: ISODate = '9999-12-31'

export interface AlertState {
  /** id -> tampil lagi mulai tanggal ini. */
  hidden: Record<string, ISODate>
  /** id -> tanggal terakhir dikirim sebagai notifikasi sistem. */
  notified: Record<string, ISODate>
}

export const EMPTY_ALERT_STATE: AlertState = { hidden: {}, notified: {} }

export function isHidden(state: AlertState, id: string, today: ISODate): boolean {
  const until = state.hidden[id]
  return until !== undefined && until > today
}

export function snooze(state: AlertState, id: string, today: ISODate): AlertState {
  return { ...state, hidden: { ...state.hidden, [id]: addDays(today, 1) } }
}

export function dismiss(state: AlertState, id: string): AlertState {
  return { ...state, hidden: { ...state.hidden, [id]: FOREVER } }
}

export function visibleAlerts(alerts: readonly AppAlert[], state: AlertState, today: ISODate): AppAlert[] {
  return alerts.filter((a) => !isHidden(state, a.id, today))
}

/** Peringatan penting (bukan info) yang belum dikirim sebagai notifikasi hari ini. */
export function alertsToNotify(alerts: readonly AppAlert[], state: AlertState, today: ISODate): AppAlert[] {
  return visibleAlerts(alerts, state, today).filter((a) => a.severity !== 'info' && state.notified[a.id] !== today)
}

export function markNotified(state: AlertState, ids: readonly string[], today: ISODate): AlertState {
  const notified = { ...state.notified }
  for (const id of ids) notified[id] = today
  return { ...state, notified }
}

/** Membuang catatan lama supaya localStorage tidak membengkak. */
export function pruneState(state: AlertState, today: ISODate): AlertState {
  const keep = (map: Record<string, ISODate>, min: (v: ISODate) => boolean) =>
    Object.fromEntries(Object.entries(map).filter(([, v]) => min(v)))
  return {
    hidden: keep(state.hidden, (v) => v > today),
    notified: keep(state.notified, (v) => v >= addDays(today, -30)),
  }
}

// ---------- Pengaturan pengingat ----------

export interface ReminderPrefs {
  /** Kirim notifikasi sistem (butuh izin browser). */
  notify: boolean
  /** Jam pengingat harian di Jakarta (0..23). */
  hour: number
}

export const DEFAULT_PREFS: ReminderPrefs = { notify: false, hour: 19 }

export function parseState(raw: string | null): AlertState {
  if (!raw) return EMPTY_ALERT_STATE
  try {
    const data = JSON.parse(raw) as Partial<AlertState>
    return { hidden: data.hidden ?? {}, notified: data.notified ?? {} }
  } catch {
    return EMPTY_ALERT_STATE
  }
}

export function parsePrefs(raw: string | null): ReminderPrefs {
  if (!raw) return DEFAULT_PREFS
  try {
    const data = JSON.parse(raw) as Partial<ReminderPrefs>
    const hour = typeof data.hour === 'number' && Number.isInteger(data.hour) && data.hour >= 0 && data.hour <= 23 ? data.hour : DEFAULT_PREFS.hour
    return { notify: data.notify === true, hour }
  } catch {
    return DEFAULT_PREFS
  }
}
