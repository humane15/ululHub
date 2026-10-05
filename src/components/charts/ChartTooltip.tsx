export interface TooltipRow {
  label: string
  value: string
  color: string
}

/** Isi tooltip: teks memakai warna teks, warna seri hanya di penanda. */
export function ChartTooltip({ title, rows }: { title: string; rows: readonly TooltipRow[] }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium">{title}</p>
      <ul className="space-y-0.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2">
            <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: r.color }} aria-hidden="true" />
            <span className="text-muted">{r.label}</span>
            <span className="num ml-auto pl-3 font-medium">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
