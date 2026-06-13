// Hook -> { session, user, profile, role, loading, signIn, signOut,
//          sendPasswordReset, setPassword }
import { useContext } from 'react'
import { AuthContext } from './AuthProvider'

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}

/** coach + admin share elevated access (admin = coach superset). */
export function isCoachRole(role) {
  return role === 'coach' || role === 'admin'
}
