// Admin → write a feedback entry for a specific student
// (/admin/students/:id/feedback/new). Fields: title, body (the note), lesson_date.
// Saves via createFeedback, stamping the student subject (user_id) + author
// (coach_id). On success it jumps to the attach screen so the coach can link
// gallery clips + curated-library references to the new entry.
//
// Guard: feedbacks.user_id is NOT NULL, but an invited-but-unclaimed student has
// user_id = NULL. So if the student hasn't claimed their invite, we block with a
// friendly message instead of letting the insert fail.
// 55TC styling: Bebas headings, uppercase tracked labels, forest/sand/ink.
import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { getStudent, createFeedback } from '../../lib/db'

const EMPTY = { title: '', body: '', lesson_date: '' }

export default function FeedbackComposer() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [student, setStudent] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const s = await getStudent(id)
        if (active) setStudent(s)
      } catch (e) {
        if (active) setError(e.message ?? 'Could not load this student.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [id])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const row = await createFeedback({
        student_id: student.id,
        user_id: student.user_id, // student subject — guaranteed non-null below
        coach_id: user?.id ?? null,
        title: form.title.trim() || null,
        body: form.body.trim(),
        lesson_date: form.lesson_date || null,
      })
      // Created → go attach gallery clips + library references.
      navigate(`/admin/students/${student.id}/feedback/${row.id}`)
    } catch (e) {
      setError(e.message ?? 'Could not save. Try again.')
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-ink/50">Loading…</p>
  }

  if (error && !student) {
    return (
      <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
    )
  }

  // Unclaimed invite → no auth id to attach the feedback to. Block gracefully.
  if (student && !student.user_id) {
    return (
      <div className="max-w-xl">
        <Header student={student} />
        <div className="rounded-2xl border border-dashed border-forest/25 bg-white/40 px-6 py-12 text-center">
          <p className="font-display text-3xl tracking-[0.04em] text-forest">
            Hasn't joined yet
          </p>
          <p className="mt-2 text-sm text-ink/55">
            {student.full_name} needs to claim their invite before you can leave
            feedback — it lands in their portal once they're in.
          </p>
          <Link
            to={`/admin/students/${student.id}/edit`}
            className="mt-6 inline-block rounded-xl bg-forest px-5 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-sand transition hover:bg-forest/90"
          >
            Send the invite
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl">
      <Header student={student} />

      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink/50">
            Title
          </span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. Forehand follow-through"
            className="mt-2 w-full rounded-xl border border-forest/15 bg-white/60 px-4 py-3 text-ink outline-none transition placeholder:text-ink/30 focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/10"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink/50">
            Feedback
          </span>
          <textarea
            value={form.body}
            onChange={(e) => set('body', e.target.value)}
            required
            rows={7}
            placeholder="What you saw, what to work on, what's next."
            className="mt-2 w-full resize-y rounded-xl border border-forest/15 bg-white/60 px-4 py-3 text-ink outline-none transition placeholder:text-ink/30 focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/10"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink/50">
            Lesson date
          </span>
          <input
            type="date"
            value={form.lesson_date}
            onChange={(e) => set('lesson_date', e.target.value)}
            className="mt-2 w-full rounded-xl border border-forest/15 bg-white/60 px-4 py-3 text-ink outline-none transition focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/10"
          />
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-forest px-6 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-sand transition hover:bg-forest/90 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save & attach videos'}
          </button>
          <Link
            to="/admin/students"
            className="text-sm text-ink/60 underline-offset-4 transition hover:text-forest hover:underline"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

function Header({ student }) {
  return (
    <header className="mb-8">
      <p className="text-xs font-medium uppercase tracking-[0.25em] text-ink/50">
        55TC · Feedback
      </p>
      <h1 className="mt-2 font-display text-5xl tracking-[0.06em] text-forest">
        New Feedback
      </h1>
      <p className="mt-3 text-ink/60">
        For <span className="font-medium text-ink">{student?.full_name}</span>. Keep it
        direct — they'll read it in their portal.
      </p>
    </header>
  )
}
