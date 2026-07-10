// Coach HQ — the coach's operational home at /coach. Built in phases:
// metrics row (Step 1) → upcoming trainings (Fase F1) → feedback due → activity feed.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  countActiveStudents,
  countSessionsThisMonth,
  countFeedbacksThisMonth,
  listPendingFeedback,
  listUpcomingSessions14d,
  listRecentActivity,
} from '../lib/db'
import ScheduleTrainingCard from '../components/ScheduleTrainingCard'
import UpcomingTrainingsCard from '../components/UpcomingTrainingsCard'

export default function CoachDashboard() {
  const [metrics, setMetrics] = useState(null)
  const [upcoming, setUpcoming] = useState(null)
  const [due, setDue] = useState(null)
  const [activity, setActivity] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [active, sessions, feedbacks, dueRows, upcomingRows, activityRows] =
          await Promise.all([
            countActiveStudents(),
            countSessionsThisMonth(),
            countFeedbacksThisMonth(),
            listPendingFeedback(),
            listUpcomingSessions14d(),
            listRecentActivity(),
          ])
        if (!alive) return
        setMetrics({ active, sessions, feedbacks })
        setDue(dueRows)
        setUpcoming(upcomingRows)
        setActivity(activityRows)
      } catch (e) {
        if (alive) setErr(e?.message ?? 'Could not load the dashboard.')
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  async function refreshUpcoming() {
    try {
      setUpcoming(await listUpcomingSessions14d())
    } catch {
      // keep the stale list — the DB change already happened
    }
  }

  return (
    <div>
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-ink/50">
          55TC · HQ
        </p>
        <h1 className="mt-2 font-display text-5xl tracking-[0.06em] text-forest">
          Headquarters
        </h1>
        <p className="mt-3 max-w-md text-ink/60">
          Less Theory. More Game. Your week at a glance.
        </p>
      </header>

      {err && (
        <p className="mb-6 rounded-lg border border-forest/15 bg-white/60 px-4 py-3 text-sm text-ink/70">
          {err}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Active Students" value={metrics?.active} />
        <MetricCard label="Sessions This Month" value={metrics?.sessions} />
        <MetricCard label="Feedbacks This Month" value={metrics?.feedbacks} />
        <MetricCard
          label="Pending Feedback"
          value={due?.length}
          highlight={due?.length > 0}
        />
      </div>

      <ScheduleTrainingCard onScheduled={refreshUpcoming} />

      <UpcomingTrainingsCard sessions={upcoming} onChanged={refreshUpcoming} />

      <section className="mt-10">
        <h2 className="mb-4 font-display text-3xl tracking-[0.04em] text-forest">
          Feedback Due
        </h2>

        {due && due.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-forest/25 bg-white/40 px-6 py-8 text-center">
            <p className="text-sm text-ink/55">
              You’re all caught up. No feedback owed.
            </p>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-forest/12 bg-white/50">
            {(due ?? []).map((d) => (
              <li
                key={d.student_id}
                className="flex items-center justify-between gap-4 border-b border-forest/8 px-5 py-4 last:border-0"
              >
                <div className="min-w-0">
                  <p className="font-display text-2xl tracking-[0.03em] text-forest">
                    {d.student_name}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-ink/60">
                    Session {formatWhen(d.session_at).day}
                    {d.location ? ` · ${d.location}` : ''}
                  </p>
                </div>
                <Link
                  to={`/admin/students/${d.student_id}/feedback/new`}
                  className="shrink-0 text-xs font-semibold uppercase tracking-[0.15em] text-forest underline-offset-4 transition hover:underline"
                >
                  Write Feedback →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-3xl tracking-[0.04em] text-forest">
          Recent Activity
        </h2>

        {activity && activity.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-forest/25 bg-white/40 px-6 py-8 text-center">
            <p className="text-sm text-ink/55">
              Nothing yet. Schedule a session or write some feedback.
            </p>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-forest/12 bg-white/50">
            {(activity ?? []).map((a) => {
              const isFeedback = a.kind === 'feedback'
              const desc = isFeedback
                ? a.title || 'New feedback'
                : `Session ${formatWhen(a.scheduled_at).day}${
                    a.location ? ` · ${a.location}` : ''
                  }`
              return (
                <li
                  key={a.id}
                  className="flex items-center gap-3 border-b border-forest/8 px-5 py-3 last:border-0"
                >
                  <span aria-hidden="true" className="text-lg leading-none">
                    {isFeedback ? '📋' : '🎾'}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-sm text-ink/70">
                    <span className="font-medium text-ink/90">{a.student_name}</span>
                    {' — '}
                    {desc}
                  </p>
                  <span className="shrink-0 text-xs text-ink/45">
                    {formatWhen(a.at).day}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function MetricCard({ label, value, highlight }) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        highlight
          ? 'border-forest bg-forest text-sand'
          : 'border-forest/12 bg-white/60 text-forest'
      }`}
    >
      <p className="font-display text-5xl leading-none tracking-[0.02em]">
        {value ?? '—'}
      </p>
      <p
        className={`mt-3 text-[0.7rem] font-semibold uppercase tracking-[0.2em] ${
          highlight ? 'text-sand/70' : 'text-ink/50'
        }`}
      >
        {label}
      </p>
    </div>
  )
}

function formatWhen(ts) {
  const d = new Date(ts)
  return {
    day: d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    time: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  }
}
