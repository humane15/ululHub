import { useEffect, useState } from 'react'

export interface ChartColors {
  series: [string, string, string]
  surface: string
  grid: string
  muted: string
  text: string
}

function read(): ChartColors {
  const css = getComputedStyle(document.documentElement)
  const v = (name: string) => css.getPropertyValue(name).trim()
  return {
    series: [v('--c-series-1'), v('--c-series-2'), v('--c-series-3')],
    surface: v('--c-surface'),
    grid: v('--c-border'),
    muted: v('--c-muted'),
    text: v('--c-text'),
  }
}

/** Warna grafik dari token CSS (src/index.css); diperbarui saat mode terang/gelap berubah. */
export function useChartColors(): ChartColors {
  const [colors, setColors] = useState(read)
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => setColors(read())
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return colors
}
