// Admin → create / edit a roster student. One screen, two modes (detected by a
// :id param). CREATE inserts the roster row with user_id NULL — the student is
// "invited" until they claim the invite, at which point handle_new_user links
// the auth user. No credit field here by design: credits are only ever added
// later via a real transaction (manual adjustment or package purchase).
// 55TC styling: Bebas headings, uppercase tracked labels, forest/sand/ink.
import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { createStudent, getStudent, updateStudent } from '../../lib/db'
import InvitePanel from '../../components/InvitePanel'

const STATUSES = ['invited', 'active', 'inactive']

const EMPTY = { full_name: '', email: '', phone: '', status: 'invited' }

export default function StudentForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()

  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(editing) // only edit needs a fetch
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState(null) // the new row → triggers invite panel

  useEffect(() => {
    if (!editing) return
    let active = true
    ;(async () => {
      try {
        const s = await getStudent(id)
        if (!active) return
        setForm({
          full_name: s.full_name ?? '',
          email: s.email ?? '',
          phone: s.phone ?? '',
          status: s.status ?? 'invited',
        })
      } catch (e) {
        if (active) setError(e.message ?? 'Could not load this student.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [editing, id])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      status: form.status,
    }
    try {
      if (editing) {
        await updateStudent(id, payload)
        navigate('/admin/students')
      } else {
        // user_id stays NULL until the invite is claimed; stamp the creating coach.
        const row = await createStudent({ ...payload, created_by: user?.id ?? null })
        // Coach creates student → invite email fires automatically. Best-effort:
        // the copyable claim link in InvitePanel below is the fallback if it fails.
        const inviteLink = `${window.location.origin}/claim?email=${encodeURIComponent(row.email)}`
        fetch('https://vdyvlylacsghnvtllrzj.supabase.co/functions/v1/send-invite-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            student_name: row.full_name,
            student_email: row.email,
            invite_link: inviteLink,
          }),
        }).catch((err) => console.error('Invite email failed to send:', err))
        // Stay on-screen and surface the copyable invite link for the new student.
        setCreated(row)
        setSaving(false)
      }
    } catch (e) {
      setError(e.message ?? 'Could not save. Try again.')
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-ink/50">Loading…</p>
  }

  // Create succeeded → show the invite link for the new student.
  if (created) {
    return (
      <div className="max-w-xl">
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-ink/50">
            55TC · Admin
          </p>
          <h1 className="mt-2 font-display text-5xl tracking-[0.06em] text-forest">
            Student Created
          </h1>
          <p className="mt-3 text-ink/60">Less Theory. More Game. Send the invite.</p>
        </header>

        <InvitePanel student={created}>
          <button
            type="button"
            onClick={() => {
              setCreated(null)
              setForm(EMPTY)
            }}
            className="text-sm font-semibold uppercase tracking-[0.15em] text-forest underline-offset-4 transition hover:underline"
          >
            Add another
          </button>
          <Link
            to="/admin/students"
            className="text-sm text-ink/60 underline-offset-4 transition hover:text-forest hover:underline"
          >
            Back to roster
          </Link>
        </InvitePanel>
      </div>
    )
  }

  return (
    <div className="max-w-xl">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-ink/50">
          55TC · Admin
        </p>
        <h1 className="mt-2 font-display text-5xl tracking-[0.06em] text-forest">
          {editing ? 'Edit Student' : 'New Student'}
        </h1>
        <p className="mt-3 text-ink/60">
          {editing
            ? 'Update roster details.'
            : 'Add a player to the roster. Send the invite next.'}
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field
          label="Full name"
          value={form.full_name}
          onChange={(v) => set('full_name', v)}
          required
          autoComplete="name"
        />
        <Field
          label="Email"
          type="email"
          value={form.email}
          onChange={(v) => set('email', v)}
          required
          autoComplete="email"
        />
        <Field
          label="Phone"
          type="tel"
          value={form.phone}
          onChange={(v) => set('phone', v)}
          autoComplete="tel"
        />

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink/50">
            Status
          </span>
          <select
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
            className="mt-2 w-full rounded-xl border border-forest/15 bg-white/60 px-4 py-3 text-ink outline-none transition focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/10"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-forest px-6 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-sand transition hover:bg-forest/90 disabled:opacity-60"
          >
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create student'}
          </button>
          <Link
            to="/admin/students"
            className="text-sm text-ink/60 underline-offset-4 transition hover:text-forest hover:underline"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

function Field({ label, type = 'text', value, onChange, required, autoComplete }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink/50">
        {label}
      </span>
      <input
        type={type}
        required={required}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-forest/15 bg-white/60 px-4 py-3 text-ink outline-none transition placeholder:text-ink/30 focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/10"
      />
    </label>
  )
}
