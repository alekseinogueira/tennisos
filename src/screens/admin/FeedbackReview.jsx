// Coach review of a feedback (/admin/feedback/:id/review) — Fase F1, Etapa 3.
// The coach sees the EXACT preview the student will get (shared
// SessionFeedbackView), edits the coach's analysis (body) inline with a live
// preview, and publishes — flipping status='published' so the student's RLS can
// see the row. No email on publish in v1 (the send-feedback-email function only
// accepts the service-role key; Fase F2 wires notification up).
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getFeedback,
  getStudent,
  listLibraryForFeedback,
  listGalleryForFeedback,
  publishFeedback,
} from '../../lib/db'
import SessionFeedbackView from '../../components/SessionFeedbackView'

export default function FeedbackReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [feedback, setFeedback] = useState(null)
  const [studentName, setStudentName] = useState('')
  const [videos, setVideos] = useState({ library: [], gallery: [] })
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const fb = await getFeedback(id)
        if (!active) return
        setFeedback(fb)
        setBody(fb.body ?? '')
        const [student, library, gallery] = await Promise.all([
          getStudent(fb.student_id).catch(() => null),
          listLibraryForFeedback(id).catch(() => []),
          listGalleryForFeedback(id).catch(() => []),
        ])
        if (!active) return
        setStudentName(student?.full_name ?? '')
        setVideos({ library, gallery })
      } catch {
        if (active) setNotFound(true)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [id])

  const isDraft = feedback?.status === 'draft'

  async function handlePublish() {
    setPublishing(true)
    setError(null)
    try {
      await publishFeedback(id, { body: body.trim() })
      navigate('/coach')
    } catch (e) {
      setError(e?.message ?? 'Could not publish. Try again.')
      setPublishing(false)
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center">
        <p className="font-display text-3xl tracking-[0.04em] text-forest">
          Loading feedback…
        </p>
        <p className="mt-2 text-sm text-ink/50">Less Theory. More Game.</p>
      </div>
    )
  }

  if (notFound || !feedback) {
    return (
      <div className="rounded-2xl border border-dashed border-forest/25 bg-white/40 px-6 py-16 text-center">
        <p className="font-display text-3xl tracking-[0.04em] text-forest">
          Feedback not found
        </p>
        <p className="mt-2 text-sm text-ink/55">
          This feedback isn't available. It may have moved.
        </p>
        <button
          onClick={() => navigate('/coach')}
          className="mt-6 rounded bg-forest px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-sand transition hover:bg-forest/90"
        >
          ← HQ
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => navigate('/coach')}
        className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50 transition hover:text-forest"
      >
        ← HQ
      </button>

      <header className="mt-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-ink/45">
          55TC · Review
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-5xl leading-[0.95] tracking-[0.04em] text-forest">
            Review Feedback
          </h1>
          <span
            className={`rounded px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.2em] ${
              isDraft
                ? 'border border-forest/30 text-forest'
                : 'bg-forest text-sand'
            }`}
          >
            {isDraft ? 'Draft' : 'Published'}
          </span>
        </div>
        <p className="mt-2 text-sm text-ink/60">
          {[studentName, feedback.lesson_date].filter(Boolean).join(' · ')}
        </p>
      </header>

      {/* ── Inline edit — coach's analysis (body) ──────────────────────── */}
      <section className="mt-6 rounded-3xl border border-forest/12 bg-white/60 p-6 sm:p-7">
        <label className="block">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink/45">
            Coach's analysis — edit before publishing
          </span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={7}
            placeholder="What you saw, what to work on, what's next."
            className="mt-3 w-full resize-y rounded-xl border border-forest/15 bg-white/60 px-4 py-3 text-ink outline-none transition placeholder:text-ink/30 focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/10"
          />
        </label>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={handlePublish}
            disabled={publishing || !body.trim()}
            className="rounded bg-forest px-6 py-3 text-sm font-semibold uppercase tracking-[0.1em] text-sand transition hover:bg-forest/90 disabled:opacity-60"
          >
            {publishing ? 'Publishing…' : isDraft ? 'Publish' : 'Save changes'}
          </button>
          <p className="text-xs text-ink/50">
            {isDraft
              ? 'Publishing makes it visible to the student.'
              : 'Already live — saving updates what the student sees.'}
          </p>
        </div>
      </section>

      {/* ── Live preview — exactly what the student will see ───────────── */}
      <p className="mt-10 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-ink/45">
        Preview — what the student will see
      </p>
      <div className="mt-2 rounded-3xl border border-dashed border-forest/25 p-4 sm:p-6">
        <SessionFeedbackView
          feedback={{ ...feedback, body }}
          studentName={studentName}
          videos={videos}
          compareHref={null}
        />
      </div>
    </div>
  )
}
