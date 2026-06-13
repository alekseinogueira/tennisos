// Request a password-reset email. Sends a link that lands on /reset.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export default function ForgotPassword() {
  const { sendPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await sendPasswordReset(email.trim())
    setSubmitting(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white/70 p-8 shadow-sm">
        <h1 className="font-display text-3xl tracking-wide text-forest">Reset password</h1>

        {sent ? (
          <p className="mt-4 text-sm text-ink/70">
            If an account exists for <strong>{email}</strong>, a reset link is on its way.
            Check your inbox.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-ink/70">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-forest/15 bg-white px-3 py-2 outline-none focus:border-forest"
              />
            </label>

            {error && <p className="text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-forest py-2.5 font-medium text-sand transition hover:bg-forest/90 disabled:opacity-60"
            >
              {submitting ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <div className="mt-4 text-center">
          <Link to="/login" className="text-sm text-forest underline-offset-2 hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
