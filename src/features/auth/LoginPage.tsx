import { useState, type FormEvent } from 'react'
import { Button, Card, inputClass } from '../../components/ui'
import { supabase } from '../../db/supabase'

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; email: string }
  | { kind: 'verifying'; email: string }
  | { kind: 'code_error'; email: string; message: string }
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
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const sentTo = status.kind === 'sent' || status.kind === 'verifying' || status.kind === 'code_error' ? status.email : null

  // Kode di email dipakai di aplikasi yang terpasang di HP (terutama iPhone), karena link email
  // selalu terbuka di browser yang penyimpanannya terpisah dari aplikasi.
  async function handleVerify(event: FormEvent) {
    event.preventDefault()
    if (!sentTo) return
    setStatus({ kind: 'verifying', email: sentTo })
    const { error } = await supabase.auth.verifyOtp({ email: sentTo, token: code.trim(), type: 'email' })
    if (error) {
      setStatus({
        kind: 'code_error',
        email: sentTo,
        message: /expired|invalid/i.test(error.message) ? 'Kode salah atau sudah kedaluwarsa.' : error.message,
      })
    }
  }

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
          {sentTo ? (
            <div className="space-y-4">
              <div className="space-y-1 text-center">
                <p className="font-medium">Cek email kamu</p>
                <p className="text-sm text-muted">
                  Link masuk sudah dikirim ke <span className="font-medium text-text">{sentTo}</span>. Buka link itu, atau
                  ketik kode dari email di bawah ini.
                </p>
              </div>
              <form onSubmit={handleVerify} className="space-y-3">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Kode dari email"
                  aria-label="Kode dari email"
                  className={`${inputClass} num text-center text-lg tracking-widest`}
                />
                {status.kind === 'code_error' && (
                  <p role="alert" className="text-sm text-bad">
                    {status.message}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={code.length < 6 || status.kind === 'verifying'}>
                  {status.kind === 'verifying' ? 'Memeriksa…' : 'Masuk dengan kode'}
                </Button>
              </form>
              <button
                type="button"
                className="block w-full text-center text-sm font-medium text-primary"
                onClick={() => {
                  setCode('')
                  setStatus({ kind: 'idle' })
                }}
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
