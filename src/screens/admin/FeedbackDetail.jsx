// Admin → attach videos to a feedback entry (/admin/students/:id/feedback/:fid).
// After writing feedback, the coach links references to it from TWO sources:
//   • Curated library — global reference clips any student can watch.
//   • Student gallery — that player's own private lesson footage.
// Both write to their join tables, stamping the denormalized student subject
// (user_id) so the student's RLS sees the link. No file upload yet, so gallery
// clips are added by pasting a Drive/YouTube URL (and auto-attached on add).
// 55TC styling: Bebas headings, uppercase tracked labels, forest/sand/ink only.
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import {
  getFeedback,
  getStudent,
  listLibrary,
  listGalleryForStudent,
  listLibraryForFeedback,
  listGalleryForFeedback,
  linkLibraryToFeedback,
  unlinkLibraryFromFeedback,
  linkGalleryToFeedback,
  unlinkGalleryFromFeedback,
  createGalleryClip,
} from '../../lib/db'

const SOURCES = ['youtube', 'link']
const EMPTY_CLIP = { title: '', external_url: '', source: 'youtube' }

export default function FeedbackDetail() {
  const { id, fid } = useParams()
  const { user } = useAuth()

  const [feedback, setFeedback] = useState(null)
  const [student, setStudent] = useState(null)
  const [library, setLibrary] = useState([])
  const [gallery, setGallery] = useState([])
  const [linkedLibrary, setLinkedLibrary] = useState(() => new Set())
  const [linkedGallery, setLinkedGallery] = useState(() => new Set())

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null) // id mid-toggle

  const [clip, setClip] = useState(EMPTY_CLIP)
  const [clipSaving, setClipSaving] = useState(false)
  const [clipError, setClipError] = useState(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [fb, st, lib, gal, linkedLib, linkedGal] = await Promise.all([
          getFeedback(fid),
          getStudent(id),
          listLibrary(),
          listGalleryForStudent(id),
          listLibraryForFeedback(fid),
          listGalleryForFeedback(fid),
        ])
        if (!active) return
        setFeedback(fb)
        setStudent(st)
        setLibrary(lib)
        setGallery(gal)
        setLinkedLibrary(new Set(linkedLib.map((v) => v.id)))
        setLinkedGallery(new Set(linkedGal.map((v) => v.id)))
      } catch (e) {
        if (active) setError(e.message ?? 'Could not load this feedback.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [id, fid])

  async function toggleLibrary(item) {
    setBusyId(item.id)
    setError(null)
    try {
      if (linkedLibrary.has(item.id)) {
        await unlinkLibraryFromFeedback(fid, item.id)
        setLinkedLibrary((prev) => {
          const n = new Set(prev)
          n.delete(item.id)
          return n
        })
      } else {
        await linkLibraryToFeedback({
          feedbackId: fid,
          libraryId: item.id,
          userId: feedback.user_id,
        })
        setLinkedLibrary((prev) => new Set(prev).add(item.id))
      }
    } catch (e) {
      setError(e.message ?? 'Could not update that link.')
    } finally {
      setBusyId(null)
    }
  }

  async function toggleGallery(item) {
    setBusyId(item.id)
    setError(null)
    try {
      if (linkedGallery.has(item.id)) {
        await unlinkGalleryFromFeedback(fid, item.id)
        setLinkedGallery((prev) => {
          const n = new Set(prev)
          n.delete(item.id)
          return n
        })
      } else {
        await linkGalleryToFeedback({
          feedbackId: fid,
          galleryId: item.id,
          userId: feedback.user_id,
        })
        setLinkedGallery((prev) => new Set(prev).add(item.id))
      }
    } catch (e) {
      setError(e.message ?? 'Could not update that link.')
    } finally {
      setBusyId(null)
    }
  }

  async function addClip(e) {
    e.preventDefault()
    setClipError(null)
    setClipSaving(true)
    try {
      const row = await createGalleryClip({
        student_id: student.id,
        user_id: student.user_id,
        coach_id: user?.id ?? null,
        title: clip.title.trim() || null,
        external_url: clip.external_url.trim(),
        source: clip.source,
      })
      setGallery((prev) => [row, ...prev])
      // Added in this context → attach it to the feedback right away.
      await linkGalleryToFeedback({
        feedbackId: fid,
        galleryId: row.id,
        userId: feedback.user_id,
      })
      setLinkedGallery((prev) => new Set(prev).add(row.id))
      setClip(EMPTY_CLIP)
    } catch (e) {
      setClipError(e.message ?? 'Could not add this clip. Try again.')
    } finally {
      setClipSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-ink/50">Loading…</p>

  if (error && !feedback) {
    return (
      <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
    )
  }

  return (
    <div className="max-w-3xl">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-ink/50">
          55TC · Feedback · {student?.full_name}
        </p>
        <h1 className="mt-2 font-display text-5xl tracking-[0.06em] text-forest">
          {feedback?.title || 'Untitled'}
        </h1>
        {feedback?.lesson_date && (
          <p className="mt-3 text-sm uppercase tracking-[0.2em] text-ink/45">
            {feedback.lesson_date}
          </p>
        )}
      </header>

      {/* ── The note itself (read-only recap) ── */}
      <section className="mb-8 rounded-2xl border border-forest/12 bg-white/50 p-6">
        <p className="whitespace-pre-wrap text-ink/80">{feedback?.body}</p>
      </section>

      {error && (
        <p className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* ── Curated library ── */}
      <section className="mb-8">
        <h2 className="font-display text-3xl tracking-[0.04em] text-forest">
          Curated Library
        </h2>
        <p className="mt-1 mb-4 text-sm text-ink/55">
          Reference clips from your shelf. Tap to attach.
        </p>

        {library.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-forest/25 bg-white/40 px-6 py-10 text-center">
            <p className="text-sm text-ink/55">
              Your library is empty.{' '}
              <Link
                to="/admin/videos"
                className="font-semibold text-forest underline-offset-4 hover:underline"
              >
                Add reference videos
              </Link>{' '}
              first.
            </p>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-forest/12 bg-white/50">
            {library.map((item) => (
              <AttachRow
                key={item.id}
                title={item.title}
                meta={item.category || item.source}
                url={item.external_url}
                attached={linkedLibrary.has(item.id)}
                busy={busyId === item.id}
                onToggle={() => toggleLibrary(item)}
              />
            ))}
          </ul>
        )}
      </section>

      {/* ── Student gallery ── */}
      <section className="mb-8">
        <h2 className="font-display text-3xl tracking-[0.04em] text-forest">
          {student?.full_name?.split(/\s+/)[0]}'s Gallery
        </h2>
        <p className="mt-1 mb-4 text-sm text-ink/55">
          Their own lesson footage — private to them. Paste a Drive/YouTube link to add.
        </p>

        {/* Add-clip form (no upload yet → URL paste, auto-attached) */}
        <form
          onSubmit={addClip}
          className="mb-4 rounded-2xl border border-forest/12 bg-white/50 p-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <ClipField
              label="Title"
              value={clip.title}
              onChange={(v) => setClip((c) => ({ ...c, title: v }))}
              placeholder="e.g. Serve — side angle"
            />
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink/50">
                Source
              </span>
              <select
                value={clip.source}
                onChange={(e) => setClip((c) => ({ ...c, source: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-forest/15 bg-white/60 px-4 py-3 text-ink outline-none transition focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/10"
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <div className="sm:col-span-2">
              <ClipField
                label="Link (Drive or YouTube)"
                type="url"
                value={clip.external_url}
                onChange={(v) => setClip((c) => ({ ...c, external_url: v }))}
                required
                placeholder="https://…"
              />
            </div>
          </div>

          {clipError && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {clipError}
            </p>
          )}

          <button
            type="submit"
            disabled={clipSaving}
            className="mt-4 rounded-xl bg-forest px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.15em] text-sand transition hover:bg-forest/90 disabled:opacity-60"
          >
            {clipSaving ? 'Adding…' : 'Add & attach clip'}
          </button>
        </form>

        {gallery.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-forest/25 bg-white/40 px-6 py-8 text-center">
            <p className="text-sm text-ink/55">
              No clips yet. Add one above to start their gallery.
            </p>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-forest/12 bg-white/50">
            {gallery.map((item) => (
              <AttachRow
                key={item.id}
                title={item.title || 'Untitled clip'}
                meta={item.source}
                url={item.external_url}
                attached={linkedGallery.has(item.id)}
                busy={busyId === item.id}
                onToggle={() => toggleGallery(item)}
              />
            ))}
          </ul>
        )}
      </section>

      <div className="flex items-center gap-4">
        <Link
          to="/admin/students"
          className="rounded-xl bg-forest px-6 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-sand transition hover:bg-forest/90"
        >
          Done
        </Link>
        <Link
          to={`/admin/students/${id}/feedback/new`}
          className="text-sm text-ink/60 underline-offset-4 transition hover:text-forest hover:underline"
        >
          Write another
        </Link>
      </div>
    </div>
  )
}

function AttachRow({ title, meta, url, attached, busy, onToggle }) {
  return (
    <li className="flex items-center justify-between gap-4 border-b border-forest/8 px-5 py-4 last:border-0">
      <div className="min-w-0">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="block truncate font-medium text-ink underline-offset-4 transition hover:text-forest hover:underline"
        >
          {title}
        </a>
        {meta && (
          <p className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink/45">
            {meta}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={busy}
        className={`shrink-0 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] transition disabled:opacity-50 ${
          attached
            ? 'bg-forest text-sand hover:bg-forest/90'
            : 'border border-forest/40 text-forest hover:bg-forest/5'
        }`}
      >
        {busy ? '…' : attached ? 'Attached ✓' : 'Attach'}
      </button>
    </li>
  )
}

function ClipField({ label, type = 'text', value, onChange, required, placeholder }) {
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
