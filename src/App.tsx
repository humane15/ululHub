import { Route, Routes } from 'react-router'
import AnggaranPage from './pages/AnggaranPage'
import { AppLayout } from './components/AppLayout'
import { LoadingScreen } from './components/ui'
import { isSupabaseConfigured } from './db/supabase'
import { useAuth } from './features/auth/auth'
import { AuthProvider } from './features/auth/AuthProvider'
import { LoginPage } from './features/auth/LoginPage'
import { SetupNeeded } from './features/auth/SetupNeeded'
import AturSiklusPage from './pages/AturSiklusPage'
import BelajarPage from './pages/BelajarPage'
import CatatanPage from './pages/CatatanPage'
import BerandaPage from './pages/BerandaPage'
import KeuanganPage from './pages/KeuanganPage'
import LaporanPage from './pages/LaporanPage'
import NotFoundPage from './pages/NotFoundPage'
import PengaturanPage from './pages/PengaturanPage'
import SiklusBaruPage from './pages/SiklusBaruPage'

function AuthGate() {
  const { session } = useAuth()
  if (session === undefined) return <LoadingScreen />
  if (session === null) return <LoginPage />
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<BerandaPage />} />
        <Route path="keuangan" element={<KeuanganPage />} />
        <Route path="keuangan/anggaran" element={<AnggaranPage />} />
        <Route path="belajar" element={<BelajarPage />} />
        <Route path="belajar/siklus-baru" element={<SiklusBaruPage />} />
        <Route path="belajar/atur" element={<AturSiklusPage />} />
        <Route path="belajar/catatan" element={<CatatanPage />} />
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
