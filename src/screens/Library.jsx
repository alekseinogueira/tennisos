// Curated Library (/library) — the crew's shelf of reference videos, open to
// any signed-in user (RLS lets every authenticated user SELECT curated_library;
// the coach manages it from /admin/videos). Browse all items, filter by the
// free-text category, and watch: YouTube links embed inline, anything else gets
// a clean "Watch ↗" link. Tone: a study shelf, not a catalog.
// 55TC tokens only: forest, sand, ink · Bebas Neue display · DM Sans body.
import { useEffect, useMemo, useState } from 'react'
import { listLibrary } from '../lib/db'
import { youtubeId } from '../lib/youtube'

const UNCATEGORIZED = 'More'

export default function Library() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [active, setActive] = useState('all')

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

  // Unique categories in display order (db.js already sorts category→title).
  const categories = useMemo(() => {
    const seen = []
    for (const it of items) {
      const c = it.category?.trim() || UNCATEGORIZED
      if (!seen.includes(c)) seen.push(c)
    }
    return seen
  }, [items])

  const visible = useMemo(
    () =>
      active === 'all'
        ? items
        : items.filter((it) => (it.category?.trim() || UNCATEGORIZED) === active),
    [items, active],
  )

  return (
    <div>
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

      {loading && <p className="text-sm text-ink/50">Loading the library…</p>}

      {error && !loading && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-forest/25 bg-white/40 px-6 py-14 text-center">
          <p className="font-display text-3xl tracking-[0.04em] text-forest">
            The shelf is empty
          </p>
          <p className="mt-2 text-sm text-ink/55">
            Your coach is still stocking the library. Check back soon.
          </p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          {categories.length > 1 && (
            <div className="mb-7 flex flex-wrap gap-2">
              <FilterChip
                label="All"
                active={active === 'all'}
                onClick={() => setActive('all')}
              />
              {categories.map((c) => (
                <FilterChip
                  key={c}
                  label={c}
                  active={active === c}
                  onClick={() => setActive(c)}
                />
              ))}
            </div>
          )}

          <div className="grid gap-6 sm:grid-cols-2">
            {visible.map((it) => (
              <LibraryCard key={it.id} item={it} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] transition ${
        active
          ? 'bg-forest text-sand'
          : 'border border-forest/20 text-forest/70 hover:border-forest/40 hover:text-forest'
      }`}
    >
      {label}
    </button>
  )
}

function LibraryCard({ item }) {
  const id = youtubeId(item.external_url)
  const category = item.category?.trim() || UNCATEGORIZED
  const title = item.title || 'Reference clip'

  return (
    <article className="rounded-3xl border border-forest/12 bg-white/60 p-6">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink/45">
        {category}
      </p>
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
