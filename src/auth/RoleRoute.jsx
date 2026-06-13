// Gate for role-restricted pages (e.g. coach-only). Assumes it's nested inside
// ProtectedRoute, so a session already exists; here we only check the role.
// Wrong role -> bounce to the student home.
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'
import Loading from '../components/Loading'

export default function RoleRoute({ allow = [] }) {
  const { role, loading } = useAuth()

  if (loading) return <Loading />
  if (!allow.includes(role)) return <Navigate to="/" replace />
  return <Outlet />
}
