// "Last session feedback" card for the student Home page. Shows the most recent
// feedback's date + a 120-char excerpt of the note, with a link through to the
// full /feedback screen. Self-fetches: resolves the student's roster row, then
// the latest feedback. Graceful empty state in the 55TC voice when there's none.
// White card on sand · ink text · DM Sans body / Bebas Neue display.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { getStudentByUserId, getLastFeedback } from '../lib/db'

/** "Jun 12, 2026". Handles a date-only lesson_date ("2026-06-12", pinned to
 *  local midnight to avoid a TZ shift) AND the full-timestamp created_at fallback. */
function formatDate(value) {
  if (!value) return ''
  const d = new Date(value.includes('T') ? value : `${value}T00:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function excerpt(text, max = 120) {
  const clean = (text || '').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max).trimEnd()}...`
}

export default function LastFeedbackWidget() {
  const { user } = useAuth()
  const [feedback, setFeedback] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let active = true
    ;(async () => {
      try {
        const student = await getStudentByUserId(user.id)
        const last = student ? await getLastFeedback(student.id) : null
        if (active) setFeedback(last)
      } catch {
        if (active) setFeedback(null)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [user])

  if (loading) return null

  // Empty state — humanized, 55TC voice.
  if (!feedback) {
    return (
      <section className="rounded-lg border border-dashed border-forest/25 bg-white/40 p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/45">
          Last Session Feedback
        </p>
        <p className="mt-3 text-sm text-ink/55">
          No feedback yet. Your first session is coming.
        </p>
      </section>
    )
  }

  const date = formatDate(feedback.lesson_date || feedback.created_at)

  return (
    <section className="rounded-lg border border-forest/15 bg-white p-6">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/45">
          Last Session Feedback
        </p>
        {date && (
          <p className="text-[11px] uppercase tracking-[0.15em] text-ink/40">
            {date}
          </p>
        )}
      </div>

      {feedback.title && (
        <p className="mt-3 font-display text-2xl tracking-[0.04em] text-forest">
          {feedback.title}
        </p>
      )}

      <p className="mt-2 text-sm leading-relaxed text-ink/70">
        {excerpt(feedback.body)}
      </p>

      <Link
        to="/feedback"
        className="mt-4 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-forest hover:text-forest/70"
      >
        View →
      </Link>
    </section>
  )
}
