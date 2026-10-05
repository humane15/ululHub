import { Card } from '../../components/ui'

/** Ditampilkan kalau VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diisi. */
export function SetupNeeded() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <Card className="max-w-md space-y-3 text-sm">
        <h1 className="text-lg font-semibold">Supabase belum diatur</h1>
        <p className="text-muted">
          Salin <code className="num">.env.example</code> menjadi <code className="num">.env.local</code>, isi{' '}
          <code className="num">VITE_SUPABASE_URL</code> dan <code className="num">VITE_SUPABASE_ANON_KEY</code>, lalu
          jalankan ulang <code className="num">npm run dev</code>.
        </p>
        <p className="text-muted">Di Vercel, isi keduanya di Settings → Environment Variables lalu deploy ulang.</p>
      </Card>
    </div>
  )
}
