import { describe, expect, it } from 'vitest'
import {
  allocationCheck,
  budgetControlRows,
  categoryUsage,
  spentByCategory,
  savingsDepositSuggestion,
  summarizeMonth,
  summaryFromTotals,
  type CategoryLike,
  type CategoryType,
  type TransactionLike,
} from './budget'

const types = new Map<string, CategoryType>([
  ['tab', 'tabungan'],
  ['makan', 'kebutuhan'],
  ['jajan', 'keinginan'],
])

const tx = (type: 'masuk' | 'keluar', categoryId: string | null, amount: number): TransactionLike => ({
  type,
  categoryId,
  amount,
})

describe('summarizeMonth', () => {
  it('memisahkan tabungan dari pengeluaran', () => {
    const summary = summarizeMonth(
      [
        tx('masuk', null, 3_900_000),
        tx('keluar', 'tab', 1_200_000),
        tx('keluar', 'makan', 500_000),
        tx('keluar', 'jajan', 100_000),
      ],
      types,
    )
    expect(summary).toEqual({
      income: 3_900_000,
      totalOut: 1_800_000,
      saved: 1_200_000,
      spending: 600_000,
      remaining: 2_100_000,
      savingsRatioBp: 3077,
    })
  })

  it('bulan kosong tidak error', () => {
    const summary = summarizeMonth([], types)
    expect(summary.income).toBe(0)
    expect(summary.remaining).toBe(0)
    expect(summary.savingsRatioBp).toBeNull()
  })

  it('sisa bisa negatif kalau pengeluaran melebihi pemasukan', () => {
    const summary = summarizeMonth([tx('masuk', null, 100_000), tx('keluar', 'makan', 150_000)], types)
    expect(summary.remaining).toBe(-50_000)
  })

  it('kategori yang tidak dikenal dihitung sebagai pengeluaran', () => {
    const summary = summarizeMonth([tx('keluar', 'hilang', 10_000)], types)
    expect(summary.spending).toBe(10_000)
    expect(summary.saved).toBe(0)
  })
})

describe('spentByCategory', () => {
  it('menjumlahkan uang keluar per kategori dan mengabaikan pemasukan', () => {
    const result = spentByCategory([
      tx('keluar', 'makan', 20_000),
      tx('keluar', 'makan', 30_000),
      tx('keluar', 'jajan', 5_000),
      tx('masuk', null, 3_900_000),
    ])
    expect(result.get('makan')).toBe(50_000)
    expect(result.get('jajan')).toBe(5_000)
    expect(result.size).toBe(2)
  })
})

describe('categoryUsage', () => {
  it('aman di bawah 80%', () => {
    const u = categoryUsage('kebutuhan', 1_000_000, 799_999)
    expect(u.status).toBe('aman')
    expect(u.kind === 'pengeluaran' && u.remaining).toBe(200_001)
  })

  it('waspada mulai 80% sampai tepat 100%', () => {
    expect(categoryUsage('kebutuhan', 1_000_000, 800_000).status).toBe('waspada')
    expect(categoryUsage('kebutuhan', 1_000_000, 1_000_000).status).toBe('waspada')
  })

  it('lewat kalau melebihi batas, bar tetap maksimal 100%', () => {
    const u = categoryUsage('keinginan', 250_000, 300_000)
    expect(u.status).toBe('lewat')
    expect(u.barBp).toBe(10000)
    expect(u.kind === 'pengeluaran' && u.remaining).toBe(-50_000)
  })

  it('batas 0: aman kalau belum dipakai, lewat kalau dipakai', () => {
    expect(categoryUsage('kebutuhan', 0, 0).status).toBe('aman')
    expect(categoryUsage('kebutuhan', 0, 1).status).toBe('lewat')
  })

  it('tabungan memakai logika terbalik', () => {
    const kurang = categoryUsage('tabungan', 1_200_000, 700_000)
    expect(kurang).toMatchObject({ kind: 'tabungan', status: 'kurang', shortfall: 500_000 })
    const tercapai = categoryUsage('tabungan', 1_200_000, 1_500_000)
    expect(tercapai).toMatchObject({ kind: 'tabungan', status: 'tercapai', shortfall: 0 })
  })
})

describe('allocationCheck', () => {
  const dataAwal = [1_200_000, 400_000, 1_000_000, 300_000, 150_000, 300_000, 250_000, 300_000]

  it('anggaran data awal pas dengan gaji 3.900.000', () => {
    expect(allocationCheck(3_900_000, dataAwal)).toEqual({
      income: 3_900_000,
      allocated: 3_900_000,
      difference: 0,
      status: 'pas',
    })
  })

  it('memberi tahu uang yang belum dialokasikan', () => {
    expect(allocationCheck(4_000_000, dataAwal)).toMatchObject({
      status: 'belum_teralokasi',
      difference: 100_000,
    })
  })

  it('memberi tahu kelebihan alokasi', () => {
    expect(allocationCheck(3_800_000, dataAwal)).toMatchObject({ status: 'lebih', difference: -100_000 })
  })
})

describe('summaryFromTotals', () => {
  it('sama dengan summarizeMonth untuk data yang sama', () => {
    expect(summaryFromTotals({ income: 3_900_000, totalOut: 1_800_000, saved: 1_200_000 })).toEqual({
      income: 3_900_000,
      totalOut: 1_800_000,
      saved: 1_200_000,
      spending: 600_000,
      remaining: 2_100_000,
      savingsRatioBp: 3077,
    })
  })

  it('rasio null tanpa pemasukan, sisa bisa negatif', () => {
    const s = summaryFromTotals({ income: 0, totalOut: 50_000, saved: 0 })
    expect(s.savingsRatioBp).toBeNull()
    expect(s.remaining).toBe(-50_000)
  })
})

describe('budgetControlRows', () => {
  const cats: CategoryLike[] = [
    { id: 'makan', name: 'Makan', type: 'kebutuhan', sortOrder: 2, archived: false },
    { id: 'tab', name: 'Tabungan', type: 'tabungan', sortOrder: 1, archived: false },
    { id: 'jajan', name: 'Jajan', type: 'keinginan', sortOrder: 3, archived: false },
    { id: 'lama', name: 'Lama', type: 'keinginan', sortOrder: 4, archived: true },
  ]

  it('hanya pos beranggaran atau terpakai, urut sort_order', () => {
    const rows = budgetControlRows(
      cats,
      new Map([
        ['makan', 1_000_000],
        ['tab', 1_200_000],
      ]),
      new Map([
        ['makan', 900_000],
        ['lama', 20_000],
      ]),
    )
    expect(rows.map((r) => r.category.id)).toEqual(['tab', 'makan', 'lama'])
    expect(rows[1]!.usage).toMatchObject({ kind: 'pengeluaran', status: 'waspada' })
    // Terpakai tanpa anggaran = lewat batas.
    expect(rows[2]!.usage).toMatchObject({ kind: 'pengeluaran', limit: 0, status: 'lewat' })
    expect(rows[0]!.usage).toMatchObject({ kind: 'tabungan', shortfall: 1_200_000 })
  })
})

describe('savingsDepositSuggestion', () => {
  it('sisa kekurangan', () => {
    expect(savingsDepositSuggestion(1_200_000, 0)).toBe(1_200_000)
    expect(savingsDepositSuggestion(1_200_000, 500_000)).toBe(700_000)
  })

  it('target penuh kalau sudah tercapai', () => {
    expect(savingsDepositSuggestion(1_200_000, 1_200_000)).toBe(1_200_000)
    expect(savingsDepositSuggestion(1_200_000, 1_500_000)).toBe(1_200_000)
  })
})
