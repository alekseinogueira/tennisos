// Student home (/) — the player's welcome screen. A forest hero with the court
// motif (name + tagline) and a placeholder for the next session. Reads the
// student's own roster row (RLS narrows to it) for the name. The lesson-credit
// balance is intentionally not surfaced to the student here (the ledger + admin
// credits hub are untouched). 55TC tokens only: forest, sand, ink ·
// Bebas Neue display · DM Sans body.
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { getStudentByUserId } from '../lib/db'
import CourtMotif from '../components/CourtMotif'

export default function StudentDashboard() {
  const { user, profile } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
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
      } catch (e) {
        if (active) setError(e.message ?? 'Could not load your portal.')
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
  )
}
