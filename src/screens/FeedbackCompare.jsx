// Session comparison (/feedback/compare?a={id}&b={id}) — two sessions side by
// side, mobile-first. Ratings as paired bars + delta, rally, qualitative
// evolution, and focus areas. Sessions are picked from the student's own list
// (via selectors), so A/B only ever resolve to own rows — RLS-safe by design.
// 55TC tokens only: forest, sand, ink · Bebas Neue display · DM Sans body.
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { getStudentByUserId, listFeedbacksForStudent } from '../lib/db'

const RATING_ROWS = [
  ['Technique', 'rating_technique'],
  ['Intensity', 'rating_intensity'],
  ['Position', 'rating_position'],
  ['Progress', 'rating_progress'],
]

// Ordered scales for the qualitative fields (values are free text, not enums).
// A null scale → compare by equality only (no direction). Mirrors SessionDetail.
const QUAL_ROWS = [
  ['Effort', 'effort', ['baixo', 'moderado', 'bom', 'alto', 'intenso']],
  ['In-game', 'game_application', ['inconsistente', 'em desenvolvimento', 'parcial', 'consistente', 'dominante']],
  ['Progress', 'progress_level', ['inicial', 'assimilação técnica', 'em desenvolvimento', 'consistente', 'avançado']],
  ['Quality', 'quality', null],
]

function coverLabel(f) {
  return [f.lesson_date, f.title].filter(Boolean).join(' · ') || 'Lesson Note'
}

