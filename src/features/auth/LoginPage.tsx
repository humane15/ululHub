import { useState, type FormEvent } from 'react'
import { Button, Card, inputClass } from '../../components/ui'
import { supabase } from '../../db/supabase'

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; email: string }
  | { kind: 'error'; message: string }

function loginErrorMessage(message: string): string {
  if (/signups? not allowed|user not found/i.test(message)) {
    return 'Email ini belum terdaftar. Hanya pemilik aplikasi yang bisa masuk.'
  }
  if (/rate limit|too many|security purposes/i.test(message)) {
    return 'Terlalu banyak permintaan. Tunggu beberapa menit lalu coba lagi.'
  }
  return `Gagal mengirim link: ${message}`
}

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const target = email.trim()
    setStatus({ kind: 'sending' })
    const { error } = await supabase.auth.signInWithOtp({
      email: target,
      options: {
        emailRedirectTo: window.location.origin,
        // Akun dibuat sekali lewat dashboard Supabase; login tidak boleh membuat user baru.
        shouldCreateUser: false,
      },
    })
    setStatus(error ? { kind: 'error', message: loginErrorMessage(error.message) } : { kind: 'sent', email: target })
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-semibold tracking-tight">
          Ulul <span className="text-primary">Hub</span>
        </h1>
        <p className="mb-6 text-center text-sm text-muted">Keuangan dan rencana belajar</p>
        <Card>
          {status.kind === 'sent' ? (
            <div className="space-y-3 text-center">
              <p className="font-medium">Cek email kamu</p>
              <p className="text-sm text-muted">
                Link masuk sudah dikirim ke <span className="font-medium text-text">{status.email}</span>. Buka link
                itu untuk masuk.
              </p>
              <button
                type="button"
                className="text-sm font-medium text-primary"
                onClick={() => setStatus({ kind: 'idle' })}
              >
                Kirim ulang atau ganti email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Email</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="nama@email.com"
                />
              </label>
              {status.kind === 'error' && (
                <p role="alert" className="text-sm text-bad">
                  {status.message}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={status.kind === 'sending'}>
                {status.kind === 'sending' ? 'Mengirim…' : 'Kirim link masuk'}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
