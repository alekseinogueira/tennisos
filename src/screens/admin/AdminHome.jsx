// Admin landing — the coach's internal OS home. Lives under /admin behind a
// coach/admin RoleRoute, so students never reach it (they're bounced to /).
// Branded 55TC shell: forest headings in Bebas Neue, DM Sans body, sand surface.
import { Link } from 'react-router-dom'

// Management sections. Only the roster ships first; later sections (packages,
// feedback, videos) slot in here as their screens land.
const sections = [
  {
    to: '/admin/students',
    eyebrow: 'Roster',
    title: 'Students',
    body: 'Manage your roster, set lesson credits, and send invite links.',
  },
  {
    to: '/admin/videos',
    eyebrow: 'Library',
    title: 'Videos',
    body: 'Curate technical reference clips to attach to player feedback.',
  },
]

export default function AdminHome() {
  return (
    <div>
      <header className="mb-10">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-ink/50">
          55TC · Admin
        </p>
        <h1 className="mt-2 font-display text-5xl tracking-[0.06em] text-forest">
          Control Room
        </h1>
        <p className="mt-3 max-w-md text-ink/60">
          Less Theory. More Game. Run the crew from one place.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="group rounded-2xl border border-forest/12 bg-white/60 p-6 transition hover:border-forest/30 hover:bg-white"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">
              {s.eyebrow}
            </p>
            <h2 className="mt-1 font-display text-3xl tracking-[0.04em] text-forest">
              {s.title}
            </h2>
            <p className="mt-2 text-sm text-ink/60">{s.body}</p>
            <span className="mt-4 inline-block text-sm font-semibold uppercase tracking-[0.15em] text-forest transition group-hover:translate-x-0.5">
              Open →
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
