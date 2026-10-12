import { describe, expect, it } from 'vitest'
import { financeAlerts, learningAlerts, sortAlerts, type LearningAlertInput } from './alerts'
import { alertsToNotify, dismiss, isHidden, EMPTY_ALERT_STATE, markNotified, parsePrefs, snooze } from './alertState'
import type { CategoryLike } from './budget'

const cats: CategoryLike[] = [
  { id: 'mkn', name: 'Makan', type: 'kebutuhan', sortOrder: 1, archived: false },
  { id: 'tbg', name: 'Tabungan', type: 'tabungan', sortOrder: 2, archived: false },
]
const out = (categoryId: string, amount: number) => ({ type: 'keluar' as const, categoryId, amount })

describe('financeAlerts', () => {
  const base = { today: '2026-10-13', month: '2026-10-01', categories: cats }

  it('anggaran belum dibuat', () => {
    const a = financeAlerts({ ...base, budget: null, transactions: [] })
    expect(a.map((x) => x.id)).toEqual(['fin-tanpa-anggaran-2026-10-01'])
  })

  it('alokasi melebihi gaji = bad', () => {
    const a = financeAlerts({
      ...base,
      budget: { income: 1_000_000, items: new Map([['mkn', 800_000], ['tbg', 300_000]]) },
      transactions: [],
    })
    expect(a[0]).toMatchObject({ id: 'fin-alokasi-lebih-2026-10-01', severity: 'bad' })
    expect(a[0]!.message).toContain('100.000')
  })

  it('pos waspada (80%) dan lewat (>100%)', () => {
    const budget = { income: 1_000_000, items: new Map([['mkn', 1_000_000]]) }
    const waspada = financeAlerts({ ...base, budget, transactions: [out('mkn', 800_000)] })
    expect(waspada.map((x) => [x.id, x.severity])).toContainEqual(['fin-waspada-mkn-2026-10-01', 'warn'])
    const lewat = financeAlerts({ ...base, budget, transactions: [out('mkn', 1_000_001)] })
    expect(lewat.map((x) => [x.id, x.severity])).toContainEqual(['fin-lewat-mkn-2026-10-01', 'bad'])
    const aman = financeAlerts({ ...base, budget, transactions: [out('mkn', 500_000)] })
    expect(aman).toEqual([])
  })

  it('minus bulan ini', () => {
    const a = financeAlerts({
      ...base,
      budget: { income: 1_000_000, items: new Map([['mkn', 1_000_000]]) },
      transactions: [{ type: 'masuk', categoryId: null, amount: 100_000 }, out('mkn', 200_000)],
    })
    expect(a.map((x) => x.id)).toContain('fin-minus-2026-10-01')
  })

  it('tabungan kurang hanya diingatkan di akhir bulan', () => {
    const budget = { income: 1_000_000, items: new Map([['tbg', 200_000]]) }
    expect(financeAlerts({ ...base, budget, transactions: [] }).map((x) => x.id)).not.toContain('fin-tabungan-tbg-2026-10-01')
    const late = financeAlerts({ ...base, today: '2026-10-28', budget, transactions: [] })
    expect(late.map((x) => x.id)).toContain('fin-tabungan-tbg-2026-10-01')
  })
})

