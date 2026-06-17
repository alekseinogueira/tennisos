// Admin → a single student's detail hub (/admin/students/:id). Step 1 focus:
// the lesson-credit panel. Shows the live balance, then a credit-adjustment form
// that records one ledger entry — a signed delta (positive = grant, negative =
// use), a reason, and an optional note — straight to lesson_credits via addCredit.
//
// Credits are always per-transaction: no packages in V1, so there's no package to
// pick. Guard: lesson_credits.user_id is NOT NULL, but an invited-but-unclaimed
// student has user_id = NULL — so we block the form until they've claimed, the
// same way feedback does.
// 55TC styling: Bebas headings, uppercase tracked labels, forest/sand/ink only.
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import {
  getStudent,
  getCreditBalance,
  listCreditsForStudent,
  addCredit,
  listUpcomingSessionsForStudent,
  createSession,
  cancelSession,
} from '../../lib/db'

const REASONS = ['purchase', 'lesson', 'adjustment', 'refund']
const EMPTY = { delta: '', reason: 'purchase', note: '' }

// Bookable times: 30-min increments, 07:00–21:00 inclusive.
const TIMES = (() => {
  const out = []
  for (let h = 7; h <= 21; h++) {
    out.push(`${String(h).padStart(2, '0')}:00`)
    if (h < 21) out.push(`${String(h).padStart(2, '0')}:30`)
  }
  return out
})()
const DURATIONS = [60, 90]
const EMPTY_SESSION = { date: '', time: '', duration: 60, location: '', notes: '' }

const STATUSES = {
  active: 'bg-forest text-sand',
  invited: 'border border-forest/40 text-forest',
  inactive: 'bg-ink/10 text-ink/45',
}

const SESSION_STATUSES = {
  scheduled: 'bg-forest text-sand',
  completed: 'border border-forest/40 text-forest',
  cancelled: 'bg-ink/10 text-ink/40',
}

