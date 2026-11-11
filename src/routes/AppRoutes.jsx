import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import useAuth from '../hooks/useAuth'
import DynamicPage from '../pages/DynamicPage'
import AdminDashboard from '../pages/AdminDashboard'
import GreencubeFrame from '../pages/GreencubeFrame'
import Login from '../pages/Login'
import Register from '../pages/Register'
import Dashboard from '../pages/Dashboard'

export default function AppRoutes() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route element={<GreencubeFrame />}>
        <Route index element={<DynamicPage />} />
        <Route path="greencube/*" element={<Navigate to="/" replace />} />
        <Route path="website" element={<DynamicPage />} />
        <Route
          path="login"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        <Route
          path="register"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />}
        />
        <Route path="*" element={<DynamicPage />} />
      </Route>

      <Route path="/admin" element={<AdminDashboard />} />

      <Route
        path="dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
