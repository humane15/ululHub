// Warna jalur. Nama kelas ditulis lengkap supaya terdeteksi Tailwind.
export const TRACK_COLORS = {
  emerald: { label: 'Hijau', dot: 'bg-emerald-500', soft: 'bg-emerald-500/10', border: 'border-emerald-500/40' },
  sky: { label: 'Biru', dot: 'bg-sky-500', soft: 'bg-sky-500/10', border: 'border-sky-500/40' },
  amber: { label: 'Kuning', dot: 'bg-amber-500', soft: 'bg-amber-500/10', border: 'border-amber-500/40' },
  rose: { label: 'Merah', dot: 'bg-rose-500', soft: 'bg-rose-500/10', border: 'border-rose-500/40' },
  violet: { label: 'Ungu', dot: 'bg-violet-500', soft: 'bg-violet-500/10', border: 'border-violet-500/40' },
  orange: { label: 'Oranye', dot: 'bg-orange-500', soft: 'bg-orange-500/10', border: 'border-orange-500/40' },
  teal: { label: 'Toska', dot: 'bg-teal-500', soft: 'bg-teal-500/10', border: 'border-teal-500/40' },
  slate: { label: 'Abu', dot: 'bg-slate-500', soft: 'bg-slate-500/10', border: 'border-slate-500/40' },
} as const

export type TrackColor = keyof typeof TRACK_COLORS

export const TRACK_COLOR_NAMES = Object.keys(TRACK_COLORS) as TrackColor[]

export function trackColor(name: string) {
  return TRACK_COLORS[(name in TRACK_COLORS ? name : 'slate') as TrackColor]
}
