import { useSearchParams } from 'react-router'
import { monthStart, parseMonthParam, todayJakarta, toMonthParam, type ISODate } from '../../lib/dates'

/** Bulan yang sedang dilihat, disimpan di URL (?bulan=2026-10) supaya bisa di-refresh dan dibagikan. */
export function useMonthParam(): [ISODate, (month: ISODate) => void] {
  const [params, setParams] = useSearchParams()
  const month = parseMonthParam(params.get('bulan')) ?? monthStart(todayJakarta())
  const setMonth = (next: ISODate) =>
    setParams(
      (prev) => {
        const copy = new URLSearchParams(prev)
        copy.set('bulan', toMonthParam(next))
        return copy
      },
      { replace: true },
    )
  return [month, setMonth]
}
