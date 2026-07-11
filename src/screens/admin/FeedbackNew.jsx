// New Feedback (/admin/feedback/new) — Fase F2, Tela de Disparo.
// Two entry paths in one screen:
//   MANUAL — full feedbacks-schema form; "Generate with AI" fills the coach's
//     analysis via the generate-feedback-analysis Edge Function (Claude, with
//     the student's feedback history as context); confirming INSERTs the row
//     published (status default) and emails the student.
//   VIDEO — Google Drive URL (file_id auto-extracted) + multi-student picker
//     with a per-player visual cue; confirming POSTs the existing n8n analysis
//     webhook, which fans out one DRAFT feedback per student (they land in the
//     HQ "Feedback Due" block together — the whole group leaves "pending" at once).
// Students without a claimed account can't be picked on either path:
// feedbacks.user_id is NOT NULL (same guard the old composer had).
// ?student=<id> preselects the student (legacy composer route redirects here).
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import {
  listActiveStudents,
  listFeedbacksForStudent,
  createFeedback,
  generateFeedbackAnalysis,
  sendFeedbackPublishedEmail,
  listVisualCues,
  upsertVisualCue,
} from '../../lib/db'

const ANALYSIS_WEBHOOK_URL =
  'https://n8n.55tenniscrew.com/webhook/analisar-treinos'

// Legacy composer route (/admin/students/:id/feedback/new) → this screen with
// the student preselected on the Manual path.
export function LegacyComposerRedirect() {
  const { id } = useParams()
  return <Navigate to={`/admin/feedback/new?student=${id}`} replace />
}

const RATING_FIELDS = [
  ['Technique', 'rating_technique'],
  ['Intensity', 'rating_intensity'],
  ['Position', 'rating_position'],
  ['Overall progress', 'rating_progress'],
]

// PT labels — the same vocabulary the Gemini pipeline writes and the student
// view knows how to position on its qualitative tracks (match is lowercased).
const QUAL_FIELDS = [
  ['Technical quality', 'quality', ['Em Desenvolvimento', 'Bom', 'Excelente']],
  ['Effort / intensity', 'effort', ['Baixo', 'Moderado', 'Bom', 'Alto', 'Intenso']],
  ['In-game application', 'game_application', ['Inconsistente', 'Em desenvolvimento', 'Parcial', 'Consistente', 'Dominante']],
  ['Overall progress', 'progress_level', ['Inicial', 'Assimilação técnica', 'Em desenvolvimento', 'Consistente', 'Avançado']],
]

// Focus-area chips the student view has icons for; free text adds more.
const FOCUS_PRESETS = [
  'Forehand',
  'Backhand',
  'Saque',
  'Voleio',
  'Deslocamento',
  'Slice',
  'Foco mental',
]

function todayLocal() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Pull the Drive file id out of a shared URL (or accept a bare id). */
function extractDriveFileId(input) {
  const s = String(input || '').trim()
  if (!s) return null
  const byPath = s.match(/\/d\/([A-Za-z0-9_-]{10,})/)
  if (byPath) return byPath[1]
  const byParam = s.match(/[?&]id=([A-Za-z0-9_-]{10,})/)
  if (byParam) return byParam[1]
  if (/^[A-Za-z0-9_-]{20,}$/.test(s)) return s // bare id pasted
  return null
}

const EMPTY_MANUAL = {
  student_id: '',
  title: '',
  lesson_date: todayLocal(),
  duration_minutes: '',
  rally_avg: '',
  rating_technique: 7,
  rating_intensity: 7,
  rating_position: 7,
  rating_progress: 7,
  quality: '',
  effort: '',
  game_application: '',
  progress_level: '',
  focus_areas: [],
  focus_next: '',
  goals: [],
  body: '',
}

