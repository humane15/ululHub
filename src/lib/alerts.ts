import {
  allocationCheck,
  budgetControlRows,
  spentByCategory,
  summarizeMonth,
  type CategoryLike,
  type CategoryType,
  type TransactionLike,
} from './budget'
import { cyclePosition, diffDays, monthRange, namaHari, weekdayIso, type ISODate } from './dates'
import { formatRupiah } from './money'

export type AlertSeverity = 'bad' | 'warn' | 'info'

export interface AlertAction {
  label: string
  to: string
}

export interface AppAlert {
  /** Stabil selama kondisinya sama, dipakai untuk "abaikan" dan "ingatkan besok". */
  id: string
  area: 'keuangan' | 'belajar'
  severity: AlertSeverity
  title: string
  message: string
  actions: AlertAction[]
}

const SEVERITY_RANK: Record<AlertSeverity, number> = { bad: 0, warn: 1, info: 2 }

/** Paling mendesak dulu; urutan asli dipertahankan di dalam tingkat yang sama. */
export function sortAlerts(alerts: readonly AppAlert[]): AppAlert[] {
  return alerts
    .map((alert, index) => ({ alert, index }))
    .sort((a, b) => SEVERITY_RANK[a.alert.severity] - SEVERITY_RANK[b.alert.severity] || a.index - b.index)
    .map((x) => x.alert)
}

// ---------- Keuangan ----------

export interface FinanceAlertInput {
  today: ISODate
  /** Tanggal 1 bulan yang dicek. */
  month: ISODate
  /** null = anggaran bulan ini belum dibuat. */
  budget: { income: number; items: ReadonlyMap<string, number> } | null
  categories: readonly CategoryLike[]
  transactions: readonly TransactionLike[]
}

/** Hari tersisa sebelum bulan berganti, termasuk hari ini. */
function daysLeftInMonth(month: ISODate, today: ISODate): number {
  return diffDays(today, monthRange(month).end)
}

const SAVINGS_REMINDER_DAYS = 5

export function financeAlerts(input: FinanceAlertInput): AppAlert[] {
  const { today, month, budget, categories, transactions } = input
  const alerts: AppAlert[] = []
  const link = '/keuangan'
  const budgetLink = '/keuangan/anggaran'

  const types = new Map<string, CategoryType>(categories.map((c) => [c.id, c.type]))
  const summary = summarizeMonth(transactions, types)

  if (!budget) {
    alerts.push({
      id: `fin-tanpa-anggaran-${month}`,
      area: 'keuangan',
      severity: 'info',
      title: 'Anggaran bulan ini belum dibuat',
      message: 'Tanpa anggaran, pengeluaran tidak bisa dipantau per pos.',
      actions: [{ label: 'Buat anggaran', to: budgetLink }],
    })
  } else {
    const check = allocationCheck(budget.income, [...budget.items.values()])
    if (check.status === 'lebih') {
      alerts.push({
        id: `fin-alokasi-lebih-${month}`,
        area: 'keuangan',
        severity: 'bad',
        title: 'Anggaran melebihi pemasukan',
        message: `Total anggaran ${formatRupiah(check.allocated)} lebih besar ${formatRupiah(-check.difference)} dari gaji ${formatRupiah(check.income)}. Kurangi salah satu pos.`,
        actions: [{ label: 'Atur anggaran', to: budgetLink }],
      })
    } else if (check.status === 'belum_teralokasi' && check.income > 0) {
      alerts.push({
        id: `fin-alokasi-sisa-${month}`,
        area: 'keuangan',
        severity: 'info',
        title: 'Ada gaji yang belum punya pos',
        message: `${formatRupiah(check.difference)} belum dialokasikan. Tiap rupiah sebaiknya punya tujuan.`,
        actions: [{ label: 'Atur anggaran', to: budgetLink }],
      })
    }

    const spent = spentByCategory(transactions)
    for (const row of budgetControlRows(categories, budget.items, spent)) {
      if (row.usage.kind !== 'pengeluaran' || row.usage.status === 'aman') continue
      const { name } = row.category
      if (row.usage.status === 'lewat') {
        const over = row.usage.used - row.usage.limit
        alerts.push({
          id: `fin-lewat-${row.category.id}-${month}`,
          area: 'keuangan',
          severity: 'bad',
          title: `${name} melewati anggaran`,
          message:
            row.usage.limit === 0
              ? `${formatRupiah(row.usage.used)} sudah terpakai, padahal pos ini belum dianggarkan.`
              : `Lebih ${formatRupiah(over)} dari batas ${formatRupiah(row.usage.limit)}.`,
          actions: [
            { label: 'Lihat transaksi', to: link },
            { label: 'Sesuaikan anggaran', to: budgetLink },
          ],
        })
      } else {
        alerts.push({
          id: `fin-waspada-${row.category.id}-${month}`,
          area: 'keuangan',
          severity: 'warn',
          title: `${name} hampir habis`,
          message: `Tersisa ${formatRupiah(row.usage.remaining)} dari ${formatRupiah(row.usage.limit)}.`,
          actions: [{ label: 'Lihat pos', to: link }],
        })
      }
    }

    // Setoran tabungan menjelang akhir bulan.
    if (daysLeftInMonth(month, today) <= SAVINGS_REMINDER_DAYS) {
      for (const row of budgetControlRows(categories, budget.items, spent)) {
        if (row.usage.kind !== 'tabungan' || row.usage.status !== 'kurang') continue
        alerts.push({
          id: `fin-tabungan-${row.category.id}-${month}`,
          area: 'keuangan',
          severity: 'warn',
          title: `Target ${row.category.name} belum tercapai`,
          message: `Kurang ${formatRupiah(row.usage.shortfall)} dan bulan segera berakhir.`,
          actions: [{ label: 'Setor sekarang', to: link }],
        })
      }
    }
  }

  // Tanpa pemasukan tercatat, sisa pasti minus karena gaji belum dicatat, bukan karena boros.
  if (summary.income > 0 && summary.remaining < 0) {
    alerts.push({
      id: `fin-minus-${month}`,
      area: 'keuangan',
      severity: 'bad',
      title: 'Uang keluar lebih besar dari pemasukan',
      message: `Bulan ini minus ${formatRupiah(-summary.remaining)}. Tahan pengeluaran sampai ada pemasukan.`,
      actions: [{ label: 'Lihat ringkasan', to: link }],
    })
  }

  return alerts
}

