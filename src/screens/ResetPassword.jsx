// Consumes the recovery session from the emailed link (supabase-js parses the
// URL on load and fires PASSWORD_RECOVERY) and sets a new password.
import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth, isCoachRole } from '../auth/useAuth'

export default function ResetPassword() {
  const { session, role, loading, setPassword } = useAuth()
  const [password, setPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Wait for the link's session to settle before judging validity.
  if (loading) return null

  // No recovery session -> the link was missing, used, or expired.
  if (!session) {
    return (
      <Centered title="Link expired">
        <p className="mt-4 text-sm text-ink/70">
          This reset link is invalid or has expired.
        </p>
        <Link
          to="/forgot"
          className="mt-4 inline-block text-sm text-forest underline-offset-2 hover:underline"
        >
          Request a new link
        </Link>
      </Centered>
    )
  }

  if (done) {
    return <Navigate to={isCoachRole(role) ? '/coach' : '/'} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    const { error } = await setPassword(password)
    setSubmitting(false)
    if (error) setError(error.message)
    else setDone(true)
  }

  return (
    <Centered title="Set a new password">
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <PasswordField label="New password" value={password} onChange={setPwd} />
        <PasswordField label="Confirm password" value={confirm} onChange={setConfirm} />

        {error && <p className="text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-forest py-2.5 font-medium text-sand transition hover:bg-forest/90 disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Save password'}
        </button>
      </form>
    </Centered>
  )
}

function Centered({ title, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-sand px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white/70 p-8 shadow-sm">
        <h1 className="font-display text-3xl tracking-wide text-forest">{title}</h1>
        {children}
      </div>
    </div>
  )
}

function PasswordField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink/70">{label}</span>
      <input
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-forest/15 bg-white px-3 py-2 outline-none focus:border-forest"
      />
    </label>
  )
}
