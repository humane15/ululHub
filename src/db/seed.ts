import type { ISODate } from '../lib/dates'
import { supabase } from './supabase'

/** true kalau akun sudah punya kategori anggaran atau siklus belajar. */
export async function hasAnyData(): Promise<boolean> {
  const [categories, cycles] = await Promise.all([
    supabase.from('budget_categories').select('id', { count: 'exact', head: true }),
    supabase.from('learning_cycles').select('id', { count: 'exact', head: true }),
  ])
  if (categories.error) throw categories.error
  if (cycles.error) throw cycles.error
  return (categories.count ?? 0) > 0 || (cycles.count ?? 0) > 0
}

/** Mengisi anggaran bulan pertama dan Siklus 1 (lihat migration fungsi_data_awal). */
export async function seedInitialData(params: {
  month: ISODate
  cycleStart: ISODate
  cycleName: string
}): Promise<string> {
  const { data, error } = await supabase.rpc('seed_initial_data', {
    p_month: params.month,
    p_cycle_start: params.cycleStart,
    p_cycle_name: params.cycleName,
  })
  if (error) throw error
  return data
}

// export async function seedInitialDataIfNeeded(params: {
//   month : ISODate
// })