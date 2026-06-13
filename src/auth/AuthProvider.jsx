// Auth context: holds the Supabase session, the user's profile/role, and a
// loading flag, and exposes the small set of auth actions the auth screens use.
// Subscribes to onAuthStateChange (login, logout, password-recovery, invite).
//
// The profile fetch is deferred out of the onAuthStateChange callback with a
// setTimeout(0): calling supabase inside that callback can deadlock the auth
// lock in supabase-js v2. A ref tracks the last-loaded user id so routine token
// refreshes don't trigger a redundant profile fetch.
import { createContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getProfile } from '../lib/db'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const loadedUserIdRef = useRef(null)

  useEffect(() => {
    let active = true

    async function loadProfile(userId) {
      setProfileLoading(true)
      try {
        const p = await getProfile(userId)
        if (active) setProfile(p)
      } catch {
        if (active) setProfile(null)
      } finally {
        if (active) setProfileLoading(false)
      }
    }

    // INITIAL_SESSION fires once on subscribe in v2, so this also resolves the
    // initial state — no separate getSession() call needed.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setAuthReady(true)

      const userId = newSession?.user?.id ?? null
      if (userId === loadedUserIdRef.current) return // same user — skip refetch
      loadedUserIdRef.current = userId

      if (userId) {
        setTimeout(() => active && loadProfile(userId), 0)
      } else {
        setProfile(null)
      }
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    loading: !authReady || profileLoading,

    // Auth actions — only the auth screens call these.
    signIn: (email, password) =>
      supabase.auth.signInWithPassword({ email, password }),
    signOut: () => supabase.auth.signOut(),
    sendPasswordReset: (email) =>
      supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset`,
      }),
    // Used by both the reset and invite-claim screens (a recovery/invite
    // session is already active from the emailed link).
    setPassword: (password) => supabase.auth.updateUser({ password }),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