describe('learningAlerts', () => {
  // Siklus mulai Selasa 13 Okt 2026.
  const cycle = { id: 'c1', name: 'Siklus 1', start_date: '2026-10-13' }
  const tactic = (week_number: number, done: boolean, week_id: string | null = null, done_at: string | null = null) => ({
    week_number,
    done,
    week_id,
    done_at,
  })
  const base: LearningAlertInput = {
    today: '2026-10-13',
    hour: 9,
    reminderHour: 19,
    cycle,
    tactics: [],
    weeks: [],
    tracks: [],
    schedule: [],
    reviewedWeeks: [],
    toDate: (t) => t.slice(0, 10),
  }

  it('tanpa siklus', () => {
    expect(learningAlerts({ ...base, cycle: null }).map((x) => x.id)).toEqual(['bel-tanpa-siklus'])
  })

  it('siklus mulai besok', () => {
    const a = learningAlerts({ ...base, today: '2026-10-12' })
    expect(a[0]!.title).toBe('Siklus 1 mulai besok')
  })

  it('hari pertama (Selasa) tidak dianggap tertinggal; pengingat hari ini jadi warn setelah jam pengingat', () => {
    const input = {
      ...base,
      tactics: [tactic(1, false), tactic(1, false)],
      tracks: [{ id: 't1', name: 'Coding' }],
      schedule: [{ weekday: 2, track_id: 't1' }],
    }
    const pagi = learningAlerts(input)
    expect(pagi.map((x) => [x.id, x.severity])).toEqual([['bel-hari-ini-2026-10-13', 'info']])
    const malam = learningAlerts({ ...input, hour: 20 })
    expect(malam[0]).toMatchObject({ severity: 'warn', title: 'Belum belajar Coding hari ini' })
  })

  it('tertinggal dari laju mingguan', () => {
    // Hari ke-5 (Sabtu 17 Okt): seharusnya minimal floor(7*4/7)=4 dari 7 taktik.
    const tactics = Array.from({ length: 7 }, (_, i) => tactic(1, i < 1, null, i < 1 ? '2026-10-16T01:00:00Z' : null))
    const a = learningAlerts({ ...base, today: '2026-10-17', tactics })
    expect(a.find((x) => x.id.startsWith('bel-tertinggal'))?.message).toContain('idealnya minimal 4')
  })

  it('hari tanpa progres', () => {
    const a = learningAlerts({ ...base, today: '2026-10-16', tactics: [tactic(1, false)] })
    const diam = a.find((x) => x.id.startsWith('bel-diam'))
    expect(diam).toMatchObject({ severity: 'bad', title: '3 hari tanpa progres belajar' })
  })

  it('review minggu lalu belum diisi', () => {
    const a = learningAlerts({
      ...base,
      today: '2026-10-21', // minggu 2
      tactics: [tactic(1, true, null, '2026-10-20T01:00:00Z'), tactic(2, false)],
    })
    expect(a.map((x) => x.id)).toContain('bel-review-c1-1')
    const reviewed = learningAlerts({ ...base, today: '2026-10-21', tactics: [tactic(1, true)], reviewedWeeks: [1] })
    expect(reviewed.map((x) => x.id)).not.toContain('bel-review-c1-1')
  })

  it('siklus berakhir', () => {
    const a = learningAlerts({ ...base, today: '2027-02-01' })
    expect(a[0]!.id).toBe('bel-selesai-c1')
  })
})

describe('sortAlerts', () => {
  it('bad, warn, info; stabil', () => {
    const mk = (id: string, severity: 'bad' | 'warn' | 'info') => ({ id, area: 'keuangan' as const, severity, title: '', message: '', actions: [] })
    expect(sortAlerts([mk('a', 'info'), mk('b', 'bad'), mk('c', 'warn'), mk('d', 'bad')]).map((x) => x.id)).toEqual(['b', 'd', 'c', 'a'])
  })
})

describe('alertState', () => {
  it('snooze sampai besok, dismiss selamanya', () => {
    const s1 = snooze(EMPTY_ALERT_STATE, 'x', '2026-10-13')
    expect(isHidden(s1, 'x', '2026-10-13')).toBe(true)
    expect(isHidden(s1, 'x', '2026-10-14')).toBe(false)
    expect(isHidden(dismiss(EMPTY_ALERT_STATE, 'y'), 'y', '2030-01-01')).toBe(true)
  })

  it('notifikasi sistem: sekali per hari, hanya bad/warn, tidak untuk yang disembunyikan', () => {
    const mk = (id: string, severity: 'bad' | 'warn' | 'info') => ({ id, area: 'belajar' as const, severity, title: '', message: '', actions: [] })
    const alerts = [mk('a', 'bad'), mk('b', 'info'), mk('c', 'warn')]
    const today = '2026-10-13'
    expect(alertsToNotify(alerts, EMPTY_ALERT_STATE, today).map((x) => x.id)).toEqual(['a', 'c'])
    const sent = markNotified(EMPTY_ALERT_STATE, ['a'], today)
    expect(alertsToNotify(alerts, sent, today).map((x) => x.id)).toEqual(['c'])
    expect(alertsToNotify(alerts, sent, '2026-10-14').map((x) => x.id)).toEqual(['a', 'c'])
    expect(alertsToNotify(alerts, snooze(sent, 'c', today), today)).toEqual([])
  })

  it('parsePrefs menolak jam tidak valid', () => {
    expect(parsePrefs('{"notify":true,"hour":7}')).toEqual({ notify: true, hour: 7 })
    expect(parsePrefs('{"notify":true,"hour":99}').hour).toBe(19)
    expect(parsePrefs('bukan json')).toEqual({ notify: false, hour: 19 })
  })
})
