import { Route, Routes } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { LoadingScreen } from './components/ui'
import { isSupabaseConfigured } from './db/supabase'
import { useAuth } from './features/auth/auth'
import { AuthProvider } from './features/auth/AuthProvider'
import { LoginPage } from './features/auth/LoginPage'
import { SetupNeeded } from './features/auth/SetupNeeded'
import BelajarPage from './pages/BelajarPage'
import BerandaPage from './pages/BerandaPage'
import KeuanganPage from './pages/KeuanganPage'
import LaporanPage from './pages/LaporanPage'
import NotFoundPage from './pages/NotFoundPage'
import PengaturanPage from './pages/PengaturanPage'

function AuthGate() {
  const { session } = useAuth()
  if (session === undefined) return <LoadingScreen />
  if (session === null) return <LoginPage />
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<BerandaPage />} />
        <Route path="keuangan" element={<KeuanganPage />} />
        <Route path="belajar" element={<BelajarPage />} />
        <Route path="laporan" element={<LaporanPage />} />
        <Route path="pengaturan" element={<PengaturanPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  if (!isSupabaseConfigured) return <SetupNeeded />
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}
