// Student feedback section (/feedback) — every note the coach has left this
// player, newest first, with any attached videos playable inline. RLS narrows
// all reads to the student's own rows. Two video sources show per note: the
// crew's curated library + the player's own gallery clips. YouTube links embed
// inline; anything else (Drive, etc.) gets a clean "Watch" link.
// Tone: warm and motivating — not a clinical report.
// 55TC tokens only: forest, sand, ink · Bebas Neue display · DM Sans body.
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import {
  getStudentByUserId,
  listFeedbacksForStudent,
  listLibraryForFeedback,
  listGalleryForFeedback,
} from '../lib/db'

/** Pull a YouTube video id from the common URL shapes; null if it isn't one. */
function youtubeId(url) {
  if (!url) return null
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') return u.pathname.slice(1) || null
    if (host.endsWith('youtube.com')) {
      if (u.pathname === '/watch') return u.searchParams.get('v')
      const m = u.pathname.match(/^\/(embed|shorts)\/([^/?]+)/)
      if (m) return m[2]
    }
  } catch {
    return null
  }
  return null
}

export default function Feedbacks() {
  const { user } = useAuth()
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
        const withVideos = await Promise.all(
          list.map(async (f) => {
            const [library, gallery] = await Promise.all([
              listLibraryForFeedback(f.id),
              listGalleryForFeedback(f.id),
            ])
            return { ...f, library, gallery }
          }),
        )
        if (active) setFeedbacks(withVideos)
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
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-ink/50">
          55TC · Your Portal
        </p>
        <h1 className="mt-2 font-display text-5xl tracking-[0.06em] text-forest">
          Feedback
        </h1>
        <p className="mt-3 text-ink/60">
          Notes from your coach and the clips to study. Less Theory. More Game.
        </p>
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
        <div className="space-y-6">
          {feedbacks.map((f) => (
            <FeedbackCard key={f.id} feedback={f} />
          ))}
        </div>
      )}
    </div>
  )
}

function FeedbackCard({ feedback }) {
  const { library = [], gallery = [], title, body, lesson_date } = feedback

  return (
    <article className="rounded-3xl border border-forest/12 bg-white/60 p-7 sm:p-8">
      {lesson_date && (
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-ink/45">
          {lesson_date}
        </p>
      )}
      <h2 className="mt-1 font-display text-3xl tracking-[0.04em] text-forest">
        {title || 'Lesson Note'}
      </h2>

      <p className="mt-4 whitespace-pre-wrap leading-relaxed text-ink/80">{body}</p>

      {gallery.length > 0 && (
        <VideoGroup label="Your clips" videos={gallery} />
      )}
      {library.length > 0 && (
        <VideoGroup label="From the crew library" videos={library} />
      )}
    </article>
  )
}

function VideoGroup({ label, videos }) {
  return (
    <div className="mt-6">
      <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink/45">
        {label}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {videos.map((v) => (
          <VideoTile key={v.id} video={v} />
        ))}
      </div>
    </div>
  )
}

function VideoTile({ video }) {
  const id = youtubeId(video.external_url)
  const title = video.title || 'Watch'

  if (id) {
    return (
      <div>
        <div className="aspect-video overflow-hidden rounded-xl border border-forest/12 bg-ink/5">
          <iframe
            src={`https://www.youtube.com/embed/${id}`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
        <p className="mt-2 text-sm font-medium text-ink/75">{title}</p>
      </div>
    )
  }

  // Non-YouTube (Drive, etc.) — can't reliably embed; offer a clean link.
  return (
    <a
      href={video.external_url}
      target="_blank"
      rel="noreferrer"
      className="group flex aspect-video flex-col items-center justify-center rounded-xl border border-forest/15 bg-white/60 p-4 text-center transition hover:border-forest/30 hover:bg-white"
    >
      <span className="font-display text-2xl tracking-[0.04em] text-forest">
        Watch ↗
      </span>
      <span className="mt-1 line-clamp-2 text-sm text-ink/60">{title}</span>
    </a>
  )
}
