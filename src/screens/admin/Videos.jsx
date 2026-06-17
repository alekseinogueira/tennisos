// Admin → curated video library (/admin/videos). The GLOBAL, coach-owned shelf
// of technical reference videos (YouTube / external links) that any student can
// browse and the coach can attach to feedback. CRUD = create, list, delete (no
// file upload — these are links). Reads/writes via lib/db.js.
// 55TC styling: Bebas headings, uppercase tracked labels, forest/sand/ink only.
import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { listLibrary, createLibraryItem, deleteLibraryItem } from '../../lib/db'

const SOURCES = ['youtube', 'link']
// The 8 library folders (lowercase values match the student Library folder keys).
const CATEGORIES = [
  'forehand', 'backhand', 'footwork', 'serve',
  'volley', 'slice', 'smash', 'mentality',
]
const EMPTY = { title: '', category: '', external_url: '', source: 'youtube' }

export default function Videos() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const rows = await listLibrary()
        if (active) setItems(rows)
      } catch (e) {
        if (active) setError(e.message ?? 'Could not load the library.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleCreate(e) {
    e.preventDefault()
    setFormError(null)
    setSaving(true)
    try {
      const row = await createLibraryItem({
        coach_id: user?.id ?? null,
        title: form.title.trim(),
        category: form.category.trim() || null,
        external_url: form.external_url.trim(),
        source: form.source,
      })
      // Re-sort with the new row (category, then title) without a refetch.
      setItems((prev) =>
        [...prev, row].sort(
          (a, b) =>
            (a.category ?? '￿').localeCompare(b.category ?? '￿') ||
            (a.title ?? '').localeCompare(b.title ?? ''),
        ),
      )
      setForm(EMPTY)
    } catch (e) {
      setFormError(e.message ?? 'Could not add this video. Try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Remove "${item.title}" from the library?`)) return
    setDeletingId(item.id)
    setError(null)
    try {
      await deleteLibraryItem(item.id)
      setItems((prev) => prev.filter((v) => v.id !== item.id))
    } catch (e) {
      setError(e.message ?? 'Could not delete this video.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-ink/50">
          55TC · Admin
        </p>
        <h1 className="mt-2 font-display text-5xl tracking-[0.06em] text-forest">
          Video Library
        </h1>
        <p className="mt-3 text-ink/60">
          Technical references your whole crew can watch. Attach them to feedback.
        </p>
      </header>

      {/* ── Add form ── */}
      <form
        onSubmit={handleCreate}
        className="mb-8 rounded-2xl border border-forest/12 bg-white/50 p-6"
      >
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">
          Add a video
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Title"
            value={form.title}
            onChange={(v) => set('title', v)}
            required
            placeholder="e.g. Topspin forehand — fundamentals"
          />
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink/50">
              Category
            </span>
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className="mt-2 w-full rounded-xl border border-forest/15 bg-white/60 px-4 py-3 text-ink outline-none transition focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/10"
            >
              <option value="">— Uncategorized —</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c[0].toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Link (YouTube or URL)"
            type="url"
            value={form.external_url}
            onChange={(v) => set('external_url', v)}
            required
            placeholder="https://…"
          />
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink/50">
              Source
            </span>
            <select
              value={form.source}
              onChange={(e) => set('source', e.target.value)}
              className="mt-2 w-full rounded-xl border border-forest/15 bg-white/60 px-4 py-3 text-ink outline-none transition focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/10"
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </label>
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
          {saving ? 'Adding…' : 'Add to library'}
        </button>
      </form>

      {/* ── List ── */}
      {loading && <p className="text-sm text-ink/50">Loading the library…</p>}

      {error && !loading && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-forest/25 bg-white/40 px-6 py-14 text-center">
          <p className="font-display text-3xl tracking-[0.04em] text-forest">
            Empty shelf
          </p>
          <p className="mt-2 text-sm text-ink/55">
            Less Theory. More Game. Add your first reference video above.
          </p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-forest/12 bg-white/50">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-forest/12">
                <Th>Title</Th>
                <Th>Category</Th>
                <Th>Source</Th>
                <Th className="text-right">Remove</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((v) => (
                <tr
                  key={v.id}
                  className="border-b border-forest/8 last:border-0 transition hover:bg-white"
                >
                  <td className="px-5 py-4">
                    <a
                      href={v.external_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-ink underline-offset-4 transition hover:text-forest hover:underline"
                    >
                      {v.title}
                    </a>
                  </td>
                  <td className="px-5 py-4 text-sm text-ink/65">
                    {v.category || '—'}
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-block rounded px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-forest border border-forest/40">
                      {v.source}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(v)}
                      disabled={deletingId === v.id}
                      className="text-xs font-semibold uppercase tracking-[0.15em] text-red-700 underline-offset-4 transition hover:underline disabled:opacity-50"
                    >
                      {deletingId === v.id ? 'Removing…' : 'Remove'}
                    </button>
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

function Field({ label, type = 'text', value, onChange, required, placeholder }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink/50">
        {label}
      </span>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-forest/15 bg-white/60 px-4 py-3 text-ink outline-none transition placeholder:text-ink/30 focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/10"
      />
    </label>
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