export default function FeedbackCompare() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [feedbacks, setFeedbacks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const aId = params.get('a') || ''
  const bId = params.get('b') || ''

  useEffect(() => {
    if (!user) return
    let active = true
    ;(async () => {
      try {
        const student = await getStudentByUserId(user.id)
        if (!active) return
        if (!student) {
          setFeedbacks([])
          return
        }
        const list = await listFeedbacksForStudent(student.id)
        if (active) setFeedbacks(list)
      } catch (e) {
        if (active) setError(e.message ?? 'Could not load your sessions.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [user])

  const a = useMemo(() => feedbacks.find((f) => f.id === aId) || null, [feedbacks, aId])
  const b = useMemo(() => feedbacks.find((f) => f.id === bId) || null, [feedbacks, bId])

  function setSide(side, id) {
    const next = new URLSearchParams(params)
    if (id) next.set(side, id)
    else next.delete(side)
    setParams(next, { replace: true })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => navigate('/feedback')}
        className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50 transition hover:text-forest"
      >
        ← Feedback
      </button>

      <header className="mt-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-ink/45">
          55TC · Your Portal
        </p>
        <h1 className="mt-2 font-display text-5xl tracking-[0.06em] text-forest">
          Compare Sessions
        </h1>
        <p className="mt-3 text-ink/60">
          Two sessions, side by side. Watch the progress. Less Theory. More Game.
        </p>
      </header>

      {loading && <p className="mt-8 text-sm text-ink/50">Loading your sessions…</p>}

      {error && !loading && (
        <p className="mt-8 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {!loading && !error && feedbacks.length < 2 && (
        <div className="mt-8 rounded-2xl border border-dashed border-forest/25 bg-white/40 px-6 py-14 text-center">
          <p className="font-display text-3xl tracking-[0.04em] text-forest">
            Not enough sessions yet
          </p>
          <p className="mt-2 text-sm text-ink/55">
            You need at least two sessions to compare. Keep showing up.
          </p>
        </div>
      )}

      {!loading && !error && feedbacks.length >= 2 && (
        <>
          {/* Session pickers */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <SessionPicker
              badge="A"
              value={aId}
              options={feedbacks}
              disabledId={bId}
              onChange={(id) => setSide('a', id)}
            />
            <SessionPicker
              badge="B"
              value={bId}
              options={feedbacks}
              disabledId={aId}
              onChange={(id) => setSide('b', id)}
            />
          </div>

          {a && b ? (
            <Comparison a={a} b={b} />
          ) : (
            <p className="mt-8 text-center text-sm text-ink/50">
              Pick two sessions above to compare them.
            </p>
          )}
        </>
      )}

      <footer className="mt-10 border-t border-forest/12 pt-6 text-center">
        <p className="font-display text-2xl tracking-[0.1em] text-forest">55TC</p>
        <p className="text-[0.6rem] uppercase tracking-[0.2em] text-ink/45">
          portal.55tenniscrew.com
        </p>
      </footer>
    </div>
  )
}

function SessionPicker({ badge, value, options, disabledId, onChange }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-ink/45">
        <SideBadge side={badge} /> Session {badge}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-forest/20 bg-white/70 px-3 py-2.5 text-sm text-ink focus:border-forest/50 focus:outline-none focus:ring-2 focus:ring-forest/20"
      >
        <option value="">Select a session…</option>
        {options.map((f) => (
          <option key={f.id} value={f.id} disabled={f.id === disabledId}>
            {coverLabel(f)}
          </option>
        ))}
      </select>
    </label>
  )
}

function Comparison({ a, b }) {
  const ratings = RATING_ROWS
    .map(([label, key]) => [label, a[key], b[key]])
    .filter(([, va, vb]) => va != null || vb != null)

  const quals = QUAL_ROWS
    .map(([label, key, scale]) => [label, a[key], b[key], scale])
    .filter(([, va, vb]) => va || vb)

  const focusA = Array.isArray(a.focus_areas) ? a.focus_areas.filter(Boolean) : []
  const focusB = Array.isArray(b.focus_areas) ? b.focus_areas.filter(Boolean) : []

  return (
    <>
      {/* Column headers — which session is which */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <SessionHeader side="A" feedback={a} />
        <SessionHeader side="B" feedback={b} />
      </div>

      {/* Ratings 0–10 — paired bars + delta (B relative to A) */}
      {ratings.length > 0 && (
        <SectionCard label="Ratings">
          <div className="space-y-5">
            {ratings.map(([label, va, vb]) => (
              <RatingCompare key={label} label={label} a={va} b={vb} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* Rally average */}
      {(a.rally_avg != null || b.rally_avg != null) && (
        <SectionCard label="Rally avg — shots per point">
          <div className="grid grid-cols-2 gap-3">
            <RallyValue side="A" value={a.rally_avg} />
            <RallyValue side="B" value={b.rally_avg} />
          </div>
          <DeltaLine a={a.rally_avg} b={b.rally_avg} />
        </SectionCard>
      )}

      {/* Qualitative — value A → value B with an evolution cue */}
      {quals.length > 0 && (
        <SectionCard label="Where it stands">
          <div className="space-y-4">
            {quals.map(([label, va, vb, scale]) => (
              <QualCompare key={label} label={label} a={va} b={vb} scale={scale} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* Focus areas side by side */}
      {(focusA.length > 0 || focusB.length > 0) && (
        <SectionCard label="What we worked on">
          <div className="grid grid-cols-2 gap-4">
            <FocusColumn side="A" focus={focusA} />
            <FocusColumn side="B" focus={focusB} />
          </div>
        </SectionCard>
      )}
    </>
  )
}

function SideBadge({ side }) {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-forest text-[0.6rem] font-bold text-sand">
      {side}
    </span>
  )
}

function SessionHeader({ side, feedback }) {
  return (
    <div className="rounded-2xl bg-forest px-4 py-3 text-sand">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sand/20 text-[0.6rem] font-bold text-sand">
          {side}
        </span>
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-sand/60">
          {feedback.lesson_date || 'No date'}
        </span>
      </div>
      <p className="mt-1.5 line-clamp-1 text-sm font-medium text-sand/90">
        {feedback.title || 'Lesson Note'}
      </p>
    </div>
  )
}

// A single 0–10 rating: two stacked bars (A over B) with values + a delta chip.
function RatingCompare({ label, a, b }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-ink/55">
          {label}
        </span>
        <Delta a={a} b={b} />
      </div>
      <div className="mt-2 space-y-1.5">
        <RatingBar side="A" value={a} />
        <RatingBar side="B" value={b} />
      </div>
    </div>
  )
}

function RatingBar({ side, value }) {
  const has = value != null
  const pct = has ? Math.max(0, Math.min(10, value)) * 10 : 0
  return (
    <div className="flex items-center gap-2">
      <span className="w-4 shrink-0 text-[0.6rem] font-bold text-forest/50">{side}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-forest/10">
        <div className="h-full rounded-full bg-forest" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right font-display text-base leading-none text-forest">
        {has ? value : '—'}
        {has && <span className="text-[0.6rem] text-ink/40">/10</span>}
      </span>
    </div>
  )
}

function RallyValue({ side, value }) {
  return (
    <div className="rounded-2xl border border-forest/12 bg-white/50 py-4 text-center">
      <p className="text-[0.55rem] font-bold text-forest/50">{side}</p>
      <p className="mt-1 font-display text-5xl leading-none text-forest">
        {value != null ? value : '—'}
      </p>
    </div>
  )
}

// Numeric delta (B − A) as a small chip. On-brand (forest/ink only): the arrow
// direction carries the sign, the fill weight the emphasis — improvement = solid
// forest, regression = hollow forest outline, no change = muted ink.
function Delta({ a, b }) {
  if (a == null || b == null) return null
  const d = Number(b) - Number(a)
  return <DeltaChip d={d} />
}

function DeltaLine({ a, b }) {
  if (a == null || b == null) return null
  const d = Number(b) - Number(a)
  return (
    <div className="mt-3 flex justify-center">
      <DeltaChip d={d} />
    </div>
  )
}

function DeltaChip({ d }) {
  const rounded = Math.round(d * 10) / 10
  if (rounded === 0) {
    return (
      <span className="rounded-full bg-ink/8 px-2.5 py-0.5 text-[0.65rem] font-semibold text-ink/50">
        → no change
      </span>
    )
  }
  const up = rounded > 0
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold ${
        up ? 'bg-forest text-sand' : 'border border-forest/35 text-forest/80'
      }`}
    >
      {up ? '↑ +' : '↓ '}
      {rounded}
    </span>
  )
}

// Qualitative evolution: "A → B" with a direction cue derived from the ordered
// scale. Unknown values (not on the scale) show plainly, equality only.
function QualCompare({ label, a, b, scale }) {
  const dir = direction(scale, a, b)
  return (
    <div>
      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-ink/55">
        {label}
      </span>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-ink/70">{a || '—'}</span>
        <QualArrow dir={dir} />
        <span
          className={`text-sm font-medium ${dir === 'up' ? 'text-forest' : 'text-ink/70'}`}
        >
          {b || '—'}
        </span>
      </div>
    </div>
  )
}

function QualArrow({ dir }) {
  const glyph = dir === 'up' ? '↑' : dir === 'down' ? '↓' : '→'
  const tone = dir === 'up' ? 'text-forest' : dir === 'down' ? 'text-ink/50' : 'text-ink/35'
  return <span className={`text-sm font-bold ${tone}`}>{glyph}</span>
}

// 'up' | 'down' | 'same' | 'unknown'. Requires a scale and both values present.
function direction(scale, a, b) {
  if (!a || !b) return 'unknown'
  const eq = String(a).trim().toLowerCase() === String(b).trim().toLowerCase()
  if (!scale) return eq ? 'same' : 'unknown'
  const ia = scale.indexOf(String(a).trim().toLowerCase())
  const ib = scale.indexOf(String(b).trim().toLowerCase())
  if (ia < 0 || ib < 0) return eq ? 'same' : 'unknown'
  if (ib > ia) return 'up'
  if (ib < ia) return 'down'
  return 'same'
}

function FocusColumn({ side, focus }) {
  return (
    <div>
      <p className="mb-2 text-[0.55rem] font-bold text-forest/50">{side}</p>
      {focus.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {focus.map((area) => (
            <span
              key={area}
              className="rounded-full border border-forest/25 px-2.5 py-1 text-xs text-forest"
            >
              {area}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-ink/40">—</p>
      )}
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
