// Gate for any authenticated page. No session -> redirect to /login
// (remembering where they were headed). Waits for auth to resolve first so
// there's no flash-redirect on refresh.
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import Loading from '../components/Loading'

export default function ProtectedRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Loading />
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}
