import { useState, type InputHTMLAttributes } from 'react'
import { formatThousands, parseRupiahInput } from '../lib/money'
import { inputClass } from './ui'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  /** Nilai integer rupiah; null = kosong. */
  value: number | null
  onChange: (value: number | null) => void
}

/** Input rupiah dengan pemisah ribuan otomatis ("3.900.000"). */
export function MoneyInput({ value, onChange, className = '', ...props }: Props) {
  // Simpan teks yang diketik supaya kursor tidak melompat saat nilai sama.
  const [text, setText] = useState(value === null ? '' : formatThousands(value))
  const parsed = parseRupiahInput(text)
  const shown = parsed === value ? text : value === null ? '' : formatThousands(value)

  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">Rp</span>
      <input
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={shown}
        onChange={(e) => {
          const next = parseRupiahInput(e.target.value)
          setText(next === null ? '' : formatThousands(next))
          onChange(next)
        }}
        className={`${inputClass} num pl-9 ${className}`}
      />
    </div>
  )
}
