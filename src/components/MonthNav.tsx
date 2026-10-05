import { addMonths, formatBulan, type ISODate } from '../lib/dates'
import { ChevronLeftIcon, ChevronRightIcon } from './icons'

export function MonthNav({ month, onChange }: { month: ISODate; onChange: (month: ISODate) => void }) {
  const button = 'rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-text'
  return (
    <div className="flex items-center gap-1">
      <button type="button" className={button} onClick={() => onChange(addMonths(month, -1))} aria-label="Bulan sebelumnya">
        <ChevronLeftIcon className="size-5" />
      </button>
      <span className="min-w-36 text-center font-medium">{formatBulan(month)}</span>
      <button type="button" className={button} onClick={() => onChange(addMonths(month, 1))} aria-label="Bulan berikutnya">
        <ChevronRightIcon className="size-5" />
      </button>
    </div>
  )
}
