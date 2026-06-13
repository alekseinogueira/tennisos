// Placeholder page rendered inside the Layout shell. Real dashboards/features
// replace these in later steps; for now it just confirms the portal is wired.
export default function ComingSoon({ title }) {
  return (
    <div>
      <h1 className="font-display text-4xl tracking-wide text-forest">{title}</h1>
      <p className="mt-2 text-ink/60">Your portal is set up. Features are on the way.</p>
    </div>
  )
}
