// Coach HQ → "Upcoming Trainings" management block (Fase F1, Etapa 2).
// Groups the next-14-days session rows by group_id (legacy solo rows = a group
// of one) into one card per training: date · time · duration · location ·
// stacked roster. EDIT opens a modal (date/time/duration/location) that updates
// every scheduled row of the group and re-emails each player ('rescheduled');
// CANCEL soft-cancels the group (status='cancelled') and emails a cancellation
// notice. Email failures never undo the DB change — the toast reports the real
// send count, same honest pattern as the Schedule Training block (Etapa 1).
// 55TC styling: Bebas headings, uppercase tracked labels, forest/sand/ink only.
import { useEffect, useState } from 'react'
import { updateSessions, cancelSessions } from '../lib/db'

// Bookable times: 30-min increments, 07:00–21:00 inclusive (same as Etapa 1).
const TIMES = (() => {
  const out = []
  for (let h = 7; h <= 21; h++) {
    out.push(`${String(h).padStart(2, '0')}:00`)
    if (h < 21) out.push(`${String(h).padStart(2, '0')}:30`)
  }
  return out
})()
const DURATIONS = [60, 90]

const EMAIL_ENDPOINT =
  'https://vdyvlylacsghnvtllrzj.supabase.co/functions/v1/send-session-reminder'

// One notification per player; kind = 'rescheduled' | 'cancelled'.
function sendSessionEmail(row, session, kind) {
  return fetch(EMAIL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      student_name: row.student?.full_name ?? 'Player',
      student_email: row.student?.email,
      scheduled_at: session.scheduled_at,
      duration_minutes: session.duration_minutes,
      location: session.location,
      kind,
    }),
  }).then((res) => {
    if (!res.ok) throw new Error(`email ${res.status}`)
  })
}

