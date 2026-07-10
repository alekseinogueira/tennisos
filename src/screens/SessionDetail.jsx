// Feedback detail (/feedback/:id) — the full session dashboard, mobile-first.
// RLS narrows getFeedback to the student's own PUBLISHED rows (a foreign or
// draft id → not-found state). The dashboard itself lives in the shared
// SessionFeedbackView so the coach's review screen renders the identical thing.
// Named SessionDetail to avoid colliding with the coach-side admin/FeedbackDetail.
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import {
  getFeedback,
  getProfile,
  listLibraryForFeedback,
  listGalleryForFeedback,
} from '../lib/db'
import SessionFeedbackView from '../components/SessionFeedbackView'

export default function SessionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [feedback, setFeedback] = useState(null)
  const [studentName, setStudentName] = useState('')
  const [videos, setVideos] = useState({ library: [], gallery: [] })
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const fb = await getFeedback(id)
        if (!active) return
        setFeedback(fb)
        const [library, gallery] = await Promise.all([
          listLibraryForFeedback(id).catch(() => []),
          listGalleryForFeedback(id).catch(() => []),
        ])
        if (active) setVideos({ library, gallery })
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

  // Student name for the header — best-effort, never blocks the page.
  useEffect(() => {
    if (!user) return
    let active = true
    getProfile(user.id)
      .then((p) => active && setStudentName(p?.full_name ?? ''))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [user])

  if (loading) {
    return (
      <div className="py-20 text-center">
        <p className="font-display text-3xl tracking-[0.04em] text-forest">
          Loading session…
        </p>
        <p className="mt-2 text-sm text-ink/50">Less Theory. More Game.</p>
      </div>
    )
  }

  if (notFound || !feedback) {
    return (
      <div className="rounded-2xl border border-dashed border-forest/25 bg-white/40 px-6 py-16 text-center">
        <p className="font-display text-3xl tracking-[0.04em] text-forest">
          Session not found
        </p>
        <p className="mt-2 text-sm text-ink/55">
          This feedback isn't available. It may have moved.
        </p>
        <button
          onClick={() => navigate('/feedback')}
          className="mt-6 rounded bg-forest px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-sand transition hover:bg-forest/90"
        >
          ← Feedback
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => navigate('/feedback')}
        className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50 transition hover:text-forest"
      >
        ← Feedback
      </button>
      <SessionFeedbackView
        feedback={feedback}
        studentName={studentName}
        videos={videos}
        compareHref={`/feedback/compare?a=${feedback.id}`}
      />
    </div>
  )
}
