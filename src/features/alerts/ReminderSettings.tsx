import { useState } from 'react'
import { Card, inputClass } from '../../components/ui'
import { notifySupport, requestNotifyPermission, type NotifySupport } from './notify'
import { useAlerts } from './useAlerts'

/** Pengaturan notifikasi sistem dan jam pengingat harian. */
export function ReminderSettings() {
  const { prefs, setPrefs } = useAlerts()
  const [permission, setPermission] = useState<NotifySupport>(notifySupport)

  async function toggle(on: boolean) {
    if (!on) return setPrefs({ ...prefs, notify: false })
    const result = permission === 'granted' ? 'granted' : await requestNotifyPermission()
    setPermission(result)
    setPrefs({ ...prefs, notify: result === 'granted' })
  }

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">Notifikasi pengingat</h2>
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>Kirim notifikasi di perangkat ini</span>
        <input
          type="checkbox"
          checked={prefs.notify && permission === 'granted'}
          disabled={permission === 'unsupported' || permission === 'denied'}
          onChange={(e) => void toggle(e.target.checked)}
          className="size-5 accent-primary"
        />
      </label>
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>Jam pengingat harian</span>
        <select
          value={prefs.hour}
          onChange={(e) => setPrefs({ ...prefs, hour: Number(e.target.value) })}
          className={`${inputClass} w-auto`}
        >
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, '0')}.00
            </option>
          ))}
        </select>
      </label>
      {permission === 'unsupported' && <p className="text-xs text-muted">Browser ini tidak mendukung notifikasi.</p>}
      {permission === 'denied' && (
        <p className="text-xs text-bad">Izin notifikasi ditolak. Aktifkan lewat pengaturan situs di browser.</p>
      )}
      <p className="text-xs text-muted">
        Notifikasi muncul selama aplikasi terbuka atau terpasang di layar utama dan masih berjalan di latar belakang.
        Pengingat di dalam aplikasi (Beranda dan ikon lonceng) selalu aktif. Setelah jam pengingat, belajar yang belum dikerjakan
        berubah menjadi peringatan.
      </p>
    </Card>
  )
}
