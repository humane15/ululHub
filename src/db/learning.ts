import type { ISODate } from '../lib/dates'
import { fail } from './errors'
import { supabase } from './supabase'
import type {
  CycleStatus,
  CycleWeekStat,
  LearningCycle,
  LearningTactic,
  LearningTrack,
  LearningWeek,
  Note,
  StudySchedule,
  WeeklyReview,
} from './types'

// ---------- Siklus ----------

export async function getActiveCycle(): Promise<LearningCycle | null> {
  const { data, error } = await supabase.from('learning_cycles').select('*').eq('status', 'aktif').maybeSingle()
  if (error) fail(error)
  return data
}

/** Siklus terbaru (sumber salinan) dan jumlah semua siklus (untuk nomor siklus berikutnya). */
export async function getCycleOverview(): Promise<{ latest: LearningCycle | null; count: number }> {
  const { data, error, count } = await supabase
    .from('learning_cycles')
    .select('*', { count: 'exact' })
    .order('start_date', { ascending: false })
    .limit(1)
  if (error) fail(error)
  return { latest: data[0] ?? null, count: count ?? 0 }
}

/** Semua siklus, terbaru dulu (beberapa per tahun, jadi aman dimuat sekaligus). */
export async function listCycles(): Promise<LearningCycle[]> {
  const { data, error } = await supabase.from('learning_cycles').select('*').order('start_date', { ascending: false })
  if (error) fail(error)
  return data
}

/** Jumlah taktik per minggu semua siklus (view cycle_week_stats). */
export async function listCycleWeekStats(): Promise<CycleWeekStat[]> {
  const { data, error } = await supabase.from('cycle_week_stats').select('*')
  if (error) fail(error)
  return data
}

/** Mengaktifkan siklus otomatis menandai siklus aktif lain sebagai selesai. */
export async function setCycleStatus(id: string, status: CycleStatus) {
  const { error } = await supabase.rpc('set_cycle_status', { p_cycle: id, p_status: status })
  if (error) fail(error)
}

export type CopyMode = 'kosong' | 'struktur' | 'lengkap'

export async function createCycle(input: {
  name: string
  startDate: ISODate
  vision: string
  source: string | null
  mode: CopyMode
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_learning_cycle', {
    p_name: input.name.trim(),
    p_start: input.startDate,
    p_vision: input.vision.trim(),
    p_source: input.mode === 'kosong' ? null : input.source,
    p_mode: input.mode,
  })
  if (error) fail(error)
  return data
}

export async function updateCycle(id: string, patch: Partial<Pick<LearningCycle, 'name' | 'vision'>>) {
  const { error } = await supabase.from('learning_cycles').update(patch).eq('id', id)
  if (error) fail(error)
}

export interface CycleDetail {
  tracks: LearningTrack[]
  weeks: LearningWeek[]
  tactics: LearningTactic[]
  reviews: WeeklyReview[]
  schedule: StudySchedule[]
}

/** Semua isi satu siklus (paling banyak beberapa ratus baris). */
export async function getCycleDetail(cycleId: string): Promise<CycleDetail> {
  const [tracks, weeks, tactics, reviews, schedule] = await Promise.all([
    supabase.from('learning_tracks').select('*').eq('cycle_id', cycleId).order('sort_order'),
    supabase.from('learning_weeks').select('*').eq('cycle_id', cycleId),
    supabase.from('learning_tactics').select('*').eq('cycle_id', cycleId).order('sort_order').order('created_at'),
    supabase.from('weekly_reviews').select('*').eq('cycle_id', cycleId),
    supabase.from('study_schedule').select('*').eq('cycle_id', cycleId).order('weekday'),
  ])
  for (const r of [tracks, weeks, tactics, reviews, schedule]) if (r.error) fail(r.error)
  return {
    tracks: tracks.data ?? [],
    weeks: weeks.data ?? [],
    tactics: tactics.data ?? [],
    reviews: reviews.data ?? [],
    schedule: schedule.data ?? [],
  }
}

// ---------- Jalur ----------

export async function createTrack(input: { cycleId: string; name: string; color: string; goal: string; sortOrder: number }) {
  const { error } = await supabase.from('learning_tracks').insert({
    cycle_id: input.cycleId,
    name: input.name.trim(),
    color: input.color,
    goal: input.goal.trim(),
    sort_order: input.sortOrder,
  })
  if (error) fail(error)
}

