// Admin → Students roster table. Reads the whole roster + credit balances via
// lib/db.js (RLS gives the coach every row). Columns: name, email, status, and
// the live credit balance. 55TC styling: Bebas headings, uppercase tracked
// labels, forest/sand/ink only, flat surfaces, humanized empty/error states.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listStudents, getCreditBalances } from '../../lib/db'

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

export default function Students() {
  const [students, setStudents] = useState([])
  const [balances, setBalances] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [roster, bal] = await Promise.all([
          listStudents(),
          getCreditBalances(),
        ])
        if (!active) return
        setStudents(roster)
        setBalances(bal)
      } catch (e) {
        if (active) setError(e.message ?? 'Could not load the roster.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  return (
    <div>
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-ink/50">
            55TC · Admin
          </p>
          <h1 className="mt-2 font-display text-5xl tracking-[0.06em] text-forest">
            Students
          </h1>
          <p className="mt-3 text-ink/60">Your roster, credits, and invites.</p>
        </div>
        <Link
          to="/admin/students/new"
          className="shrink-0 rounded-xl bg-forest px-5 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-sand transition hover:bg-forest/90"
        >
          New Student
        </Link>
      </header>

      {loading && <p className="text-sm text-ink/50">Loading the roster…</p>}

      {error && !loading && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && students.length === 0 && (
        <div className="rounded-2xl border border-dashed border-forest/25 bg-white/40 px-6 py-14 text-center">
          <p className="font-display text-3xl tracking-[0.04em] text-forest">
            No players yet
          </p>
          <p className="mt-2 text-sm text-ink/55">
            Less Theory. More Game. Add your first student to get the crew rolling.
          </p>
          <Link
            to="/admin/students/new"
            className="mt-6 inline-block rounded-xl bg-forest px-5 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-sand transition hover:bg-forest/90"
          >
            New Student
          </Link>
        </div>
      )}

      {!loading && !error && students.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-forest/12 bg-white/50">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-forest/12">
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Status</Th>
                <Th className="text-right">Credits</Th>
                <Th className="text-right">Edit</Th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-forest/8 last:border-0 transition hover:bg-white"
                >
                  <td className="px-5 py-4 font-medium text-ink">
                    {s.full_name}
                  </td>
                  <td className="px-5 py-4 text-sm text-ink/65">{s.email}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-5 py-4 text-right font-display text-2xl tracking-wide text-forest tabular-nums">
                    {balances[s.id] ?? 0}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      to={`/admin/students/${s.id}/edit`}
                      className="text-xs font-semibold uppercase tracking-[0.15em] text-forest underline-offset-4 transition hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Th({ children, className = '' }) {
  return (
    <th
      className={`px-5 py-3 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink/45 ${className}`}
    >
      {children}
    </th>
  )
}
