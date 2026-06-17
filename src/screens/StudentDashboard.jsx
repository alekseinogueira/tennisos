// Student home (/) — the player's credential screen. Composes three self-fetching
// pieces: the broadcast-style PlayerCard (forest hero + court motif, identity +
// stats), the "Next Session" coming-soon placeholder, and the LastFeedbackWidget.
// The lesson-credit balance is intentionally not surfaced here (the ledger + admin
// credits hub are untouched). 55TC tokens only: forest, sand, ink ·
// Bebas Neue display · DM Sans body.
import PlayerCard from '../components/PlayerCard'
import NextSessionWidget from '../components/NextSessionWidget'
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

      {/* ── Next session — real data, "Coming soon" until one is scheduled ── */}
      <NextSessionWidget />

      {/* ── Last session feedback (below Next Session) ── */}
      <LastFeedbackWidget />
    </div>
  )
}
