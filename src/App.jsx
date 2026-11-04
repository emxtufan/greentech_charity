import AppRoutes from './routes/AppRoutes'
import AdminBar from './components/admin/AdminBar'
import CmsOverlay from './components/admin/CmsOverlay'

export default function App() {
  return (
    <>
      <AppRoutes />
      <CmsOverlay />
      <AdminBar />
    </>
  )
}