export async function updateTrack(id: string, patch: Partial<Pick<LearningTrack, 'name' | 'color' | 'goal' | 'sort_order'>>) {
  const { error } = await supabase.from('learning_tracks').update(patch).eq('id', id)
  if (error) fail(error)
}

/** Menghapus jalur beserta topik dan taktiknya; hari jadwalnya menjadi hari review. */
export async function deleteTrack(id: string) {
  const { error } = await supabase.from('learning_tracks').delete().eq('id', id)
  if (error) fail(error)
}

export async function reorderTracks(ids: readonly string[]) {
  const results = await Promise.all(
    ids.map((id, i) => supabase.from('learning_tracks').update({ sort_order: i + 1 }).eq('id', id)),
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) fail(failed.error)
}

// ---------- Topik minggu ----------

/** Membuat atau memperbarui topik/sumber satu jalur pada satu minggu. */
export async function upsertWeek(input: {
  cycleId: string
  trackId: string
  weekNumber: number
  topic?: string
  source?: string
}): Promise<LearningWeek> {
  const row: { cycle_id: string; track_id: string; week_number: number; topic?: string; source?: string } = {
    cycle_id: input.cycleId,
    track_id: input.trackId,
    week_number: input.weekNumber,
  }
  if (input.topic !== undefined) row.topic = input.topic.trim()
  if (input.source !== undefined) row.source = input.source.trim()
  const { data, error } = await supabase
    .from('learning_weeks')
    .upsert(row, { onConflict: 'track_id,week_number' })
    .select('*')
    .single()
  if (error) fail(error)
  return data
}

// ---------- Taktik ----------

export async function createTactic(input: {
  cycleId: string
  /** null = taktik tetap minggu itu. */
  weekId: string | null
  weekNumber: number
  label: string
  sortOrder: number
}) {
  const { error } = await supabase.from('learning_tactics').insert({
    cycle_id: input.cycleId,
    week_id: input.weekId,
    week_number: input.weekNumber,
    label: input.label.trim(),
    sort_order: input.sortOrder,
  })
  if (error) fail(error)
}

export async function updateTacticLabel(id: string, label: string) {
  const { error } = await supabase.from('learning_tactics').update({ label: label.trim() }).eq('id', id)
  if (error) fail(error)
}

/** done_at diisi/dikosongkan otomatis oleh trigger database. */
export async function setTacticDone(id: string, done: boolean) {
  const { error } = await supabase.from('learning_tactics').update({ done }).eq('id', id)
  if (error) fail(error)
}

export async function deleteTactic(id: string) {
  const { error } = await supabase.from('learning_tactics').delete().eq('id', id)
  if (error) fail(error)
}

// ---------- Review mingguan ----------

export async function saveWeeklyReview(input: {
  cycleId: string
  weekNumber: number
  score: number
  wentWell: string
  toImprove: string
}) {
  const { error } = await supabase.from('weekly_reviews').upsert(
    {
      cycle_id: input.cycleId,
      week_number: input.weekNumber,
      score: input.score,
      went_well: input.wentWell.trim(),
      to_improve: input.toImprove.trim(),
    },
    { onConflict: 'cycle_id,week_number' },
  )
  if (error) fail(error)
}

// ---------- Jadwal ----------

/** trackId: id jalur, null = hari review, 'libur' = tidak ada jadwal. */
export async function setScheduleDay(cycleId: string, weekday: number, trackId: string | null | 'libur') {
  if (trackId === 'libur') {
    const { error } = await supabase.from('study_schedule').delete().eq('cycle_id', cycleId).eq('weekday', weekday)
    if (error) fail(error)
    return
  }
  const { error } = await supabase
    .from('study_schedule')
    .upsert({ cycle_id: cycleId, weekday, track_id: trackId }, { onConflict: 'cycle_id,weekday' })
  if (error) fail(error)
}

// ---------- Catatan ----------

export async function listNotes(): Promise<Note[]> {
  const { data, error } = await supabase.from('notes').select('*').order('sort_order').order('created_at')
  if (error) fail(error)
  return data
}

export async function createNote(sortOrder: number): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .insert({ title: 'Catatan baru', body: '', sort_order: sortOrder })
    .select('*')
    .single()
  if (error) fail(error)
  return data
}

export async function updateNote(id: string, patch: Partial<Pick<Note, 'title' | 'body'>>) {
  const { error } = await supabase.from('notes').update(patch).eq('id', id)
  if (error) fail(error)
}

export async function deleteNote(id: string) {
  const { error } = await supabase.from('notes').delete().eq('id', id)
  if (error) fail(error)
}