function pad(n) {
  return String(n).padStart(2, '0')
}
function toLocalDate(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function toLocalTime(iso) {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function formatWhen(iso) {
  const d = new Date(iso)
  return {
    day: d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    time: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  }
}

function initialOf(name) {
  return (name ?? '?').trim().charAt(0).toUpperCase() || '?'
}

function Avatar({ name }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest font-display text-xs text-sand ring-2 ring-sand"
    >
      {initialOf(name)}
    </span>
  )
}

// One card per training: rows sharing a group_id (or a solo legacy row).
// active = the still-scheduled rows (edit/cancel/emails operate on these);
// a training whose rows are all cancelled renders dimmed with no actions.
function groupTrainings(rows) {
  const map = new Map()
  for (const r of rows) {
    const key = r.group_id ?? `solo-${r.id}`
    if (!map.has(key)) map.set(key, { key, rows: [] })
    map.get(key).rows.push(r)
  }
  return [...map.values()].map((g) => {
    const active = g.rows.filter((r) => r.status === 'scheduled')
    return { ...g, active, first: active[0] ?? g.rows[0] }
  })
}

export default function UpcomingTrainingsCard({ sessions, onChanged }) {
  const [editing, setEditing] = useState(null) // a group, or null
  const [busyKey, setBusyKey] = useState(null) // group being cancelled
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(null)

  const groups = groupTrainings(sessions ?? [])

  async function handleCancel(group) {
    const n = group.active.length
    const who = n > 1 ? `${n} players` : group.first.student?.full_name ?? 'the player'
    if (!window.confirm(`Cancel this training? ${who} will be emailed.`)) return
    setError(null)
    setOk(null)
    setBusyKey(group.key)
    try {
      await cancelSessions(group.active.map((r) => r.id))
      const sends = await Promise.allSettled(
        group.active.map((r) => sendSessionEmail(r, group.first, 'cancelled')),
      )
      const sent = sends.filter((r) => r.status === 'fulfilled').length
      if (sent < n) console.error('Some cancellation emails failed:', sends)
      setOk(
        sent === n
          ? 'Training cancelled. Players emailed.'
          : `Training cancelled — emails sent ${sent}/${n}.`,
      )
      onChanged?.()
    } catch (e) {
      setError(e?.message ?? 'Could not cancel that training. Try again.')
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <section className="mt-10">
      <h2 className="mb-4 font-display text-3xl tracking-[0.04em] text-forest">
        Upcoming Trainings
      </h2>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {ok && (
        <p className="mb-4 rounded-lg bg-forest/10 px-3 py-2 text-sm text-forest">
          {ok}
        </p>
      )}

      {sessions === null ? (
        <div className="rounded-2xl border border-forest/12 bg-white/50 px-6 py-8 text-center">
          <p className="text-sm text-ink/45">Loading trainings…</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-forest/25 bg-white/40 px-6 py-8 text-center">
          <p className="text-sm text-ink/55">
            Nothing on the calendar for the next 14 days. Schedule a training
            above.
          </p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-forest/12 bg-white/50">
          {groups.map((g) => {
            const cancelled = g.active.length === 0
            const when = formatWhen(g.first.scheduled_at)
            const names = g.rows
              .map((r) => r.student?.full_name ?? 'Player')
              .join(', ')
            return (
              <li
                key={g.key}
                className={`border-b border-forest/8 px-5 py-4 last:border-0 ${
                  cancelled ? 'opacity-55' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p
                      className={`font-display text-2xl tracking-[0.03em] text-forest ${
                        cancelled ? 'line-through' : ''
                      }`}
                    >
                      {when.day} · {when.time}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-ink/60">
                      {g.first.duration_minutes} min
                      {g.first.location ? ` · ${g.first.location}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {cancelled ? (
                      <span className="inline-block rounded bg-ink/10 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink/40">
                        cancelled
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditing(g)}
                          className="text-xs font-semibold uppercase tracking-[0.15em] text-forest underline-offset-4 transition hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancel(g)}
                          disabled={busyKey === g.key}
                          className="text-xs font-semibold uppercase tracking-[0.15em] text-ink/45 underline-offset-4 transition hover:text-red-700 hover:underline disabled:opacity-60"
                        >
                          {busyKey === g.key ? 'Cancelling…' : 'Cancel'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-2.5">
                  <div className="flex">
                    {g.rows.map((r, i) => (
                      <span key={r.id} className={i > 0 ? '-ml-2' : ''}>
                        <Avatar name={r.student?.full_name} />
                      </span>
                    ))}
                  </div>
                  <p className="min-w-0 truncate text-sm text-ink/70">{names}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {editing && (
        <EditTrainingModal
          group={editing}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setEditing(null)
            setError(null)
            setOk(msg)
            onChanged?.()
          }}
        />
      )}
    </section>
  )
}

function EditTrainingModal({ group, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    date: toLocalDate(group.first.scheduled_at),
    time: toLocalTime(group.first.scheduled_at),
    duration: group.first.duration_minutes ?? 60,
    location: group.first.location ?? '',
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function setF(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!form.date || !form.time) {
      setError('Pick a date and a time.')
      return
    }
    // Local date + time → instant; stored as UTC (timestamptz), same as Etapa 1.
    const scheduledAt = new Date(`${form.date}T${form.time}`)
    if (Number.isNaN(scheduledAt.getTime())) {
      setError('That date/time didn’t parse. Try again.')
      return
    }

    setSaving(true)
    try {
      const patch = {
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: form.duration,
        location: form.location.trim() || null,
      }
      await updateSessions(
        group.active.map((r) => r.id),
        patch,
      )
      const sends = await Promise.allSettled(
        group.active.map((r) => sendSessionEmail(r, patch, 'rescheduled')),
      )
      const sent = sends.filter((r) => r.status === 'fulfilled').length
      const n = group.active.length
      if (sent < n) console.error('Some reschedule emails failed:', sends)
      onSaved(
        sent === n
          ? 'Training updated. Players emailed.'
          : `Training updated — emails sent ${sent}/${n}.`,
      )
    } catch (e2) {
      setError(e2?.message ?? 'Could not update that training. Try again.')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit training"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-sand p-5 shadow-xl sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="font-display text-3xl tracking-[0.04em] text-forest">
            Edit Training
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded px-2 py-1 text-sm text-ink/45 transition hover:text-ink"
          >
            ✕
          </button>
        </div>

        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-ink/50">
          {group.active.length} player{group.active.length > 1 ? 's' : ''} — a
          new confirmation email goes out on save.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink/50">
                Date
              </span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setF('date', e.target.value)}
                required
                className="mt-2 w-full rounded-xl border border-forest/15 bg-white/60 px-4 py-3 text-ink outline-none transition focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/10"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink/50">
                Time
              </span>
              <select
                value={form.time}
                onChange={(e) => setF('time', e.target.value)}
                required
                className="mt-2 w-full rounded-xl border border-forest/15 bg-white/60 px-4 py-3 text-ink outline-none transition focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/10"
              >
                {!TIMES.includes(form.time) && (
                  <option value={form.time}>{form.time}</option>
                )}
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
                    onClick={() => setF('duration', d)}
                    className={`rounded-xl px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.1em] transition ${
                      form.duration === d
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
                  value={form.location}
                  onChange={(e) => setF('location', e.target.value)}
                  placeholder="Stanley Park Court 3"
                  className="mt-2 w-full rounded-xl border border-forest/15 bg-white/60 px-4 py-3 text-ink outline-none transition placeholder:text-ink/30 focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/10"
                />
              </label>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-forest/20 px-6 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-forest transition hover:bg-forest/5"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-forest px-6 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-sand transition hover:bg-forest/90 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save & email players'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