export default function FeedbackNew() {
  const [searchParams] = useSearchParams()
  const preselected = searchParams.get('student') ?? ''

  const [path, setPath] = useState('manual')
  const [students, setStudents] = useState(null)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    let active = true
    listActiveStudents()
      .then((rows) => active && setStudents(rows))
      .catch((e) => active && setLoadError(e?.message ?? 'Could not load the roster.'))
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-ink/50">
          55TC · Feedback
        </p>
        <h1 className="mt-2 font-display text-5xl tracking-[0.06em] text-forest">
          New Feedback
        </h1>
        <p className="mt-3 max-w-md text-ink/60">
          Write it yourself, or drop a training video and let the analysis run.
        </p>
      </header>

      {/* ── Path switch ── */}
      <div className="mb-6 grid grid-cols-2 gap-2">
        {[
          ['manual', 'Manual', 'You fill it in — AI can draft the analysis.'],
          ['video', 'Video', 'Drive link → AI drafts one per player.'],
        ].map(([key, label, hint]) => (
          <button
            key={key}
            type="button"
            onClick={() => setPath(key)}
            aria-pressed={path === key}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              path === key
                ? 'border-forest bg-forest text-sand'
                : 'border-forest/15 bg-white/50 text-ink hover:border-forest/40'
            }`}
          >
            <span className="block text-sm font-semibold uppercase tracking-[0.15em]">
              {label}
            </span>
            <span
              className={`mt-1 block text-xs ${path === key ? 'text-sand/70' : 'text-ink/50'}`}
            >
              {hint}
            </span>
          </button>
        ))}
      </div>

      {loadError && (
        <p className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </p>
      )}

      {students === null && !loadError ? (
        <p className="text-sm text-ink/50">Loading roster…</p>
      ) : path === 'manual' ? (
        <ManualPath students={students ?? []} preselected={preselected} />
      ) : (
        <VideoPath students={students ?? []} />
      )}
    </div>
  )
}

/* ───────────────────────── CAMINHO A — Manual ───────────────────────── */

function ManualPath({ students, preselected }) {
  const { user } = useAuth()
  const [form, setForm] = useState({ ...EMPTY_MANUAL, student_id: preselected })
  const [customFocus, setCustomFocus] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(null)

  const student = students.find((s) => s.id === form.student_id) ?? null

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function toggleFocus(area) {
    setForm((f) => ({
      ...f,
      focus_areas: f.focus_areas.includes(area)
        ? f.focus_areas.filter((a) => a !== area)
        : [...f.focus_areas, area],
    }))
  }

  function addCustomFocus() {
    const v = customFocus.trim()
    if (!v) return
    if (!form.focus_areas.includes(v)) toggleFocus(v)
    setCustomFocus('')
  }

  function setGoal(i, field, value) {
    setForm((f) => ({
      ...f,
      goals: f.goals.map((g, idx) => (idx === i ? { ...g, [field]: value } : g)),
    }))
  }

  // Everything the insert (and the AI prompt) needs, normalized.
  function buildFields() {
    const num = (v) => (v === '' || v == null ? null : Number(v))
    return {
      title: form.title.trim() || null,
      lesson_date: form.lesson_date || null,
      duration_minutes: num(form.duration_minutes),
      rally_avg: num(form.rally_avg),
      rating_technique: Number(form.rating_technique),
      rating_intensity: Number(form.rating_intensity),
      rating_position: Number(form.rating_position),
      rating_progress: Number(form.rating_progress),
      quality: form.quality || null,
      effort: form.effort || null,
      game_application: form.game_application || null,
      progress_level: form.progress_level || null,
      focus_areas: form.focus_areas,
      focus_next: form.focus_next.trim() || null,
      next_session_goals: form.goals
        .map((g) => ({ titulo: g.titulo.trim(), descricao: g.descricao.trim() }))
        .filter((g) => g.titulo || g.descricao),
    }
  }

  async function handleGenerate() {
    if (!student) {
      setError('Pick a student first — the AI uses their history.')
      return
    }
    setGenerating(true)
    setError(null)
    try {
      // Coach can read the student's feedbacks via RLS; send a trimmed history
      // so the model writes with continuity, newest first.
      const history = (await listFeedbacksForStudent(student.id).catch(() => []))
        .slice(0, 5)
        .map((f) => ({
          lesson_date: f.lesson_date,
          title: f.title,
          body: f.body,
          focus_areas: f.focus_areas,
          focus_next: f.focus_next,
          quality: f.quality,
          effort: f.effort,
          game_application: f.game_application,
          progress_level: f.progress_level,
          rating_technique: f.rating_technique,
          rating_intensity: f.rating_intensity,
          rating_position: f.rating_position,
          rating_progress: f.rating_progress,
        }))
      const analysis = await generateFeedbackAnalysis({
        student_name: student.full_name,
        fields: buildFields(),
        history,
      })
      set('body', analysis)
    } catch (e) {
      setError(e?.message ?? 'Could not generate the analysis. Try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setOk(null)
    if (!student) {
      setError('Pick a student.')
      return
    }
    if (!student.user_id) {
      setError(
        `${student.full_name} hasn't claimed their invite yet — feedback needs their account.`,
      )
      return
    }
    if (!form.body.trim()) {
      setError("The coach's analysis is empty — write it or generate with AI.")
      return
    }
    setSaving(true)
    try {
      const fields = buildFields()
      // status defaults to 'published' in the DB — visible to the student now.
      const row = await createFeedback({
        student_id: student.id,
        user_id: student.user_id,
        coach_id: user?.id ?? null,
        source: 'coach',
        body: form.body.trim(),
        ...fields,
      })

      // Notify the student; an email failure never undoes the publish.
      let emailed = false
      try {
        await sendFeedbackPublishedEmail({
          student_name: student.full_name,
          student_email: student.email,
          feedback_date: fields.lesson_date,
          focus_next: fields.focus_next,
        })
        emailed = true
      } catch (mailErr) {
        console.error('Feedback email failed:', mailErr)
      }

      setOk({
        id: row.id,
        text: emailed
          ? `Published — ${student.full_name} was emailed.`
          : `Published — but the email to ${student.full_name} failed.`,
      })
      setForm({ ...EMPTY_MANUAL, lesson_date: todayLocal() })
    } catch (e2) {
      setError(e2?.message ?? 'Could not publish. Try again.')
    } finally {
      setSaving(false)
    }
  }

  if (ok) {
    return (
      <div className="rounded-2xl border border-forest/12 bg-white/50 px-6 py-10 text-center">
        <p className="font-display text-3xl tracking-[0.04em] text-forest">
          Feedback published
        </p>
        <p className="mt-2 text-sm text-ink/60">{ok.text}</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            to={`/admin/feedback/${ok.id}/review`}
            className="rounded bg-forest px-5 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-sand transition hover:bg-forest/90"
          >
            View / edit
          </Link>
          <button
            type="button"
            onClick={() => setOk(null)}
            className="rounded border border-forest/25 px-5 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-forest transition hover:border-forest"
          >
            Write another
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Who + when ── */}
      <Card label="Session">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <FieldLabel>Student</FieldLabel>
            <select
              value={form.student_id}
              onChange={(e) => set('student_id', e.target.value)}
              required
              className={inputCls}
            >
              <option value="">— pick a player —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id} disabled={!s.user_id}>
                  {s.full_name}
                  {!s.user_id ? " — hasn't joined yet" : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <FieldLabel>Lesson date</FieldLabel>
            <input
              type="date"
              value={form.lesson_date}
              onChange={(e) => set('lesson_date', e.target.value)}
              required
              className={inputCls}
            />
          </label>
          <label className="block sm:col-span-2">
            <FieldLabel>Title</FieldLabel>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Saque +1 e tomada de quadra"
              className={inputCls}
            />
          </label>
          <label className="block">
            <FieldLabel>Duration (min)</FieldLabel>
            <input
              type="number"
              min="0"
              step="5"
              value={form.duration_minutes}
              onChange={(e) => set('duration_minutes', e.target.value)}
              placeholder="60"
              className={inputCls}
            />
          </label>
          <label className="block">
            <FieldLabel>Rally average</FieldLabel>
            <input
              type="number"
              min="0"
              step="0.1"
              value={form.rally_avg}
              onChange={(e) => set('rally_avg', e.target.value)}
              placeholder="4.5"
              className={inputCls}
            />
          </label>
        </div>
      </Card>

      {/* ── Ratings 0–10 ── */}
      <Card label="Ratings — 0 to 10">
        <div className="space-y-5">
          {RATING_FIELDS.map(([label, key]) => (
            <label key={key} className="block">
              <div className="flex items-baseline justify-between">
                <FieldLabel>{label}</FieldLabel>
                <span className="font-display text-2xl leading-none text-forest">
                  {form[key]}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={form[key]}
                onChange={(e) => set(key, Number(e.target.value))}
                className="mt-2 w-full accent-forest"
              />
            </label>
          ))}
        </div>
      </Card>

      {/* ── Qualitative reads ── */}
      <Card label="Where it stands">
        <div className="grid gap-4 sm:grid-cols-2">
          {QUAL_FIELDS.map(([label, key, options]) => (
            <label key={key} className="block">
              <FieldLabel>{label}</FieldLabel>
              <select
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                className={inputCls}
              >
                <option value="">—</option>
                {options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </Card>

      {/* ── Focus areas ── */}
      <Card label="Focus areas">
        <div className="flex flex-wrap gap-2">
          {[...FOCUS_PRESETS, ...form.focus_areas.filter((a) => !FOCUS_PRESETS.includes(a))].map(
            (area) => {
              const on = form.focus_areas.includes(area)
              return (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleFocus(area)}
                  aria-pressed={on}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition ${
                    on
                      ? 'border-forest bg-forest text-sand'
                      : 'border-forest/25 text-ink/60 hover:border-forest/50'
                  }`}
                >
                  {area}
                </button>
              )
            },
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={customFocus}
            onChange={(e) => setCustomFocus(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addCustomFocus()
              }
            }}
            placeholder="Add your own — e.g. Devolução de saque"
            className={inputCls}
          />
          <button
            type="button"
            onClick={addCustomFocus}
            className="shrink-0 rounded border border-forest/25 px-4 text-xs font-semibold uppercase tracking-[0.1em] text-forest transition hover:border-forest"
          >
            Add
          </button>
        </div>
      </Card>

      {/* ── Next session ── */}
      <Card label="Next session">
        <label className="block">
          <FieldLabel>Focus next session</FieldLabel>
          <input
            type="text"
            value={form.focus_next}
            onChange={(e) => set('focus_next', e.target.value)}
            placeholder="One line the student sees first"
            className={inputCls}
          />
        </label>

        <div className="mt-4 space-y-3">
          {form.goals.map((g, i) => (
            <div
              key={i}
              className="rounded-xl border border-forest/15 bg-white/40 p-3"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={g.titulo}
                    onChange={(e) => setGoal(i, 'titulo', e.target.value)}
                    placeholder={`Goal ${i + 1} — title`}
                    className={inputCls}
                  />
                  <input
                    type="text"
                    value={g.descricao}
                    onChange={(e) => setGoal(i, 'descricao', e.target.value)}
                    placeholder="Short description"
                    className={inputCls}
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    set('goals', form.goals.filter((_, idx) => idx !== i))
                  }
                  aria-label={`Remove goal ${i + 1}`}
                  className="mt-1 rounded px-2 py-1 text-ink/40 transition hover:text-forest"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => set('goals', [...form.goals, { titulo: '', descricao: '' }])}
          className="mt-3 rounded border border-dashed border-forest/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-forest transition hover:border-forest"
        >
          + Add goal
        </button>
      </Card>

      {/* ── Coach's analysis ── */}
      <Card label="Coach's analysis">
        <textarea
          value={form.body}
          onChange={(e) => set('body', e.target.value)}
          rows={7}
          placeholder="What you saw, what to work on, what's next — or generate a draft with AI and edit it."
          className={`${inputCls} resize-y`}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !form.student_id}
            className="rounded border border-forest/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-forest transition hover:border-forest disabled:opacity-50"
          >
            {generating ? 'Generating…' : '✦ Generate with AI'}
          </button>
          <p className="text-xs text-ink/50">
            Drafts from the fields above + this player's history. You edit, you own it.
          </p>
        </div>
      </Card>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-forest px-6 py-3 text-sm font-semibold uppercase tracking-[0.1em] text-sand transition hover:bg-forest/90 disabled:opacity-60"
        >
          {saving ? 'Publishing…' : 'Publish & email student'}
        </button>
        <Link
          to="/coach"
          className="text-sm text-ink/60 underline-offset-4 transition hover:text-forest hover:underline"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}

/* ───────────────────────── CAMINHO B — Vídeo ───────────────────────── */

function VideoPath({ students }) {
  const [driveUrl, setDriveUrl] = useState('')
  const [sessionDate, setSessionDate] = useState(todayLocal())
  const [selected, setSelected] = useState(() => new Map()) // student_id → visual_cue
  const [savedCues, setSavedCues] = useState(() => new Map()) // student_id → remembered cue
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(null)

  // Remembered cues from past dispatches — pre-fill on pick, coach confirms/edits.
  useEffect(() => {
    let alive = true
    listVisualCues()
      .then((rows) => {
        if (alive) setSavedCues(new Map(rows.map((r) => [r.student_id, r.visual_cue])))
      })
      .catch(() => {}) // best-effort: no cues just means empty fields
    return () => {
      alive = false
    }
  }, [])

  const fileId = useMemo(() => extractDriveFileId(driveUrl), [driveUrl])
  const picked = students.filter((s) => selected.has(s.id))

  function toggle(s) {
    if (!s.user_id) return // drafts need the student's account (user_id NOT NULL)
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(s.id)) next.delete(s.id)
      else next.set(s.id, savedCues.get(s.id) ?? '')
      return next
    })
  }

  function setCue(id, cue) {
    setSelected((prev) => {
      const next = new Map(prev)
      next.set(id, cue)
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!fileId) {
      setError('That doesn’t look like a Google Drive link — paste the share URL.')
      return
    }
    if (picked.length === 0) {
      setError('Pick at least one player who was in the video.')
      return
    }
    setSending(true)
    try {
      const res = await fetch(ANALYSIS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_id: fileId,
          session_date: sessionDate,
          students: picked.map((s) => ({
            student_id: s.id,
            name: s.full_name,
            visual_cue: (selected.get(s.id) || '').trim() || null,
          })),
        }),
      })
      if (!res.ok) throw new Error(`Analysis webhook answered ${res.status}.`)
      // Remember the cues the coach just confirmed (best-effort — a failed
      // save never touches the analysis result).
      const cueSaves = picked
        .map((s) => ({ id: s.id, cue: (selected.get(s.id) || '').trim() }))
        .filter((c) => c.cue)
      const settled = await Promise.allSettled(
        cueSaves.map((c) => upsertVisualCue(c.id, c.cue)),
      )
      setSavedCues((prev) => {
        const next = new Map(prev)
        cueSaves.forEach((c, i) => {
          if (settled[i].status === 'fulfilled') next.set(c.id, c.cue)
        })
        return next
      })
      setOk(
        `Analysis done for ${picked.length} player${picked.length > 1 ? 's' : ''} — drafts are in Feedback Due for your review.`,
      )
      setDriveUrl('')
      setSelected(new Map())
    } catch (e2) {
      setError(
        e2?.message
          ? `${e2.message} If the video is long the analysis may still be running — check Feedback Due in a few minutes.`
          : 'Could not reach the analysis pipeline. Try again.',
      )
    } finally {
      setSending(false)
    }
  }

  if (ok) {
    return (
      <div className="rounded-2xl border border-forest/12 bg-white/50 px-6 py-10 text-center">
        <p className="font-display text-3xl tracking-[0.04em] text-forest">
          Drafts ready
        </p>
        <p className="mt-2 text-sm text-ink/60">{ok}</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            to="/coach"
            className="rounded bg-forest px-5 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-sand transition hover:bg-forest/90"
          >
            Review in HQ
          </Link>
          <button
            type="button"
            onClick={() => setOk(null)}
            className="rounded border border-forest/25 px-5 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-forest transition hover:border-forest"
          >
            Analyze another
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card label="Training video">
        <label className="block">
          <FieldLabel>Google Drive link</FieldLabel>
          <input
            type="text"
            value={driveUrl}
            onChange={(e) => setDriveUrl(e.target.value)}
            placeholder="https://drive.google.com/file/d/…/view"
            required
            className={inputCls}
          />
        </label>
        {driveUrl.trim() && (
          <p className={`mt-2 text-xs ${fileId ? 'text-forest' : 'text-red-700'}`}>
            {fileId ? `File id: ${fileId}` : 'No file id found in that link yet.'}
          </p>
        )}
        <label className="mt-4 block sm:max-w-xs">
          <FieldLabel>Session date</FieldLabel>
          <input
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            required
            className={inputCls}
          />
        </label>
      </Card>

      <Card label="Who's in the video">
        {students.length === 0 ? (
          <p className="text-sm text-ink/55">No active students yet.</p>
        ) : (
          <ul className="divide-y divide-forest/10">
            {students.map((s) => {
              const on = selected.has(s.id)
              return (
                <li key={s.id} className="py-2">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    disabled={!s.user_id}
                    onClick={() => toggle(s)}
                    className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition ${
                      s.user_id ? 'hover:bg-forest/5' : 'cursor-not-allowed opacity-45'
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-lg ${
                        on ? 'bg-forest text-sand' : 'bg-forest/10 text-forest'
                      }`}
                    >
                      {on ? '✓' : (s.full_name ?? '?').charAt(0).toUpperCase()}
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-medium text-ink">
                        {s.full_name}
                      </span>
                      {!s.user_id && (
                        <span className="block text-xs text-ink/45">
                          Hasn't joined yet — drafts need their account.
                        </span>
                      )}
                    </span>
                  </button>
                  {on && (
                    <label className="mt-2 block pl-14">
                      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-ink/45">
                        How to spot them (optional)
                      </span>
                      <input
                        type="text"
                        value={selected.get(s.id) ?? ''}
                        onChange={(e) => setCue(s.id, e.target.value)}
                        placeholder="e.g. camiseta azul, lado esquerdo"
                        className={`${inputCls} mt-1`}
                      />
                    </label>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {picked.length > 0 && (
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-forest">
            {picked.length} player{picked.length > 1 ? 's' : ''} selected
          </p>
        )}
      </Card>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={sending}
          className="rounded bg-forest px-6 py-3 text-sm font-semibold uppercase tracking-[0.1em] text-sand transition hover:bg-forest/90 disabled:opacity-60"
        >
          {sending ? 'Analyzing… this takes a few minutes' : 'Send for analysis'}
        </button>
        <Link
          to="/coach"
          className="text-sm text-ink/60 underline-offset-4 transition hover:text-forest hover:underline"
        >
          Cancel
        </Link>
      </div>
      {sending && (
        <p className="text-xs text-ink/50">
          Keep this tab open — the AI is watching the video. Drafts land in
          Feedback Due for every selected player at once.
        </p>
      )}
    </form>
  )
}

/* ───────────────────────── shared bits ───────────────────────── */

const inputCls =
  'mt-2 w-full rounded-xl border border-forest/15 bg-white/60 px-4 py-3 text-ink outline-none transition placeholder:text-ink/30 focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/10'

function Card({ label, children }) {
  return (
    <section className="rounded-2xl border border-forest/12 bg-white/50 p-5 sm:p-6">
      <h2 className="mb-4 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-ink/45">
        {label}
      </h2>
      {children}
    </section>
  )
}

function FieldLabel({ children }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink/50">
      {children}
    </span>
  )
}
