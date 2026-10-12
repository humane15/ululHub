export type NotifySupport = NotificationPermission | 'unsupported'

export function notifySupport(): NotifySupport {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}

export async function requestNotifyPermission(): Promise<NotifySupport> {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.requestPermission()
}

/** Notifikasi sistem. Lewat service worker kalau ada (wajib di Android), kalau tidak langsung dari halaman. */
export async function showSystemNotification(title: string, body: string, tag: string): Promise<void> {
  if (notifySupport() !== 'granted') return
  const options: NotificationOptions = { body, tag, icon: '/pwa-192x192.png', badge: '/pwa-192x192.png' }
  const registration = await navigator.serviceWorker?.getRegistration()
  if (registration) {
    await registration.showNotification(title, options)
    return
  }
  const notification = new Notification(title, options)
  notification.onclick = () => {
    window.focus()
    notification.close()
  }
}
