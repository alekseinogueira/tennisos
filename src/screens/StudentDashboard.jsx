// Student home (/) — the player's welcome screen. A forest hero with the court
// motif (name + tagline), the live lesson-credit balance, and a placeholder for
// the next session. Reads the student's own roster row (RLS narrows to it) and
// sums their credit ledger via lib/db.js. 55TC tokens only: forest, sand, ink ·
// Bebas Neue display · DM Sans body.
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { getStudentByUserId, getCreditBalance } from '../lib/db'
import CourtMotif from '../components/CourtMotif'

export default function StudentDashboard() {
  const { user, profile } = useAuth()
  const [balance, setBalance] = useState(null)
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return
    let active = true
    ;(async () => {
      try {
        // RLS gives the student only their own roster row.
        const student = await getStudentByUserId(user.id)
        if (!active) return
        if (student?.full_name) setFullName(student.full_name)
        // No roster row yet (e.g. a freshly claimed invite) → balance stays 0.
        if (student) {
          const b = await getCreditBalance(student.id)
          if (active) setBalance(b)
        } else {
          setBalance(0)
        }
      } catch (e) {
        if (active) setError(e.message ?? 'Could not load your portal.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [user])

  const firstName = (fullName || '').trim().split(/\s+/)[0] || 'Player'

  return (
    <div className="space-y-6">
      {/* ── Welcome hero ── */}
      <section className="relative overflow-hidden rounded-3xl bg-forest px-8 py-12 text-sand sm:px-10 sm:py-14">
        <CourtMotif className="pointer-events-none absolute -right-12 -bottom-20 h-[150%] w-auto text-sand/[0.06]" />
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-sand/70">
            55TC · Your Portal
          </p>
          <h1 className="mt-3 font-display text-6xl leading-[0.9] tracking-[0.06em] sm:text-7xl">
            Welcome, {firstName}
          </h1>
          <p className="mt-5 text-sm font-medium uppercase tracking-[0.3em] text-sand/70">
            Less Theory. More Game.
          </p>
        </div>
      </section>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {/* ── Lesson-credit balance ── */}
        <section className="rounded-3xl border border-forest/12 bg-white/60 p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">
            Lesson Credits
          </p>
          {loading ? (
            <p className="mt-3 font-display text-7xl tracking-wide text-forest/30 tabular-nums">
              —
            </p>
          ) : (
            <p className="mt-3 font-display text-7xl tracking-wide text-forest tabular-nums">
              {balance ?? 0}
            </p>
          )}
          <p className="mt-2 text-sm text-ink/55">
            {balance === 1 ? 'credit in your account.' : 'credits in your account.'}
          </p>
        </section>

        {/* ── Next session — coming soon ── */}
        <section className="rounded-3xl border border-dashed border-forest/25 bg-white/40 p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">
            Next Session
          </p>
          <p className="mt-3 font-display text-4xl tracking-[0.04em] text-forest">
            Coming soon
          </p>
          <p className="mt-2 text-sm text-ink/55">
            Your upcoming lessons will land here. Hang tight.
          </p>
        </section>
      </div>
    </div>
  )
}
