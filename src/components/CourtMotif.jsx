// Minimal tennis-court line motif — a subtle brand texture for forest surfaces.
// Per the 55TC spec, every screen with a forest background carries this motif
// (sand lines at ~6% opacity, set by the caller via a text-sand/[0.06] color).
export default function CourtMotif({ className }) {
  return (
    <svg
      viewBox="0 0 200 320"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden="true"
    >
      {/* outer court */}
      <rect x="10" y="10" width="180" height="300" />
      {/* singles sidelines */}
      <line x1="34" y1="10" x2="34" y2="310" />
      <line x1="166" y1="10" x2="166" y2="310" />
      {/* net */}
      <line x1="10" y1="160" x2="190" y2="160" />
      {/* service lines */}
      <line x1="34" y1="90" x2="166" y2="90" />
      <line x1="34" y1="230" x2="166" y2="230" />
      {/* center service line */}
      <line x1="100" y1="90" x2="100" y2="230" />
    </svg>
  )
}
