// Student feedback gallery (/feedback) — clickable "covers", newest first.
// Each cover previews the session (date · title · 4 mini-ratings · focus tags)
// and opens the full dashboard at /feedback/:id. RLS narrows reads to own rows.
// 55TC tokens only: forest, sand, ink · Bebas Neue display · DM Sans body.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { getStudentByUserId, listFeedbacksForStudent } from '../lib/db'

// The four 0–10 ratings from the video analysis. Coach-written notes leave
// these null, so the mini-rating row is skipped entirely (graceful degradation).
const RATING_FIELDS = [
  ['Tech', 'rating_technique'],
  ['Int', 'rating_intensity'],
  ['Pos', 'rating_position'],
  ['Prog', 'rating_progress'],
]

export default function Feedbacks() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [feedbacks, setFeedbacks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return
    let active = true
    ;(async () => {
      try {
        // RLS: a student only ever resolves their own roster row + own feedback.
        const student = await getStudentByUserId(user.id)
        if (!active) return
        if (!student) {
          setFeedbacks([])
          return
        }
        const list = await listFeedbacksForStudent(student.id)
        if (active) setFeedbacks(list)
      } catch (e) {
        if (active) setError(e.message ?? 'Could not load your feedback.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [user])

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-ink/50">
            55TC · Your Portal
          </p>
          <h1 className="mt-2 font-display text-5xl tracking-[0.06em] text-forest">
            Feedback
          </h1>
          <p className="mt-3 text-ink/60">
            Notes from your coach and the clips to study. Less Theory. More Game.
          </p>
        </div>
        {feedbacks.length >= 2 && (
          <button
            type="button"
            onClick={() => navigate('/feedback/compare')}
            className="rounded border border-forest/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-forest transition hover:bg-forest hover:text-sand"
          >
            Compare sessions
          </button>
        )}
      </header>

      {loading && <p className="text-sm text-ink/50">Loading your feedback…</p>}

      {error && !loading && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {!loading && !error && feedbacks.length === 0 && (
        <div className="rounded-2xl border border-dashed border-forest/25 bg-white/40 px-6 py-14 text-center">
          <p className="font-display text-3xl tracking-[0.04em] text-forest">
            Nothing here yet
          </p>
          <p className="mt-2 text-sm text-ink/55">
            After your next lesson, your coach's notes land right here. Keep showing up.
          </p>
        </div>
      )}

      {!loading && !error && feedbacks.length > 0 && (
        <div className="space-y-5">
          {feedbacks.map((f) => (
            <FeedbackCover
              key={f.id}
              feedback={f}
              onOpen={() => navigate(`/feedback/${f.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// A single feedback "cover" in the gallery: a clickable preview that opens the
// full dashboard at /feedback/:id. No nested interactive elements (videos, links
// live on the detail page) so the whole card is one clean navigation target.
function FeedbackCover({ feedback, onOpen }) {
  const { title, body, lesson_date, duration_minutes, rally_avg, focus_areas } = feedback

  const ratings = RATING_FIELDS
    .map(([label, key]) => [label, feedback[key]])
    .filter(([, v]) => v != null)
  const focus = Array.isArray(focus_areas) ? focus_areas.filter(Boolean) : []
  const hasMeta = duration_minutes != null || rally_avg != null

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className="group cursor-pointer rounded-3xl border border-forest/12 bg-white/60 p-6 transition hover:border-forest/30 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 sm:p-7"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          {lesson_date && (
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-ink/45">
              {lesson_date}
            </p>
          )}
          <h2 className="mt-1 font-display text-3xl tracking-[0.04em] text-forest">
            {title || 'Lesson Note'}
          </h2>
        </div>
        <span className="mt-1 shrink-0 font-display text-xl text-forest/40 transition group-hover:translate-x-0.5 group-hover:text-forest">
          →
        </span>
      </div>

      {hasMeta && (
        <p className="mt-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink/45">
          {duration_minutes != null && `${duration_minutes} min`}
          {duration_minutes != null && rally_avg != null && ' · '}
          {rally_avg != null && `Rally avg ${rally_avg}`}
        </p>
      )}

      {ratings.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ratings.map(([label, value]) => (
            <MiniRating key={label} label={label} value={value} />
          ))}
        </div>
      )}

      {body && (
        <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-ink/70">{body}</p>
      )}

      {focus.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {focus.map((area) => (
            <span
              key={area}
              className="rounded-full border border-forest/25 px-3 py-1 text-xs text-forest"
            >
              {area}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}

// One 0–10 rating as a compact labelled bar for the gallery cover.
function MiniRating({ label, value }) {
  const pct = Math.max(0, Math.min(10, value)) * 10
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-ink/50">
          {label}
        </span>
        <span className="font-display text-base leading-none text-forest">{value}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-forest/10">
        <div className="h-full rounded-full bg-forest" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
