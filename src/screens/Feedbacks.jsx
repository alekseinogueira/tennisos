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

// The four 0–10 ratings produced by the video analysis. Coach-written notes leave
// these null, so the block is skipped entirely (graceful degradation).
const RATING_FIELDS = [
  ['Technique', 'rating_technique'],
  ['Intensity', 'rating_intensity'],
  ['Position', 'rating_position'],
  ['Progress', 'rating_progress'],
]

// The qualitative selects from the analysis (stored as their human label).
const QUAL_FIELDS = [
  ['Quality', 'quality'],
  ['Effort', 'effort'],
  ['In-game', 'game_application'],
  ['Progress', 'progress_level'],
]

function FeedbackCard({ feedback }) {
  const {
    library = [],
    gallery = [],
    title,
    body,
    lesson_date,
    duration_minutes,
    rally_avg,
    focus_areas,
    focus_next,
    next_session_goals,
    card_visual_url,
  } = feedback

  const ratings = RATING_FIELDS
    .map(([label, key]) => [label, feedback[key]])
    .filter(([, v]) => v != null)
  const quals = QUAL_FIELDS
    .map(([label, key]) => [label, feedback[key]])
    .filter(([, v]) => v)
  const focus = Array.isArray(focus_areas) ? focus_areas.filter(Boolean) : []
  const goals = Array.isArray(next_session_goals) ? next_session_goals : []
  const hasMeta = duration_minutes != null || rally_avg != null

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

      {hasMeta && (
        <p className="mt-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink/45">
          {duration_minutes != null && `${duration_minutes} min`}
          {duration_minutes != null && rally_avg != null && ' · '}
          {rally_avg != null && `Rally avg ${rally_avg}`}
        </p>
      )}

      {ratings.length > 0 && (
        <Section label="The numbers">
          <div className="space-y-2.5">
            {ratings.map(([label, value]) => (
              <RatingBar key={label} label={label} value={value} />
            ))}
          </div>
        </Section>
      )}

      {quals.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {quals.map(([label, value]) => (
            <span
              key={label}
              className="rounded-md bg-forest/8 px-3 py-1.5 text-xs text-ink/75"
            >
              <span className="font-semibold uppercase tracking-[0.15em] text-ink/45">
                {label}{' '}
              </span>
              {value}
            </span>
          ))}
        </div>
      )}

      {body && (
        <p className="mt-5 whitespace-pre-wrap leading-relaxed text-ink/80">{body}</p>
      )}

      {focus.length > 0 && (
        <Section label="What we worked on">
          <div className="flex flex-wrap gap-2">
            {focus.map((area) => (
              <span
                key={area}
                className="rounded-full border border-forest/25 px-3 py-1 text-xs text-forest"
              >
                {area}
              </span>
            ))}
          </div>
        </Section>
      )}

      {(focus_next || goals.length > 0) && (
        <Section label="Next session">
          {focus_next && (
            <p className="mb-3 leading-relaxed text-ink/80">{focus_next}</p>
          )}
          {goals.length > 0 && (
            <ol className="space-y-3">
              {goals.map((g, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-display text-xl leading-none text-forest/40">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-ink/85">{g.titulo}</p>
                    {g.descricao && (
                      <p className="text-sm text-ink/60">{g.descricao}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Section>
      )}

      {card_visual_url && (
        <a
          href={card_visual_url}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-block rounded bg-forest px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-sand transition hover:bg-forest/90"
        >
          View shareable card ↗
        </a>
      )}

      {gallery.length > 0 && (
        <VideoGroup label="Your clips" videos={gallery} />
      )}
      {library.length > 0 && (
        <VideoGroup label="From the crew library" videos={library} />
      )}
    </article>
  )
}

/** Labeled section divider used inside a feedback card. */
function Section({ label, children }) {
  return (
    <div className="mt-6">
      <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink/45">
        {label}
      </p>
      {children}
    </div>
  )
}

/** A single 0–10 rating as a forest progress bar with the value in Bebas Neue. */
function RatingBar({ label, value }) {
  const pct = Math.max(0, Math.min(10, value)) * 10
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-ink/55">
        {label}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-forest/10">
        <div className="h-full rounded-full bg-forest" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right font-display text-lg leading-none text-forest">
        {value}
      </span>
    </div>
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
