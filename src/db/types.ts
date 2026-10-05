// Tipe tabel Supabase, ditulis tangan mengikuti supabase/migrations/.
// Setiap kali menambah migration, perbarui tipe di file ini juga.
// Kolom bigint (uang) dikirim PostgREST sebagai number JSON; aman karena rupiah < 2^53.

import type { CategoryType, TransactionType } from '../lib/budget'
import type { ISODate } from '../lib/dates'

type UUID = string
/** Timestamp ISO dari Postgres, contoh "2026-10-05T01:23:45.678+00:00". */
type Timestamp = string

/**
 * Bentuk tabel untuk supabase-js.
 * `Generated` = kolom yang punya default di database (boleh tidak dikirim saat insert).
 */
type Table<Row extends Record<string, unknown>, Generated extends keyof Row> = {
  Row: Row
  Insert: Omit<Row, Generated> & Partial<Pick<Row, Generated>>
  Update: Partial<Row>
  Relationships: []
}

export type BudgetCategory = {
  id: UUID
  user_id: UUID
  name: string
  type: CategoryType
  sort_order: number
  archived_at: Timestamp | null
  created_at: Timestamp
}

export type BudgetMonth = {
  id: UUID
  user_id: UUID
  /** Selalu tanggal 1. */
  month: ISODate
  income: number
  created_at: Timestamp
}

export type BudgetMonthItem = {
  id: UUID
  user_id: UUID
  budget_month_id: UUID
  category_id: UUID
  amount: number
}

export type IncomeSource = 'gaji' | 'lain'

export type Transaction = {
  id: UUID
  user_id: UUID
  date: ISODate
  type: TransactionType
  category_id: UUID | null
  income_source: IncomeSource | null
  amount: number
  note: string
  created_at: Timestamp
  updated_at: Timestamp
}

export type CycleStatus = 'aktif' | 'selesai' | 'arsip'

export type LearningCycle = {
  id: UUID
  user_id: UUID
  name: string
  /** Selalu hari Senin. */
  start_date: ISODate
  vision: string
  status: CycleStatus
  created_at: Timestamp
}

export type LearningTrack = {
  id: UUID
  user_id: UUID
  cycle_id: UUID
  name: string
  color: string
  goal: string
  sort_order: number
}

export type LearningWeek = {
  id: UUID
  user_id: UUID
  cycle_id: UUID
  track_id: UUID
  week_number: number
  topic: string
  source: string
}

export type LearningTactic = {
  id: UUID
  user_id: UUID
  /** null = taktik tetap. */
  week_id: UUID | null
  cycle_id: UUID
  week_number: number
  label: string
  done: boolean
  done_at: Timestamp | null
  sort_order: number
  created_at: Timestamp
}

export type WeeklyReview = {
  id: UUID
  user_id: UUID
  cycle_id: UUID
  week_number: number
  score: number
  went_well: string
  to_improve: string
  created_at: Timestamp
  updated_at: Timestamp
}

export type StudySchedule = {
  id: UUID
  user_id: UUID
  cycle_id: UUID
  /** 1 = Senin ... 7 = Minggu */
  weekday: number
  /** null = hari review. */
  track_id: UUID | null
}

export type Note = {
  id: UUID
  user_id: UUID
  title: string
  body: string
  sort_order: number
  created_at: Timestamp
  updated_at: Timestamp
}

/** View monthly_totals: total per bulan untuk laporan. */
export type MonthlyTotal = {
  user_id: UUID
  /** Tanggal 1. */
  month: ISODate
  income: number
  total_out: number
  saved: number
  transaction_count: number
}

export type Database = {
  public: {
    Tables: {
      budget_categories: Table<BudgetCategory, 'id' | 'user_id' | 'sort_order' | 'archived_at' | 'created_at'>
      budget_months: Table<BudgetMonth, 'id' | 'user_id' | 'income' | 'created_at'>
      budget_month_items: Table<BudgetMonthItem, 'id' | 'user_id' | 'amount'>
      transactions: Table<
        Transaction,
        'id' | 'user_id' | 'category_id' | 'income_source' | 'note' | 'created_at' | 'updated_at'
      >
      learning_cycles: Table<LearningCycle, 'id' | 'user_id' | 'vision' | 'status' | 'created_at'>
      learning_tracks: Table<LearningTrack, 'id' | 'user_id' | 'color' | 'goal' | 'sort_order'>
      learning_weeks: Table<LearningWeek, 'id' | 'user_id' | 'topic' | 'source'>
      learning_tactics: Table<
        LearningTactic,
        'id' | 'user_id' | 'week_id' | 'done' | 'done_at' | 'sort_order' | 'created_at'
      >
      weekly_reviews: Table<
        WeeklyReview,
        'id' | 'user_id' | 'went_well' | 'to_improve' | 'created_at' | 'updated_at'
      >
      study_schedule: Table<StudySchedule, 'id' | 'user_id' | 'track_id'>
      notes: Table<Note, 'id' | 'user_id' | 'title' | 'body' | 'sort_order' | 'created_at' | 'updated_at'>
    }
    Views: {
      monthly_totals: { Row: MonthlyTotal; Relationships: [] }
    }
    Functions: {
      seed_initial_data: {
        Args: { p_month: ISODate; p_cycle_start: ISODate; p_cycle_name: string }
        Returns: UUID
      }
      create_learning_cycle: {
        Args: { p_name: string; p_start: ISODate; p_vision: string; p_source: UUID | null; p_mode: string }
        Returns: UUID
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
