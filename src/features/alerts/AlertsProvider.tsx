import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { getMonthBudget, listCategories, listMonthTransactions, toCategoryLike } from '../../db/finance'
import { getActiveCycle, getCycleDetail } from '../../db/learning'
import { useQuery } from '../../db/useQuery'
import { financeAlerts, learningAlerts, sortAlerts, type AppAlert } from '../../lib/alerts'
import {
  alertsToNotify,
  dismiss as dismissAlert,
  markNotified,
  parsePrefs,
  parseState,
  pruneState,
  snooze as snoozeAlert,
  visibleAlerts,
  type AlertState,
  type ReminderPrefs,
} from '../../lib/alertState'
import { jakartaHour, monthStart, todayJakarta } from '../../lib/dates'
import { AlertToast } from './AlertToast'
import { showSystemNotification } from './notify'
import { AlertsContext, DATA_CHANGED_EVENT, type AlertsValue } from './useAlerts'

const STATE_KEY = 'ulul.alerts.v1'
const PREFS_KEY = 'ulul.reminders.v1'
const TICK_MS = 60_000

function load(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Penyimpanan penuh/diblokir: pengingat tetap jalan untuk sesi ini saja.
  }
}

/**
 * Menghitung peringatan keuangan dan belajar untuk hari ini, menampilkannya sebagai toast saat ada yang baru,
 * dan mengirim notifikasi sistem pada jam pengingat selama aplikasi terbuka.
 */
export function AlertsProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [today, setToday] = useState(todayJakarta)
  const [hour, setHour] = useState(jakartaHour)
  const [state, setState] = useState<AlertState>(() => pruneState(parseState(load(STATE_KEY)), todayJakarta()))
  const [prefs, setPrefsState] = useState<ReminderPrefs>(() => parsePrefs(load(PREFS_KEY)))
  const [toast, setToast] = useState<AppAlert | null>(null)
  const month = monthStart(today)

  const query = useQuery(async () => {
    const [categories, budget, transactions, cycle] = await Promise.all([
      listCategories(),
      getMonthBudget(month),
      listMonthTransactions(month),
      getActiveCycle(),
    ])
    return { categories, budget, transactions, cycle, detail: cycle ? await getCycleDetail(cycle.id) : null }
  }, [month])
  const { reload } = query

  // Hitung ulang saat pindah halaman, kembali ke aplikasi, atau setelah data disimpan.
  const firstRoute = useRef(true)
  useEffect(() => {
    if (firstRoute.current) {
      firstRoute.current = false
      return
    }
    reload()
  }, [location.pathname, reload])
  useEffect(() => {
    const refresh = () => {
      setToday(todayJakarta())
      setHour(jakartaHour())
      reload()
    }
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    window.addEventListener(DATA_CHANGED_EVENT, refresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener(DATA_CHANGED_EVENT, refresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [reload])
  useEffect(() => {
    const id = setInterval(() => {
      setToday(todayJakarta())
      setHour(jakartaHour())
    }, TICK_MS)
    return () => clearInterval(id)
  }, [])

  const all = useMemo(() => {
    const data = query.data
    if (!data) return null
    const likes = data.transactions.map((t) => ({ type: t.type, categoryId: t.category_id, amount: t.amount }))
    return sortAlerts([
      ...financeAlerts({
        today,
        month,
        budget: data.budget ? { income: data.budget.month.income, items: data.budget.items } : null,
        categories: data.categories.map(toCategoryLike),
        transactions: likes,
      }),
      ...learningAlerts({
        today,
        hour,
        reminderHour: prefs.hour,
        cycle: data.cycle,
        tactics: data.detail?.tactics ?? [],
        weeks: data.detail?.weeks ?? [],
        tracks: data.detail?.tracks ?? [],
        schedule: data.detail?.schedule ?? [],
        reviewedWeeks: data.detail?.reviews.map((r) => r.week_number) ?? [],
        toDate: (timestamp) => todayJakarta(new Date(timestamp)),
      }),
    ])
  }, [query.data, today, month, hour, prefs.hour])

  const alerts = useMemo(() => (all ? visibleAlerts(all, state, today) : []), [all, state, today])

  const updateState = useCallback((update: (prev: AlertState) => AlertState) => {
    setState((prev) => {
      const next = update(prev)
      save(STATE_KEY, next)
      return next
    })
  }, [])

  // Toast untuk peringatan penting yang baru muncul sesudah data berubah (bukan saat pertama dimuat).
  const seen = useRef<Set<string> | null>(null)
  useEffect(() => {
    if (!all) return
    const urgent = alerts.filter((a) => a.severity !== 'info')
    if (seen.current === null) {
      seen.current = new Set(urgent.map((a) => a.id))
      return
    }
    const fresh = urgent.find((a) => !seen.current!.has(a.id))
    for (const a of urgent) seen.current.add(a.id)
    if (fresh) setToast(fresh)
  }, [all, alerts])

  // Notifikasi sistem sekali per hari per peringatan, mulai jam pengingat.
  const latest = useRef({ alerts, state, today })
  useEffect(() => {
    latest.current = { alerts, state, today }
  })
  useEffect(() => {
    if (!prefs.notify || hour < prefs.hour || !all) return
    const { alerts: current, state: s, today: d } = latest.current
    const due = alertsToNotify(current, s, d)
    if (due.length === 0) return
    updateState((prev) => markNotified(prev, due.map((a) => a.id), d))
    const first = due[0]!
    const title = due.length === 1 ? first.title : `Ulul Hub: ${due.length} pengingat`
    const body = due.length === 1 ? first.message : due.map((a) => `• ${a.title}`).join('\n')
    void showSystemNotification(title, body, `ulul-${d}`).catch(() => undefined)
  }, [all, hour, prefs.notify, prefs.hour, updateState])

  const value = useMemo<AlertsValue>(
    () => ({
      alerts,
      loading: query.loading && !query.data,
      error: query.data ? null : query.error,
      prefs,
      setPrefs: (next) => {
        setPrefsState(next)
        save(PREFS_KEY, next)
      },
      snooze: (id) => updateState((prev) => snoozeAlert(prev, id, today)),
      dismiss: (id) => updateState((prev) => dismissAlert(prev, id)),
      refresh: reload,
    }),
    [alerts, query.loading, query.data, query.error, prefs, today, updateState, reload],
  )

  return (
    <AlertsContext.Provider value={value}>
      {children}
      <AlertToast alert={toast} onClose={() => setToast(null)} />
    </AlertsContext.Provider>
  )
}
