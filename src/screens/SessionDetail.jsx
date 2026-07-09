// Feedback detail (/feedback/:id) — the full session dashboard, mobile-first.
// Translates the reference session card into a scrollable interface. RLS narrows
// getFeedback to the student's own rows (a foreign id → not-found state).
// Named SessionDetail to avoid colliding with the coach-side admin/FeedbackDetail.
// 55TC tokens only: forest, sand, ink · Bebas Neue display · DM Sans body.
import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import {
  getFeedback,
  getProfile,
  listLibraryForFeedback,
  listGalleryForFeedback,
} from '../lib/db'

// Coach photo in Supabase Storage (assets bucket). null → initial fallback.
const COACH_PHOTO_URL = 'https://vdyvlylacsghnvtllrzj.supabase.co/storage/v1/object/public/assets/coach/aleksei.jpg'
const COACH_NAME = 'Aleksei Nogueira'

const RATING_ROWS = [
  ['Technique', 'rating_technique'],
  ['Intensity', 'rating_intensity'],
  ['Position', 'rating_position'],
  ['Overall progress', 'rating_progress'],
]

// Section 3 qualitative "dot on a track". The text label is authoritative; the
// dot position is a best-effort heuristic over an ordered scale (values are free
// text, not a DB enum), centering when a value isn't recognised.
const QUAL_INDICATORS = [
  ['Effort', 'effort', ['baixo', 'moderado', 'bom', 'alto', 'intenso']],
  ['In-game', 'game_application', ['inconsistente', 'em desenvolvimento', 'parcial', 'consistente', 'dominante']],
  ['Progress', 'progress_level', ['inicial', 'assimilação técnica', 'em desenvolvimento', 'consistente', 'avançado']],
]

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

  const {
    title,
    body,
    lesson_date,
    duration_minutes,
    rally_avg,
    quality,
    effort,
    focus_areas,
    focus_next,
    next_session_goals,
    card_visual_url,
    video_url,
  } = feedback

  const focus = Array.isArray(focus_areas) ? focus_areas.filter(Boolean) : []
  const goals = Array.isArray(next_session_goals) ? next_session_goals : []
  const ratings = RATING_ROWS
    .map(([label, key]) => [label, feedback[key]])
    .filter(([, v]) => v != null)

  return (
    <div className="mx-auto max-w-2xl">
      {/* ── Section 1 — header ─────────────────────────────────────────── */}
      <button
        onClick={() => navigate('/feedback')}
        className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50 transition hover:text-forest"
      >
        ← Feedback
      </button>
      <header className="mt-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-ink/45">
          55 Tennis Crew · Session
        </p>
        {studentName && (
          <h1 className="mt-2 font-display text-5xl leading-[0.95] tracking-[0.04em] text-forest">
            {studentName}
          </h1>
        )}
        <p className="mt-2 text-sm text-ink/60">
          {[COACH_NAME, lesson_date].filter(Boolean).join(' · ')}
          {duration_minutes != null && ` · ${duration_minutes} min`}
        </p>
        {title && <p className="mt-1 text-sm font-medium text-ink/75">{title}</p>}
      </header>

      {/* ── Section 2 — quick metrics (4 pills) ────────────────────────── */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Pill label="Duration" value={duration_minutes != null ? `${duration_minutes}′` : '—'} />
        <Pill label="Rally avg" value={rally_avg != null ? rally_avg : '—'} />
        <Pill label="Effort" value={effort || '—'} />
        <Pill label="Quality" value={quality || '—'} />
      </div>

      {/* ── Section 3 — qualitative indicators (dot on a track) ────────── */}
      {QUAL_INDICATORS.some(([, key]) => feedback[key]) && (
        <SectionCard label="Where it stands">
          <div className="space-y-4">
            {QUAL_INDICATORS.filter(([, key]) => feedback[key]).map(([label, key, scale]) => (
              <QualIndicator key={key} label={label} value={feedback[key]} scale={scale} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Section 4 — focus areas + rally (2 columns) ────────────────── */}
      {(focus.length > 0 || rally_avg != null) && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {focus.length > 0 && (
            <SectionCard label="What we worked on">
              <ul className="space-y-3">
                {focus.map((area) => (
                  <li key={area} className="flex items-center gap-3">
                    <FocusIcon category={area} />
                    <span className="text-sm text-ink/80">{area}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
          {rally_avg != null && (
            <SectionCard label="Rally">
              <div className="flex h-full flex-col items-center justify-center py-2 text-center">
                <span className="font-display text-6xl leading-none text-forest">{rally_avg}</span>
                <span className="mt-2 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-ink/50">
                  Shots per point
                </span>
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* ── Section 5 — ratings 0-10 (segmented) ───────────────────────── */}
      {ratings.length > 0 && (
        <SectionCard label="Ratings">
          <div className="space-y-4">
            {ratings.map(([label, value]) => (
              <SegmentedRating key={label} label={label} value={value} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Section 6 — next-session goals ─────────────────────────────── */}
      {(focus_next || goals.length > 0) && (
        <SectionCard label="Goals — next session">
          {focus_next && <p className="mb-4 leading-relaxed text-ink/80">{focus_next}</p>}
          <ol className="space-y-5">
            {goals.map((g, i) => (
              <li key={i} className="flex gap-4">
                <CourtDiagram />
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-2xl leading-none text-forest/40">{i + 1}</span>
                    <p className="font-semibold text-ink/85">{g.titulo}</p>
                  </div>
                  {g.descricao && <p className="mt-1 text-sm text-ink/60">{g.descricao}</p>}
                </div>
              </li>
            ))}
          </ol>
        </SectionCard>
      )}

      {/* ── Section 7 — coach's analysis ───────────────────────────────── */}
      {body && (
        <div className="mt-4 rounded-3xl bg-forest p-7 text-sand sm:p-8">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-sand/60">
            Coach's analysis
          </p>
          <div className="mt-4 flex items-start gap-4">
            <CoachAvatar name={COACH_NAME} />
            <div>
              <span className="font-display text-5xl leading-none text-sand/30">“</span>
              <p className="-mt-2 whitespace-pre-wrap text-lg italic leading-relaxed text-sand/90">
                {body}
              </p>
              <p className="mt-4 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-sand/60">
                — 55 Tennis Crew
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Session video (Notion "Vídeo da Aula" → feedbacks.video_url) ─ */}
      <SectionCard label="Session videos">
        {video_url ? (
          <a
            href={video_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded bg-forest px-5 py-3 text-sm font-semibold uppercase tracking-[0.1em] text-sand ring-1 ring-sand/30 transition hover:bg-forest/90"
          >
            ▶ Watch on Drive
          </a>
        ) : (
          <p className="text-sm text-ink/45">Session videos coming soon</p>
        )}
      </SectionCard>

      {/* Attached videos (moved here from the gallery) */}
      {videos.gallery.length > 0 && <VideoGroup label="Your clips" videos={videos.gallery} />}
      {videos.library.length > 0 && (
        <VideoGroup label="From the crew library" videos={videos.library} />
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

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="mt-10 border-t border-forest/12 pt-6 text-center">
        <p className="font-display text-2xl tracking-[0.1em] text-forest">55TC</p>
        <p className="text-[0.6rem] uppercase tracking-[0.2em] text-ink/45">
          portal.55tenniscrew.com
        </p>
        <Link
          to={`/feedback/compare?a=${feedback.id}`}
          className="mt-3 inline-block text-xs font-semibold uppercase tracking-[0.15em] text-forest/60 transition hover:text-forest"
        >
          Compare with another session →
        </Link>
      </footer>
    </div>
  )
}

function Pill({ label, value }) {
  return (
    <div className="rounded-2xl bg-forest px-3 py-4 text-center text-sand">
      <p className="font-display text-2xl leading-none">{value}</p>
      <p className="mt-1.5 text-[0.55rem] font-semibold uppercase tracking-[0.2em] text-sand/60">
        {label}
      </p>
    </div>
  )
}

function SectionCard({ label, children }) {
  return (
    <section className="mt-4 rounded-3xl border border-forest/12 bg-white/60 p-6 sm:p-7">
      <p className="mb-4 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink/45">
        {label}
      </p>
      {children}
    </section>
  )
}

function QualIndicator({ label, value, scale }) {
  const idx = scale.indexOf(String(value).trim().toLowerCase())
  // Unknown value → center the dot (0.5); text label stays authoritative.
  const pos = idx >= 0 ? (idx / (scale.length - 1)) * 100 : 50
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-ink/55">
          {label}
        </span>
        <span className="text-sm font-medium text-forest">{value}</span>
      </div>
      <div className="relative mt-2 h-1.5 rounded-full bg-forest/10">
        <span
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sand bg-forest"
          style={{ left: `${pos}%` }}
        />
      </div>
    </div>
  )
}

function SegmentedRating({ label, value }) {
  const filled = Math.max(0, Math.min(10, value))
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-ink/55">
        {label}
      </span>
      <div className="flex flex-1 gap-1">
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={`h-2 flex-1 rounded-sm ${i < filled ? 'bg-forest' : 'bg-forest/12'}`}
          />
        ))}
      </div>
      <span className="w-9 shrink-0 text-right font-display text-lg leading-none text-forest">
        {value}
        <span className="text-xs text-ink/40">/10</span>
      </span>
    </div>
  )
}

// Minimal inline tennis court (portrait) — same placeholder for every goal in v1.
function CourtDiagram() {
  return (
    <svg viewBox="0 0 40 60" className="h-16 w-11 shrink-0" aria-hidden="true">
      <g fill="none" stroke="#1C3526" strokeWidth="1.2" opacity="0.7">
        <rect x="3" y="3" width="34" height="54" rx="1" />
        <line x1="3" y1="30" x2="37" y2="30" strokeDasharray="2 2" />
        <line x1="9" y1="3" x2="9" y2="57" />
        <line x1="31" y1="3" x2="31" y2="57" />
        <line x1="9" y1="18" x2="31" y2="18" />
        <line x1="9" y1="42" x2="31" y2="42" />
        <line x1="20" y1="18" x2="20" y2="42" />
      </g>
    </svg>
  )
}

// Simple line icons per focus-area category; generic dot as a fallback.
function FocusIcon({ category }) {
  const c = String(category).toLowerCase()
  const key =
    /fore|back|drive/.test(c) ? 'racket' :
    /saque|serv|smash/.test(c) ? 'serve' :
    /vole|net|rede/.test(c) ? 'net' :
    /foot|pé|pe|desloc/.test(c) ? 'foot' :
    /ment|foco|cabeça|cabeca/.test(c) ? 'mind' :
    /slice|corte/.test(c) ? 'slice' : 'dot'
  const paths = {
    racket: <><ellipse cx="9" cy="8" rx="5" ry="6" /><line x1="9" y1="14" x2="9" y2="21" /></>,
    serve: <><circle cx="8" cy="6" r="3" /><line x1="8" y1="9" x2="14" y2="20" /><line x1="8" y1="12" x2="4" y2="20" /></>,
    net: <><line x1="3" y1="8" x2="21" y2="8" /><line x1="3" y1="8" x2="3" y2="18" /><line x1="21" y1="8" x2="21" y2="18" /><line x1="7" y1="8" x2="7" y2="18" /><line x1="12" y1="8" x2="12" y2="18" /><line x1="17" y1="8" x2="17" y2="18" /></>,
    foot: <><path d="M7 4c-1 4 0 7 1 9M7 15h3M14 6c1 3 1 6 0 8M14 15h3" /></>,
    mind: <><path d="M12 4a6 6 0 0 0-6 6c0 4 3 5 3 8h6c0-3 3-4 3-8a6 6 0 0 0-6-6z" /></>,
    slice: <><path d="M3 14c4-6 14-6 18 0" /></>,
    dot: <circle cx="12" cy="12" r="3" />,
  }
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="#1C3526" strokeWidth="1.5" strokeLinecap="round">
      {paths[key]}
    </svg>
  )
}

function CoachAvatar({ name }) {
  if (COACH_PHOTO_URL) {
    return (
      <img
        src={COACH_PHOTO_URL}
        alt={name}
        className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-sand/40"
      />
    )
  }
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sand/15 ring-2 ring-sand/30">
      <span className="font-display text-2xl text-sand">{(name[0] || 'A').toUpperCase()}</span>
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
  const vid = youtubeId(video.external_url)
  const title = video.title || 'Watch'
  if (vid) {
    return (
      <div>
        <div className="aspect-video overflow-hidden rounded-xl border border-forest/12 bg-ink/5">
          <iframe
            src={`https://www.youtube.com/embed/${vid}`}
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
  return (
    <a
      href={video.external_url}
      target="_blank"
      rel="noreferrer"
      className="group flex aspect-video flex-col items-center justify-center rounded-xl border border-forest/15 bg-white/60 p-4 text-center transition hover:border-forest/30 hover:bg-white"
    >
      <span className="font-display text-2xl tracking-[0.04em] text-forest">Watch ↗</span>
      <span className="mt-1 line-clamp-2 text-sm text-ink/60">{title}</span>
    </a>
  )
}
