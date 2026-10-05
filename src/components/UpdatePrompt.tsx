import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from './ui'

const CHECK_EVERY_MS = 60 * 60 * 1000

/** Banner saat versi baru aplikasi tersedia. Aplikasi yang terpasang di HP juga dicek tiap jam. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => void registration.update(), CHECK_EVERY_MS)
    },
  })

  if (!needRefresh) return null

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-24 z-30 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-lg md:bottom-6"
    >
      <p className="flex-1 text-sm">Versi baru Ulul Hub tersedia.</p>
      <Button variant="secondary" className="px-3 py-1.5" onClick={() => setNeedRefresh(false)}>
        Nanti
      </Button>
      <Button className="px-3 py-1.5" onClick={() => void updateServiceWorker(true)}>
        Muat ulang
      </Button>
    </div>
  )
}
