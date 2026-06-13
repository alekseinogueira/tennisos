// Premium /login — a forest-green brand hero beside a refined sand form.
// Email + password; on success the session updates and the role-aware redirect
// fires. 55TC tokens only: forest, sand, ink · Bebas Neue display · DM Sans body.
import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth, isCoachRole } from '../auth/useAuth'

export default function Login() {
  const { session, role, loading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Already signed in (and role resolved)? Send them to their home.
  if (session && !loading) {
    return <Navigate to={isCoachRole(role) ? '/coach' : '/'} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await signIn(email.trim(), password)
    setSubmitting(false)
    if (error) setError(error.message)
    // Success: AuthProvider updates the session -> the <Navigate> above redirects.
  }

  return (
    <div className="min-h-screen bg-sand lg:grid lg:grid-cols-2">
      {/* ── Brand hero (desktop) ── */}
      <aside className="relative hidden overflow-hidden bg-forest px-12 py-14 text-sand lg:flex lg:flex-col lg:justify-between">
        <CourtMotif className="pointer-events-none absolute -right-16 -bottom-20 h-[150%] w-auto text-sand/[0.06]" />

        <span className="relative text-xs font-medium uppercase tracking-[0.35em] text-sand/70">
          55 · Tennis · Crew
        </span>

        <div className="relative">
          <h1 className="font-display text-8xl leading-[0.85] tracking-wide">
            TennisOS
          </h1>
          <p className="mt-3 text-sm font-medium uppercase tracking-[0.3em] text-sand/70">
            Student Portal
          </p>
          <p className="mt-6 max-w-sm text-sand/80">
            Every lesson, every clip, every rep — tracked. Sign in to pick up
            right where your training left off.
          </p>
        </div>

        <span className="relative text-xs uppercase tracking-[0.25em] text-sand/50">
          © 55 Tennis Crew
        </span>
      </aside>

      {/* ── Form ── */}
      <main className="flex min-h-screen items-center justify-center px-6 py-12 lg:min-h-0">
        <div className="w-full max-w-sm">
          {/* Compact brand mark — mobile only */}
          <div className="mb-10 lg:hidden">
            <h1 className="font-display text-6xl leading-none tracking-wide text-forest">
              TennisOS
            </h1>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.3em] text-ink/50">
              55TC · Student Portal
            </p>
          </div>

          <header className="mb-8">
            <h2 className="font-display text-4xl tracking-wide text-forest">
              Welcome back
            </h2>
            <p className="mt-1 text-sm text-ink/60">Sign in to your 55TC portal.</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Field
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
            />
            <Field
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
            />

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-forest py-3 text-sm font-semibold uppercase tracking-[0.15em] text-sand transition hover:bg-forest/90 disabled:opacity-60"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/forgot"
              className="text-sm text-ink/60 underline-offset-4 transition hover:text-forest hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

function Field({ label, type, autoComplete, value, onChange }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink/50">
        {label}
      </span>
      <input
        type={type}
        required
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-forest/15 bg-white/60 px-4 py-3 text-ink outline-none transition placeholder:text-ink/30 focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/10"
      />
    </label>
  )
}

// Minimal tennis-court line motif — a subtle brand texture for the hero panel.
function CourtMotif({ className }) {
  return (
    <svg
      viewBox="0 0 200 320"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden="true"
    >
      {/* outer court */}
      <rect x="10" y="10" width="180" height="300" />
      {/* singles sidelines */}
      <line x1="34" y1="10" x2="34" y2="310" />
      <line x1="166" y1="10" x2="166" y2="310" />
      {/* net */}
      <line x1="10" y1="160" x2="190" y2="160" />
      {/* service lines */}
      <line x1="34" y1="90" x2="166" y2="90" />
      <line x1="34" y1="230" x2="166" y2="230" />
      {/* center service line */}
      <line x1="100" y1="90" x2="100" y2="230" />
    </svg>
  )
}