export default function StudentDetail() {
  const { id } = useParams()
  const { user } = useAuth()

  const [student, setStudent] = useState(null)
  const [balance, setBalance] = useState(0)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const [sessions, setSessions] = useState([])
  const [sForm, setSForm] = useState(EMPTY_SESSION)
  const [scheduling, setScheduling] = useState(false)
  const [sError, setSError] = useState(null)
  const [sOk, setSOk] = useState(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [s, b, h, up] = await Promise.all([
          getStudent(id),
          getCreditBalance(id),
          listCreditsForStudent(id),
          listUpcomingSessionsForStudent(id),
        ])
        if (!active) return
        setStudent(s)
        setBalance(b)
        setHistory(h)
        setSessions(up)
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
    setFormError(null)

    const delta = Number(form.delta)
    if (!Number.isInteger(delta) || delta === 0) {
      setFormError('Enter a whole number — positive to grant, negative to use.')
      return
    }

    setSaving(true)
    try {
      const row = await addCredit({
        student_id: student.id,
        user_id: student.user_id, // student subject — guaranteed non-null below
        delta,
        reason: form.reason,
        note: form.note.trim() || null,
        created_by: user?.id ?? null,
      })
      setHistory((h) => [row, ...h])
      setBalance((b) => b + delta)
      setForm(EMPTY)
    } catch (e) {
      setFormError(e.message ?? 'Could not record that. Try again.')
    } finally {
      setSaving(false)
    }
  }

  function setS(field, value) {
    setSForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSchedule(e) {
    e.preventDefault()
    setSError(null)
    setSOk(null)

    if (!sForm.date || !sForm.time) {
      setSError('Pick a date and a time.')
      return
    }
    // Combine the local date + time into an instant. `new Date('YYYY-MM-DDTHH:MM')`
    // is parsed in the coach's local zone, then stored as UTC (timestamptz).
    const scheduledAt = new Date(`${sForm.date}T${sForm.time}`)
    if (Number.isNaN(scheduledAt.getTime())) {
      setSError('That date/time didn’t parse. Try again.')
      return
    }

    setScheduling(true)
    try {
      const row = await createSession({
        student_id: student.id,
        user_id: student.user_id, // may be null (unclaimed) — email still sends
        coach_id: user?.id ?? null,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: sForm.duration,
        location: sForm.location.trim() || null,
        notes: sForm.notes.trim() || null,
        status: 'scheduled',
      })

      // Fire the reminder email and reflect the real result in the toast.
      let emailed = true
      try {
        const res = await fetch(
          'https://vdyvlylacsghnvtllrzj.supabase.co/functions/v1/send-session-reminder',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              student_name: student.full_name,
              student_email: student.email,
              scheduled_at: row.scheduled_at,
              duration_minutes: row.duration_minutes,
              location: row.location,
            }),
          },
        )
        emailed = res.ok
        if (!res.ok) console.error('Session reminder email failed:', await res.text())
      } catch (err) {
        emailed = false
        console.error('Session reminder email failed:', err)
      }

      setSessions((list) =>
        [...list, row].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)),
      )
      setSForm(EMPTY_SESSION)
      setSOk(
        emailed
          ? 'Session scheduled. Reminder sent.'
          : 'Session scheduled — but the reminder email didn’t send.',
      )
    } catch (e) {
      setSError(e.message ?? 'Could not schedule that. Try again.')
    } finally {
      setScheduling(false)
    }
  }

  async function handleCancel(sessionId) {
    try {
      const updated = await cancelSession(sessionId)
      setSessions((list) => list.map((s) => (s.id === sessionId ? updated : s)))
    } catch (e) {
      setSError(e.message ?? 'Could not cancel that session.')
    }
  }

  if (loading) return <p className="text-sm text-ink/50">Loading…</p>

  if (error && !student) {
    return (
      <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
    )
  }

  return (
    <div className="max-w-3xl">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-ink/50">
          55TC · Admin · Student
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <h1 className="font-display text-5xl tracking-[0.06em] text-forest">
            {student.full_name}
          </h1>
          <StatusBadge status={student.status} />
        </div>
        <p className="mt-3 text-ink/60">{student.email}</p>
        <div className="mt-4 flex items-center gap-4">
          <Link
            to={`/admin/students/${student.id}/edit`}
            className="text-xs font-semibold uppercase tracking-[0.15em] text-forest underline-offset-4 transition hover:underline"
          >
            Edit
          </Link>
          <Link
            to={`/admin/students/${student.id}/feedback/new`}
            className="text-xs font-semibold uppercase tracking-[0.15em] text-forest underline-offset-4 transition hover:underline"
          >
            New feedback
          </Link>
          <Link
            to="/admin/students"
            className="text-xs font-semibold uppercase tracking-[0.15em] text-ink/45 underline-offset-4 transition hover:text-forest hover:underline"
          >
            Back to roster
          </Link>
        </div>
      </header>

      {/* ── Schedule session ── */}
      <section className="mb-8">
        <h2 className="font-display text-3xl tracking-[0.04em] text-forest">
          Schedule Session
        </h2>
        <p className="mt-1 mb-4 text-sm text-ink/55">
          Book a lesson — the player gets a reminder email right away.
        </p>

        <form
          onSubmit={handleSchedule}
          className="rounded-2xl border border-forest/12 bg-white/50 p-6"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink/50">
                Date
              </span>
              <input
                type="date"
                value={sForm.date}
                onChange={(e) => setS('date', e.target.value)}
                required
                className="mt-2 w-full rounded-xl border border-forest/15 bg-white/60 px-4 py-3 text-ink outline-none transition focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/10"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink/50">
                Time
              </span>
              <select
                value={sForm.time}
                onChange={(e) => setS('time', e.target.value)}
                required
                className="mt-2 w-full rounded-xl border border-forest/15 bg-white/60 px-4 py-3 text-ink outline-none transition focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/10"
              >
                <option value="" disabled>
                  Pick a time
                </option>
                {TIMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <div className="sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink/50">
                Duration
              </span>
              <div className="mt-2 flex gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setS('duration', d)}
                    className={`rounded-xl px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.1em] transition ${
                      sForm.duration === d
                        ? 'bg-forest text-sand'
                        : 'border border-forest/20 text-forest hover:bg-forest/5'
                    }`}
                  >
                    {d} min
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink/50">
                  Location
                </span>
                <input
                  type="text"
                  value={sForm.location}
                  onChange={(e) => setS('location', e.target.value)}
                  placeholder="Stanley Park Court 3"
                  className="mt-2 w-full rounded-xl border border-forest/15 bg-white/60 px-4 py-3 text-ink outline-none transition placeholder:text-ink/30 focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/10"
                />
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink/50">
                  Notes <span className="text-ink/35">(optional)</span>
                </span>
                <textarea
                  rows={2}
                  value={sForm.notes}
                  onChange={(e) => setS('notes', e.target.value)}
                  placeholder="Bring the resistance bands."
                  className="mt-2 w-full rounded-xl border border-forest/15 bg-white/60 px-4 py-3 text-ink outline-none transition placeholder:text-ink/30 focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/10"
                />
              </label>
            </div>
          </div>

          {sError && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {sError}
            </p>
          )}
          {sOk && (
            <p className="mt-4 rounded-lg bg-forest/10 px-3 py-2 text-sm text-forest">
              {sOk}
            </p>
          )}

          <button
            type="submit"
            disabled={scheduling}
            className="mt-5 rounded-xl bg-forest px-6 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-sand transition hover:bg-forest/90 disabled:opacity-60"
          >
            {scheduling ? 'Scheduling…' : 'Schedule session'}
          </button>
        </form>

        {/* Upcoming list */}
        <h3 className="mt-6 mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">
          Upcoming
        </h3>
        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-forest/25 bg-white/40 px-6 py-8 text-center">
            <p className="text-sm text-ink/55">No sessions on the calendar yet.</p>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-forest/12 bg-white/50">
            {sessions.map((s) => {
              const when = formatSessionWhen(s.scheduled_at)
              const cancelled = s.status === 'cancelled'
              return (
                <li
                  key={s.id}
                  className={`flex items-center justify-between gap-4 border-b border-forest/8 px-5 py-4 last:border-0 ${
                    cancelled ? 'opacity-55' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <p
                      className={`font-display text-2xl tracking-[0.03em] text-forest ${
                        cancelled ? 'line-through' : ''
                      }`}
                    >
                      {when.date} · {when.time}
                    </p>
                    <p className="mt-0.5 text-sm text-ink/55">
                      {s.duration_minutes} min
                      {s.location ? ` · ${s.location}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <SessionBadge status={s.status} />
                    {s.status === 'scheduled' && (
                      <button
                        type="button"
                        onClick={() => handleCancel(s.id)}
                        className="text-xs font-semibold uppercase tracking-[0.15em] text-ink/45 underline-offset-4 transition hover:text-red-700 hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* ── Balance ── */}
      <section className="mb-8 rounded-3xl border border-forest/12 bg-white/60 p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">
          Lesson Credits
        </p>
        <p className="mt-3 font-display text-7xl tracking-wide text-forest tabular-nums">
          {balance}
        </p>
        <p className="mt-2 text-sm text-ink/55">
          {balance === 1 ? 'credit on the books.' : 'credits on the books.'}
        </p>
      </section>

      {/* ── Adjustment panel ── */}
      <section>
        <h2 className="font-display text-3xl tracking-[0.04em] text-forest">
          Adjust Credits
        </h2>
        <p className="mt-1 mb-4 text-sm text-ink/55">
          Record one entry. Positive grants credits, negative uses them.
        </p>

        {student.user_id ? (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-forest/12 bg-white/50 p-6"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink/50">
                  Delta
                </span>
                <input
                  type="number"
                  step="1"
                  inputMode="numeric"
                  value={form.delta}
                  onChange={(e) => set('delta', e.target.value)}
                  required
                  placeholder="e.g. 10 or -1"
                  className="mt-2 w-full rounded-xl border border-forest/15 bg-white/60 px-4 py-3 text-ink outline-none transition placeholder:text-ink/30 focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/10 tabular-nums"
                />
                <span className="mt-1.5 block text-xs text-ink/45">
                  + grant · − use
                </span>
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink/50">
                  Reason
                </span>
                <select
                  value={form.reason}
                  onChange={(e) => set('reason', e.target.value)}
                  className="mt-2 w-full rounded-xl border border-forest/15 bg-white/60 px-4 py-3 text-ink outline-none transition focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/10"
                >
                  {REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r[0].toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="sm:col-span-2">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink/50">
                    Note <span className="text-ink/35">(optional)</span>
                  </span>
                  <input
                    type="text"
                    value={form.note}
                    onChange={(e) => set('note', e.target.value)}
                    placeholder="e.g. Private x10 pack, paid cash"
                    className="mt-2 w-full rounded-xl border border-forest/15 bg-white/60 px-4 py-3 text-ink outline-none transition placeholder:text-ink/30 focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/10"
                  />
                </label>
              </div>
            </div>

            {formError && (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="mt-5 rounded-xl bg-forest px-6 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-sand transition hover:bg-forest/90 disabled:opacity-60"
            >
              {saving ? 'Recording…' : 'Record entry'}
            </button>
          </form>
        ) : (
          <div className="rounded-2xl border border-dashed border-forest/25 bg-white/40 px-6 py-12 text-center">
            <p className="font-display text-3xl tracking-[0.04em] text-forest">
              Hasn't joined yet
            </p>
            <p className="mt-2 text-sm text-ink/55">
              {student.full_name} needs to claim their invite before you can track
              credits — the ledger is tied to their account.
            </p>
            <Link
              to={`/admin/students/${student.id}/edit`}
              className="mt-6 inline-block rounded-xl bg-forest px-5 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-sand transition hover:bg-forest/90"
            >
              Send the invite
            </Link>
          </div>
        )}
      </section>

      {/* ── History ── */}
      <section className="mt-10">
        <h2 className="font-display text-3xl tracking-[0.04em] text-forest">
          History
        </h2>
        <p className="mt-1 mb-4 text-sm text-ink/55">
          Every entry, newest first.
        </p>

        {history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-forest/25 bg-white/40 px-6 py-10 text-center">
            <p className="text-sm text-ink/55">
              Nothing on the ledger yet. The first entry you record lands here.
            </p>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-forest/12 bg-white/50">
            {history.map((c) => (
              <HistoryRow key={c.id} entry={c} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function HistoryRow({ entry }) {
  const positive = entry.delta > 0
  return (
    <li className="flex items-center justify-between gap-4 border-b border-forest/8 px-5 py-4 last:border-0">
      <div className="min-w-0">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink/45">
          {entry.reason ?? 'adjustment'}
        </p>
        {entry.note && (
          <p className="mt-1 truncate text-sm text-ink/75">{entry.note}</p>
        )}
        <p className="mt-1 text-xs text-ink/40">{formatDate(entry.created_at)}</p>
      </div>
      <span
        className={`shrink-0 font-display text-3xl tracking-wide tabular-nums ${
          positive ? 'text-forest' : 'text-ink/45'
        }`}
      >
        {positive ? '+' : ''}
        {entry.delta}
      </span>
    </li>
  )
}

function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function StatusBadge({ status }) {
  const cls = STATUSES[status] ?? 'bg-ink/10 text-ink/45'
  return (
    <span
      className={`inline-block rounded px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] ${cls}`}
    >
      {status}
    </span>
  )
}

function formatSessionWhen(ts) {
  const d = new Date(ts)
  return {
    date: d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    time: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  }
}

function SessionBadge({ status }) {
  const cls = SESSION_STATUSES[status] ?? 'bg-ink/10 text-ink/45'
  return (
    <span
      className={`inline-block rounded px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] ${cls}`}
    >
      {status}
    </span>
  )
}
