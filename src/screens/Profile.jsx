// Student profile (/profile) — a read-only view of the player's own roster row:
// full name, email, phone, status. RLS narrows the query to their own row, so a
// student can ONLY ever see themselves here. Edit is not built yet. 55TC tokens
// only: forest, sand, ink · Bebas Neue display · DM Sans body.
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { getStudentByUserId } from '../lib/db'

const STATUSES = {
  active: 'bg-forest text-sand',
  invited: 'border border-forest/40 text-forest',
  inactive: 'bg-ink/10 text-ink/45',
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

export default function Profile() {
  const { user, profile } = useAuth()
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return
    let active = true
    ;(async () => {
      try {
        // RLS: a student only ever resolves their own row.
        const s = await getStudentByUserId(user.id)
        if (active) setStudent(s)
      } catch (e) {
        if (active) setError(e.message ?? 'Could not load your profile.')
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
          Profile
        </h1>
        <p className="mt-3 text-ink/60">Your details on file with the crew.</p>
      </header>

      {loading && <p className="text-sm text-ink/50">Loading your profile…</p>}

      {error && !loading && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && !student && (
        <div className="rounded-2xl border border-dashed border-forest/25 bg-white/40 px-6 py-14 text-center">
          <p className="font-display text-3xl tracking-[0.04em] text-forest">
            Nothing here yet
          </p>
          <p className="mt-2 text-sm text-ink/55">
            Your profile isn't set up yet. Reach out to your coach to get rolling.
          </p>
        </div>
      )}

      {!loading && !error && student && (
        <dl className="overflow-hidden rounded-2xl border border-forest/12 bg-white/50">
          <Row label="Full name">{student.full_name || '—'}</Row>
          <Row label="Email">{student.email || profile?.email || '—'}</Row>
          <Row label="Phone">{student.phone || '—'}</Row>
          <Row label="Status">
            <StatusBadge status={student.status} />
          </Row>
        </dl>
      )}
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-forest/8 px-5 py-4 last:border-0">
      <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink/45">
        {label}
      </dt>
      <dd className="text-right text-ink">{children}</dd>
    </div>
  )
}
