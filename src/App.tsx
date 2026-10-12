import { lazy } from 'react'
import { Route, Routes } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { LoadingScreen } from './components/ui'
import { UpdatePrompt } from './components/UpdatePrompt'
import { isSupabaseConfigured } from './db/supabase'
import { useAuth } from './features/auth/auth'
import { AuthProvider } from './features/auth/AuthProvider'
import { LoginPage } from './features/auth/LoginPage'
import { SetupNeeded } from './features/auth/SetupNeeded'

// Setiap halaman dimuat terpisah supaya pembukaan pertama di HP lebih ringan.
const AnggaranPage = lazy(() => import('./pages/AnggaranPage'))
const AturSiklusPage = lazy(() => import('./pages/AturSiklusPage'))
const BelajarPage = lazy(() => import('./pages/BelajarPage'))
const BerandaPage = lazy(() => import('./pages/BerandaPage'))
const CariTransaksiPage = lazy(() => import('./pages/CariTransaksiPage'))
const CatatanPage = lazy(() => import('./pages/CatatanPage'))
const KeuanganPage = lazy(() => import('./pages/KeuanganPage'))
const LaporanPage = lazy(() => import('./pages/LaporanPage'))
const LaporanTahunanPage = lazy(() => import('./pages/LaporanTahunanPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const PengaturanPage = lazy(() => import('./pages/PengaturanPage'))
const PengingatPage = lazy(() => import('./pages/PengingatPage'))
const RiwayatSiklusPage = lazy(() => import('./pages/RiwayatSiklusPage'))
const SiklusBaruPage = lazy(() => import('./pages/SiklusBaruPage'))

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
        <Route path="keuangan/cari" element={<CariTransaksiPage />} />
        <Route path="belajar" element={<BelajarPage />} />
        <Route path="belajar/siklus-baru" element={<SiklusBaruPage />} />
        <Route path="belajar/atur" element={<AturSiklusPage />} />
        <Route path="belajar/catatan" element={<CatatanPage />} />
        <Route path="belajar/riwayat" element={<RiwayatSiklusPage />} />
        <Route path="belajar/riwayat/:id" element={<RiwayatSiklusPage />} />
        <Route path="laporan" element={<LaporanPage />} />
        <Route path="laporan/tahunan" element={<LaporanTahunanPage />} />
        <Route path="pengingat" element={<PengingatPage />} />
        <Route path="pengaturan" element={<PengaturanPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <>
      {isSupabaseConfigured ? (
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      ) : (
        <SetupNeeded />
      )}
      <UpdatePrompt />
    </>
  )
}
