import { Route, Routes } from 'react-router'
import { AppLayout } from './components/AppLayout'
import BelajarPage from './pages/BelajarPage'
import BerandaPage from './pages/BerandaPage'
import KeuanganPage from './pages/KeuanganPage'
import LaporanPage from './pages/LaporanPage'
import NotFoundPage from './pages/NotFoundPage'
import PengaturanPage from './pages/PengaturanPage'

export default function App() {
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
