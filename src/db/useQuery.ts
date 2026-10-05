import { useCallback, useEffect, useState, type DependencyList } from 'react'

export interface QueryState<T> {
  data: T | undefined
  error: Error | null
  loading: boolean
  /** Muat ulang (misalnya setelah menyimpan). Data lama tetap tampil selama memuat. */
  reload: () => void
  /** Ubah data lokal langsung (optimistic update) tanpa memuat ulang. */
  mutate: (updater: (prev: T) => T) => void
}

/** Memuat data async. `fn` dijalankan ulang setiap `deps` berubah. */
export function useQuery<T>(fn: () => Promise<T>, deps: DependencyList): QueryState<T> {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    fn()
      .then((result) => {
        if (!active) return
        setData(result)
        setError(null)
      })
      .catch((e: unknown) => active && setError(e instanceof Error ? e : new Error(String(e))))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
    // `fn` sengaja tidak masuk deps: pemanggil menentukan kapan memuat ulang lewat `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  const mutate = useCallback((updater: (prev: T) => T) => setData((prev) => (prev === undefined ? prev : updater(prev))), [])
  return { data, error, loading, reload, mutate }
}
