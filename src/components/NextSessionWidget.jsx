// "Next session" card for the student Home page. Self-fetches: resolves the
// student's roster row, then the next upcoming scheduled session. When one
// exists it shows the date, time, and location; otherwise it keeps the original
// "Coming soon" placeholder. White card on sand · Bebas Neue display · DM Sans.
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { getStudentByUserId, getNextSession } from '../lib/db'

/** A scheduled_at timestamptz → { date: "Tuesday, June 24", time: "10:00 AM" }
 *  in the viewer's local zone. */
function formatWhen(ts) {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return { date: '', time: '' }
  return {
    date: d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  }
}

export default function NextSessionWidget() {
  const { user } = useAuth()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let active = true
    ;(async () => {
      try {
        const student = await getStudentByUserId(user.id)
        const next = student ? await getNextSession(student.id) : null
        if (active) setSession(next)
      } catch {
        if (active) setSession(null)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [user])

  // Loading or no upcoming session → keep the "Coming soon" placeholder.
  if (loading || !session) {
    return (
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
    )
  }

  const when = formatWhen(session.scheduled_at)

  return (
    <section className="rounded-3xl border border-forest/15 bg-white p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">
        Next Session
      </p>
      <p className="mt-3 font-display text-4xl tracking-[0.04em] text-forest">
        {when.date}
      </p>
      <p className="mt-2 text-sm text-ink/70">
        {when.time}
        {session.location ? ` · ${session.location}` : ''}
      </p>
    </section>
  )
}
