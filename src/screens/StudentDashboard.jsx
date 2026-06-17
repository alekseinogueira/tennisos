// Student home (/) — the player's credential screen. Composes three self-fetching
// pieces: the broadcast-style PlayerCard (forest hero + court motif, identity +
// stats), the "Next Session" coming-soon placeholder, and the LastFeedbackWidget.
// The lesson-credit balance is intentionally not surfaced here (the ledger + admin
// credits hub are untouched). 55TC tokens only: forest, sand, ink ·
// Bebas Neue display · DM Sans body.
import PlayerCard from '../components/PlayerCard'
import LastFeedbackWidget from '../components/LastFeedbackWidget'

export default function StudentDashboard() {
  return (
    <div className="space-y-6">
      {/* ── Player card — forest hero + court motif (top) ── */}
      <PlayerCard />

      {/* Brand tagline */}
      <p className="text-center text-xs font-medium uppercase tracking-[0.3em] text-ink/45 sm:text-left">
        Less Theory. More Game.
      </p>

      {/* ── Next session — coming soon (kept as-is) ── */}
      <section className="rounded-3xl border border-dashed border-forest/25 bg-white/40 p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">
          Next Session
        </p>
        <p className="mt-3 font-display text-4xl tracking-[0.04em] text-forest">
          Coming soon
        </p>
        <p className="mt-2 text-sm text-ink/55">
          Your upcoming lessons will land here. Hang tight.
        </p>
      </section>

      {/* ── Last session feedback (below Next Session) ── */}
      <LastFeedbackWidget />
    </div>
  )
}