// ---------- Belajar ----------

export interface LearningAlertInput {
  today: ISODate
  /** Jam sekarang di Jakarta (0..23); lewat jam pengingat, pengingat hari ini jadi peringatan. */
  hour: number
  reminderHour: number
  cycle: { id: string; name: string; start_date: ISODate } | null
  tactics: readonly { done: boolean; done_at: string | null; week_number: number; week_id: string | null }[]
  weeks: readonly { id: string; track_id: string; week_number: number }[]
  tracks: readonly { id: string; name: string }[]
  schedule: readonly { weekday: number; track_id: string | null }[]
  reviewedWeeks: readonly number[]
  /** Mengubah timestamp done_at menjadi tanggal Jakarta. */
  toDate: (timestamp: string) => ISODate
}

export function learningAlerts(input: LearningAlertInput): AppAlert[] {
  const { today, cycle } = input
  const alerts: AppAlert[] = []
  const belajar = '/belajar'

  if (!cycle) {
    alerts.push({
      id: 'bel-tanpa-siklus',
      area: 'belajar',
      severity: 'warn',
      title: 'Belum ada siklus belajar aktif',
      message: 'Buat siklus 12 minggu supaya rencana belajar terpantau.',
      actions: [{ label: 'Buat siklus', to: '/belajar/siklus-baru' }],
    })
    return alerts
  }

  const position = cyclePosition(cycle.start_date, today)

  if (position.kind === 'belum_mulai') {
    const { daysUntilStart: days } = position
    alerts.push({
      id: `bel-mulai-${cycle.id}-${days}`,
      area: 'belajar',
      severity: 'info',
      title: days === 1 ? `${cycle.name} mulai besok` : `${cycle.name} mulai ${days} hari lagi`,
      message: 'Siapkan jalur, topik minggu pertama, dan taktik sebelum mulai.',
      actions: [{ label: 'Siapkan', to: '/belajar/atur' }],
    })
    return alerts
  }
  if (position.kind === 'evaluasi') {
    alerts.push({
      id: `bel-evaluasi-${cycle.id}`,
      area: 'belajar',
      severity: 'info',
      title: 'Minggu evaluasi',
      message: 'Lihat hasil 12 minggu, lalu istirahat sebelum siklus berikutnya.',
      actions: [
        { label: 'Lihat evaluasi', to: belajar },
        { label: 'Siklus baru', to: '/belajar/siklus-baru' },
      ],
    })
    return alerts
  }
  if (position.kind === 'selesai') {
    alerts.push({
      id: `bel-selesai-${cycle.id}`,
      area: 'belajar',
      severity: 'warn',
      title: 'Siklus sudah berakhir',
      message: `${cycle.name} selesai ${position.daysSinceEnd} hari lalu. Mulai siklus berikutnya supaya ritme tidak putus.`,
      actions: [{ label: 'Buat siklus baru', to: '/belajar/siklus-baru' }],
    })
    return alerts
  }

  const { week } = position
  const weekTactics = input.tactics.filter((t) => t.week_number === week)
  const pending = weekTactics.filter((t) => !t.done)

  // Hari ini: jalur yang dijadwalkan dan taktik yang belum selesai.
  const entry = input.schedule.find((s) => s.weekday === weekdayIso(today))
  const track = entry?.track_id ? input.tracks.find((t) => t.id === entry.track_id) : undefined
  if (track) {
    const weekRow = input.weeks.find((w) => w.track_id === track.id && w.week_number === week)
    const todayPending = pending.filter((t) => t.week_id === null || (weekRow && t.week_id === weekRow.id))
    if (todayPending.length > 0) {
      const late = input.hour >= input.reminderHour
      alerts.push({
        id: `bel-hari-ini-${today}`,
        area: 'belajar',
        severity: late ? 'warn' : 'info',
        title: late ? `Belum belajar ${track.name} hari ini` : `Hari ini: ${track.name}`,
        message: `${todayPending.length} taktik minggu ke-${week} belum selesai (${namaHari(weekdayIso(today))}).`,
        actions: [{ label: 'Kerjakan sekarang', to: '/' }],
      })
    }
  }

  // Tertinggal dari laju: tiap hari yang lewat seharusnya menyelesaikan 1/7 taktik.
  const elapsedDays = (diffDays(cycle.start_date, today)) % 7
  const expected = Math.floor((weekTactics.length * elapsedDays) / 7)
  const done = weekTactics.length - pending.length
  if (weekTactics.length > 0 && done < expected) {
    alerts.push({
      id: `bel-tertinggal-${cycle.id}-${week}-${today}`,
      area: 'belajar',
      severity: 'warn',
      title: `Minggu ${week} mulai tertinggal`,
      message: `Baru ${done} dari ${weekTactics.length} taktik selesai; di hari ke-${elapsedDays + 1} idealnya minimal ${expected}.`,
      actions: [{ label: 'Kejar sekarang', to: belajar }],
    })
  }

  // Berapa hari berturut-turut tanpa satu pun taktik dicentang.
  if (week > 1 || elapsedDays > 0) {
    const doneDates = input.tactics.flatMap((t) => (t.done && t.done_at ? [input.toDate(t.done_at)] : []))
    const last = doneDates.reduce<ISODate | null>((max, d) => (max === null || d > max ? d : max), null)
    const silent = diffDays(last ?? cycle.start_date, today)
    if (silent >= 2) {
      alerts.push({
        id: `bel-diam-${cycle.id}-${last ?? 'awal'}`,
        area: 'belajar',
        severity: silent >= 3 ? 'bad' : 'warn',
        title: `${silent} hari tanpa progres belajar`,
        message: last
          ? `Terakhir mencentang taktik ${silent} hari lalu. Mulai kecil: satu taktik hari ini.`
          : 'Belum ada taktik yang dicentang di siklus ini. Mulai dari satu taktik hari ini.',
        actions: [{ label: 'Mulai sekarang', to: '/' }],
      })
    }
  }

  // Minggu lalu yang belum direview.
  for (let w = 1; w < week; w++) {
    if (input.reviewedWeeks.includes(w)) continue
    const weekAll = input.tactics.filter((t) => t.week_number === w)
    if (weekAll.length === 0) continue
    const left = weekAll.filter((t) => !t.done).length
    alerts.push({
      id: `bel-review-${cycle.id}-${w}`,
      area: 'belajar',
      severity: 'warn',
      title: `Review minggu ${w} belum diisi`,
      message: left > 0 ? `${left} dari ${weekAll.length} taktik belum selesai. Catat pelajarannya sebelum lupa.` : 'Semua taktik selesai. Tinggal catat apa yang berjalan baik.',
      actions: [{ label: 'Isi review', to: belajar }],
    })
  }

  return alerts
}
