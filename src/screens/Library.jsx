// Curated Library (/library) — the crew's shelf of reference videos, organized
// into category folders. Open to any signed-in user (RLS lets every authenticated
// user SELECT curated_library; the coach manages it from /admin/videos).
//
// Two states, no page reload:
//   A) Folder grid    — the 8 technique categories as forest folder cards.
//   B) Inside a folder — that category's video cards (YouTube embeds inline,
//                        anything else gets a clean "Watch ↗" tile).
// 55TC tokens only: forest, sand, ink · Bebas Neue display · DM Sans body.
import { useEffect, useMemo, useState } from 'react'
import { listLibrary } from '../lib/db'
import { youtubeId } from '../lib/youtube'
import CourtMotif from '../components/CourtMotif'

// The 8 seeded technique folders, in coaching order. Emoji are placeholders
// (the spec allows emoji icons); swap for brand SVGs later without touching layout.
const CATEGORIES = [
  { key: 'forehand', label: 'Forehand', icon: '🎾' },
  { key: 'backhand', label: 'Backhand', icon: '🔁' },
  { key: 'footwork', label: 'Footwork', icon: '👟' },
  { key: 'serve', label: 'Serve', icon: '🚀' },
  { key: 'volley', label: 'Volley', icon: '✋' },
  { key: 'slice', label: 'Slice', icon: '🔪' },
  { key: 'smash', label: 'Smash', icon: '💥' },
  { key: 'mentality', label: 'Mentality', icon: '🧠' },
]

const OTHER = { key: '__other', label: 'More', icon: '📁' }

const norm = (c) => (c ?? '').trim().toLowerCase()

export default function Library() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [open, setOpen] = useState(null) // null = folder grid; else a category key

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const rows = await listLibrary()
        if (alive) setItems(rows)
      } catch (e) {
        if (alive) setError(e.message ?? 'Could not load the library.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // Group items by normalized category; collect anything off-list under "More".
  const { counts, otherItems } = useMemo(() => {
    const known = new Set(CATEGORIES.map((c) => c.key))
    const counts = Object.fromEntries(CATEGORIES.map((c) => [c.key, 0]))
    const otherItems = []
    for (const it of items) {
      const k = norm(it.category)
      if (known.has(k)) counts[k] += 1
      else otherItems.push(it)
    }
    return { counts, otherItems }
  }, [items])

  // The folders to render: the 8 always, plus "More" only if it holds anything.
  const folders = useMemo(() => {
    const base = CATEGORIES.map((c) => ({ ...c, count: counts[c.key] }))
    return otherItems.length
      ? [...base, { ...OTHER, count: otherItems.length }]
      : base
  }, [counts, otherItems])

  const openFolder = open && folders.find((f) => f.key === open)
  const folderItems =
    openFolder &&
    (open === OTHER.key
      ? otherItems
      : items.filter((it) => norm(it.category) === open))

  return (
    <div>
      {loading && <p className="text-sm text-ink/50">Loading the library…</p>}

      {error && !loading && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {/* ─── State A: folder grid ─── */}
      {!loading && !error && !openFolder && (
        <>
          <header className="mb-8">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-ink/50">
              55TC · Crew Library
            </p>
            <h1 className="mt-2 font-display text-5xl tracking-[0.06em] text-forest">
              Library
            </h1>
            <p className="mt-3 text-ink/60">
              Reference clips to study between lessons. Less Theory. More Game.
            </p>
          </header>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
            {folders.map((f) => (
              <FolderCard key={f.key} folder={f} onOpen={() => setOpen(f.key)} />
            ))}
          </div>
        </>
      )}

      {/* ─── State B: inside a folder ─── */}
      {!loading && !error && openFolder && (
        <>
          <button
            onClick={() => setOpen(null)}
            className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-forest/70 transition hover:text-forest"
          >
            ← Library
          </button>

          <header className="mb-8 flex items-center gap-3">
            <span className="text-3xl" aria-hidden="true">
              {openFolder.icon}
            </span>
            <h1 className="font-display text-5xl tracking-[0.06em] text-forest">
              {openFolder.label}
            </h1>
          </header>

          {folderItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-forest/25 bg-white/40 px-6 py-14 text-center">
              <p className="font-display text-3xl tracking-[0.04em] text-forest">
                Coming soon
              </p>
              <p className="mt-2 text-sm text-ink/55">
                Your coach is stocking this shelf. Check back soon.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {folderItems.map((it) => (
                <LibraryCard key={it.id} item={it} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function FolderCard({ folder, onOpen }) {
  const empty = folder.count === 0
  return (
    <button
      onClick={onOpen}
      className="group relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-3xl bg-forest p-5 text-left transition hover:-translate-y-0.5 sm:aspect-square sm:p-6"
    >
      <CourtMotif className="pointer-events-none absolute -right-6 -bottom-6 h-40 text-sand/[0.06]" />

      <span
        className="relative flex h-11 w-11 items-center justify-center rounded-full bg-sand/10 text-2xl"
        aria-hidden="true"
      >
        {folder.icon}
      </span>

      <div className="relative">
        <h2 className="font-display text-3xl leading-none tracking-[0.04em] text-sand sm:text-4xl">
          {folder.label}
        </h2>
        {empty ? (
          <span className="mt-2 inline-block rounded bg-sand/10 px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-sand/70">
            Coming soon
          </span>
        ) : (
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.2em] text-sand/55">
            {folder.count} {folder.count === 1 ? 'video' : 'videos'}
          </p>
        )}
      </div>
    </button>
  )
}

function LibraryCard({ item }) {
  const id = youtubeId(item.external_url)
  const title = item.title || 'Reference clip'

  return (
    <article className="rounded-3xl border border-forest/12 bg-white/60 p-6">
      <h2 className="mb-4 font-display text-2xl tracking-[0.04em] text-forest">
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
          href={item.external_url}
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
