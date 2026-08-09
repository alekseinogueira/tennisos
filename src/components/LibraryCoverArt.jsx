// Library cover art — the eight approved 55TC pose illustrations, one per
// technique category. Decorative: it is the folder card's icon, and the title
// and count below it carry the meaning.
//
// WHY INLINE SVG AND NOT <img>: WebKit rasterises an SVG loaded through <img>
// at CSS resolution and then upscales that bitmap to the device pixel ratio, so
// on a 3x iPhone screen the vector arrives as a blurry 1x image. Blink
// re-rasterises at device scale, which is why it only shows up on iOS/Safari.
// Verified by rendering the same file four ways in WebKit at dpr 3: <img>,
// <img> without a compositing transition, <img> with explicit width/height on
// the root, and inline — only the inline one is sharp. Embedding the markup in
// the DOM makes the browser draw real vector geometry at the layer's own
// resolution, so it is crisp at any density.
//
// The cost is that the ~300 KB of path data lands in the JS bundle instead of
// eight separately cached assets. That is why the /library route is the one
// code-split screen in the app — see screens/LibraryLazy.js.
import forehand from '../assets/library-covers/forehand.svg?raw'
import backhand from '../assets/library-covers/backhand.svg?raw'
import footwork from '../assets/library-covers/footwork.svg?raw'
import serve from '../assets/library-covers/serve.svg?raw'
import volley from '../assets/library-covers/volley.svg?raw'
import slice from '../assets/library-covers/slice.svg?raw'
import smash from '../assets/library-covers/smash.svg?raw'
import mentality from '../assets/library-covers/mentality.svg?raw'

// Category key → art. Keys match CATEGORIES in screens/Library.jsx; anything
// off-list (the "More" folder) resolves to undefined and renders nothing.
//
// OPTICAL NORMALISATION, all of it expressed in the artwork's own 512-unit
// coordinate system and applied through the viewBox (see viewBoxFor). Nothing
// here touches CSS size or position, so every pose occupies an identical box
// and only the drawing inside it moves.
//
//   scale — magnification. >1 draws the figure larger than its 512 box, which
//           it is allowed to overflow (the <svg> is overflow-visible).
//   dx/dy — shift in 512-units, positive = right / down.
//
// dx CENTRES EACH POSE BETWEEN ITS BOUNDING BOX AND ITS CENTRE OF MASS, at 55%
// of the way to the centroid. There is no single "centre" of a figure whose
// racquet reaches out: centring the box leaves the body sitting 48 units off
// (slice) and the eight poses on eight different axes; centring the mass makes
// the boxes themselves disagree by as much as 22px on a 352px card. 55% halves
// the worst deviation of either — measured spread across the eight drops from
// 32px to 18px on desktop. Push toward 1 to favour the body, toward 0 to line
// the boxes up exactly.
//
// scale EQUALISES PERCEIVED MASS, not height. Height alone is misleading: a
// serve and a smash reach full height with an outstretched racquet while the
// body itself stays small, so at equal height they read as the smallest of the
// eight. Both are magnified past the box on purpose — a deliberate break of
// the shared top/bottom bound, because filling the drawing matters more than
// a bound nobody can see. sqrt(inked area) is the mass proxy: it says serve
// would need 1.57 to truly match the group, which would be grotesque, so it
// gets a partial correction.
//
// dy pulls poses whose mass sits low (racquet high overhead) back up.
const ART = {
  forehand: { src: forehand, scale: 1.01, dx: 21, dy: 6 },
  backhand: { src: backhand, scale: 0.94, dx: 25, dy: 3 },
  footwork: { src: footwork, scale: 0.92, dx: -15, dy: 4 },
  serve: { src: serve, scale: 1.28, dx: 3, dy: -10 },
  volley: { src: volley, scale: 1.05, dx: 12, dy: 2 },
  slice: { src: slice, scale: 1.06, dx: 27, dy: 3 },
  smash: { src: smash, scale: 1.18, dx: 2, dy: -20 },
  mentality: { src: mentality, scale: 1.02, dx: -7, dy: 7 },
}

// A viewBox that magnifies by `scale` about the centre and then shifts the
// drawing by dx/dy. Shrinking the viewBox shows less of the canvas, so the art
// inside gets bigger; moving its origin moves the art the opposite way, hence
// the minus signs. scale = 1, dx = dy = 0 gives back "0 0 512 512".
const viewBoxFor = ({ scale, dx, dy }) => {
  const size = 512 / scale
  const half = size / 2
  return `${256 - half - dx} ${256 - half - dy} ${size} ${size}`
}

// Precomputed once at module load: the shipped viewBox swapped for the tuned
// one. Doing it here rather than per render keeps the markup a constant string.
const MARKUP = Object.fromEntries(
  Object.entries(ART).map(([key, art]) => {
    const from = 'viewBox="0 0 512 512"'
    if (!art.src.includes(from)) {
      throw new Error(`${key}: expected ${from} in the source SVG`)
    }
    return [key, art.src.replace(from, `viewBox="${viewBoxFor(art)}"`)]
  }),
)

/**
 * Fills the free middle band of a Library folder card with that category's
 * pose. Renders an empty spacer for categories with no art.
 *
 * `min-h-0` lets the band shrink below the artwork's intrinsic size inside a
 * flex column — without it the illustration would drive the card's height.
 *
 * EVERY pose gets the same square box, sized purely by the band's height. All
 * optical tuning lives in the viewBox, so no CSS scale or offset is involved:
 * the card's geometry is identical across the eight, and the eight drawings
 * float on one shared axis inside it. The <svg> is overflow-visible so a
 * magnified pose spills past its box instead of being clipped.
 *
 * NO CSS TRANSFORM anywhere — a transform on a rasterised layer stretches
 * pixels instead of redrawing vector geometry, the same class of bug as the
 * <img> path this component moved away from.
 *
 * @param {string} category - category key (must match ART / CATEGORIES)
 * @param {string} [className] - layout classes for the band wrapper
 */
export default function LibraryCoverArt({ category, className = '' }) {
  const markup = MARKUP[category]

  // The wrapper renders even without art: it is the card's flex spacer, so the
  // "More" folder keeps the same title position as the eight illustrated ones.
  return (
    <div
      className={`pointer-events-none flex min-h-0 items-center justify-center ${className}`}
      aria-hidden="true"
    >
      {markup && (
        // aspect-square, not w-auto: an inline <svg> with no width attribute
        // defaults to width:100% rather than resolving from its aspect ratio,
        // so `auto` inside a shrink-to-fit flex item blows the layout up.
        <div
          className="aspect-square h-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full [&>svg]:overflow-visible"
          // Build-time constants from our own asset folder — no user input ever
          // reaches this, and the files are checked in alongside the component.
          dangerouslySetInnerHTML={{ __html: markup }}
        />
      )}
    </div>
  )
}
