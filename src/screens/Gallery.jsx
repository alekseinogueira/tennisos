// Student Gallery (/gallery) — the player's own lesson clips, newest first.
// RLS keeps it private: a student only ever sees their own student_gallery rows
// (user_id = auth.uid()). The coach adds clips from the feedback attach screen;
// here the player just watches. YouTube links embed inline; anything else
// (Drive, etc.) gets a clean "Watch ↗" link.
// 55TC tokens only: forest, sand, ink · Bebas Neue display · DM Sans body.
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { getStudentByUserId, listGalleryForStudent } from '../lib/db'
import { youtubeId } from '../lib/youtube'

export default function Gallery() {
  const { user } = useAuth()
  const [clips, setClips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return
    let alive = true
    ;(async () => {
      try {
        // RLS: a student only ever resolves their own roster row + own clips.
        const student = await getStudentByUserId(user.id)
        if (!alive) return
        if (!student) {
          setClips([])
          return
        }
        const rows = await listGalleryForStudent(student.id)
        if (alive) setClips(rows)
      } catch (e) {
        if (alive) setError(e.message ?? 'Could not load your gallery.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [user])

  return (
    <div>
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-ink/50">
          55TC · Your Portal
        </p>
        <h1 className="mt-2 font-display text-5xl tracking-[0.06em] text-forest">
          Gallery
        </h1>
        <p className="mt-3 text-ink/60">
          Your own footage from the court. Watch yourself, then go again.
        </p>
      </header>

      {loading && <p className="text-sm text-ink/50">Loading your clips…</p>}

      {error && !loading && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {!loading && !error && clips.length === 0 && (
        <div className="rounded-2xl border border-dashed border-forest/25 bg-white/40 px-6 py-14 text-center">
          <p className="font-display text-3xl tracking-[0.04em] text-forest">
            No clips yet
          </p>
          <p className="mt-2 text-sm text-ink/55">
            When your coach films you in a lesson, it shows up here to study.
          </p>
        </div>
      )}

      {!loading && !error && clips.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2">
          {clips.map((clip) => (
            <GalleryCard key={clip.id} clip={clip} />
          ))}
        </div>
      )}
    </div>
  )
}

function GalleryCard({ clip }) {
  const id = youtubeId(clip.external_url)
  const title = clip.title || 'Lesson clip'
  const date = clip.created_at ? clip.created_at.slice(0, 10) : null

  return (
    <article className="rounded-3xl border border-forest/12 bg-white/60 p-6">
      {date && (
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-ink/45">
          {date}
        </p>
      )}
      <h2 className="mt-1 mb-4 font-display text-2xl tracking-[0.04em] text-forest">
        {title}
      </h2>

      {id ? (
        <div className="aspect-video overflow-hidden rounded-xl border border-forest/12 bg-ink/5">
          <iframe
            src={`https://www.youtube.com/embed/${id}`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      ) : (
        <a
          href={clip.external_url}
          target="_blank"
          rel="noreferrer"
          className="flex aspect-video flex-col items-center justify-center rounded-xl border border-forest/15 bg-white/60 p-4 text-center transition hover:border-forest/30 hover:bg-white"
        >
          <span className="font-display text-2xl tracking-[0.04em] text-forest">
            Watch ↗
          </span>
          <span className="mt-1 line-clamp-2 text-sm text-ink/60">{title}</span>
        </a>
      )}
    </article>
  )
}
