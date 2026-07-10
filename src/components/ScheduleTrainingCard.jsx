// Coach HQ → "Schedule Training" quick-action block (Fase F1, Etapa 1).
// WhatsApp-group-style multi-student picker: tap active students to build the
// roster (selected avatars stack at the top), then date / time / duration /
// location → one batch INSERT into sessions (one row per student, shared
// group_id) + a confirmation email per student via the existing
// send-session-reminder Edge Function. Email failures never undo the sessions —
// the toast reports the real send count, same honest pattern as StudentDetail.
// 55TC styling: Bebas headings, uppercase tracked labels, forest/sand/ink only.
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { listActiveStudents, createSessionsGroup } from '../lib/db'

// Bookable times: 30-min increments, 07:00–21:00 inclusive (same as StudentDetail).
const TIMES = (() => {
  const out = []
  for (let h = 7; h <= 21; h++) {
    out.push(`${String(h).padStart(2, '0')}:00`)
    if (h < 21) out.push(`${String(h).padStart(2, '0')}:30`)
  }
  return out
})()
const DURATIONS = [60, 90]
const EMPTY_FORM = { date: '', time: '', duration: 60, location: '' }

function initialOf(name) {
  return (name ?? '?').trim().charAt(0).toUpperCase() || '?'
}

function Avatar({ name, size = 'h-9 w-9 text-sm' }) {
  return (
    <span
      aria-hidden="true"
      className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-forest font-display text-sand ring-2 ring-sand`}
    >
      {initialOf(name)}
    </span>
  )
}

export default function ScheduleTrainingCard({ onScheduled }) {
  const { user } = useAuth()
  const [students, setStudents] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const rows = await listActiveStudents()
        if (alive) setStudents(rows)
      } catch (e) {
        if (alive) setLoadError(e?.message ?? 'Could not load the roster.')
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function setF(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setOk(null)

    const picked = (students ?? []).filter((s) => selected.has(s.id))
    if (picked.length === 0) {
      setError('Pick at least one player.')
      return
    }
    if (!form.date || !form.time) {
      setError('Pick a date and a time.')
      return
    }
    // Local date + time → instant; stored as UTC (timestamptz), same as StudentDetail.
    const scheduledAt = new Date(`${form.date}T${form.time}`)
    if (Number.isNaN(scheduledAt.getTime())) {
      setError('That date/time didn’t parse. Try again.')
      return
    }

    setSaving(true)
    try {
      const groupId = crypto.randomUUID()
      const rows = await createSessionsGroup(
        picked.map((s) => ({
          student_id: s.id,
          user_id: s.user_id, // may be null (unclaimed) — email still sends
          coach_id: user?.id ?? null,
          scheduled_at: scheduledAt.toISOString(),
          duration_minutes: form.duration,
          location: form.location.trim() || null,
          status: 'scheduled',
          group_id: groupId,
        })),
      )

      // One confirmation email per player; report the real send count.
      const sends = await Promise.allSettled(
        picked.map((s) =>
          fetch(
            'https://vdyvlylacsghnvtllrzj.supabase.co/functions/v1/send-session-reminder',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                student_name: s.full_name,
                student_email: s.email,
                scheduled_at: scheduledAt.toISOString(),
                duration_minutes: form.duration,
                location: form.location.trim() || null,
              }),
            },
          ).then((res) => {
            if (!res.ok) throw new Error(`email ${res.status}`)
          }),
        ),
      )
      const sent = sends.filter((r) => r.status === 'fulfilled').length
      if (sent < picked.length)
        console.error('Some confirmation emails failed:', sends)

      setSelected(new Set())
      setForm(EMPTY_FORM)
      setOk(
        sent === picked.length
          ? `Training scheduled for ${picked.length} player${picked.length > 1 ? 's' : ''}. Emails sent.`
          : `Training scheduled for ${picked.length} player${picked.length > 1 ? 's' : ''} — emails sent ${sent}/${picked.length}.`,
      )
      onScheduled?.(rows)
    } catch (e) {
      setError(e?.message ?? 'Could not schedule that. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const picked = (students ?? []).filter((s) => selected.has(s.id))

  return (
    <section className="mt-10">
      <h2 className="mb-4 font-display text-3xl tracking-[0.04em] text-forest">
        Schedule Training
      </h2>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-forest/12 bg-white/50 p-5 sm:p-6"
      >
        {/* ── Selected roster (stacked avatars) ── */}
        <div className="mb-4 flex min-h-11 items-center gap-3">
          {picked.length === 0 ? (
            <p className="text-sm text-ink/45">
              Tap players below to build the group.
            </p>
          ) : (
            <>
              <div className="flex">
                {picked.map((s, i) => (
                  <span key={s.id} className={i > 0 ? '-ml-2' : ''}>
                    <Avatar name={s.full_name} />
                  </span>
                ))}
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-forest">
                {picked.length} player{picked.length > 1 ? 's' : ''}
              </p>
            </>
          )}
        </div>

        {/* ── Player picker ── */}
        {loadError ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {loadError}
          </p>
        ) : students && students.length === 0 ? (
          <p className="rounded-lg border border-dashed border-forest/25 px-3 py-4 text-center text-sm text-ink/55">
            No active students yet. Add one from the roster first.
          </p>
        ) : (
          <ul className="max-h-56 overflow-y-auto rounded-xl border border-forest/12 bg-white/60">
            {(students ?? []).map((s) => {
              const isOn = selected.has(s.id)
              return (
                <li key={s.id} className="border-b border-forest/8 last:border-0">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isOn}
                    onClick={() => toggle(s.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-forest/5"
                  >
                    <Avatar name={s.full_name} size="h-8 w-8 text-xs" />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink/85">
                      {s.full_name}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[0.65rem] transition ${
                        isOn
                          ? 'border-forest bg-forest text-sand'
                          : 'border-forest/25 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                  </button>
                </li>
              )
            })}
            {students === null && (
              <li className="px-4 py-3 text-sm text-ink/45">Loading roster…</li>
            )}
          </ul>
        )}

        {/* ── When & where ── */}
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
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
        {ok && (
          <p className="mt-4 rounded-lg bg-forest/10 px-3 py-2 text-sm text-forest">
            {ok}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-5 w-full rounded-xl bg-forest px-6 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-sand transition hover:bg-forest/90 disabled:opacity-60 sm:w-auto"
        >
          {saving ? 'Scheduling…' : 'Schedule training'}
        </button>
      </form>
    </section>
  )
}
