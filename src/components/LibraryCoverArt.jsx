// Library cover art — the eight approved 55TC pose illustrations, one per
// technique category. Rendered as a decorative layer inside the existing
// Library folder cards; it never replaces the emoji, title or count.
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
// The cost is that the ~300 KB of path data now lands in the JS bundle instead
// of eight separately cached assets (this app has no code splitting — see
// main.jsx). If that ever matters, lazy-loading the /library route moves the
// whole thing out of the initial download.
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
// OPTICAL NORMALISATION. Every file is already geometrically normalised: the
// artwork's bounding box is centred on (256,256) and its longest side spans
// ~442 of the 512 viewBox. Geometric parity is not optical parity, though —
// a serve reaches full height with a raised racquet while its body stays
// small, and a lunging volley fills the width at three quarters the height.
// So `scale` equalises a blended metric (bbox height, weighted 0.7, against
// the square root of the inked area — a proxy for body size — weighted 0.3),
// clamped to ±10% so no pose is visibly stretched or shrunk. `dy` nudges
// top-heavy poses (racquet high above the head) back down toward their centre
// of mass, and is bounded so no extremity can leave the safe area. Horizontal
// offsets are deliberately all zero: the boxes are already centred and the
// reach of an arm or racquet is part of the pose, not an error to correct.
const ART = {
  forehand: { src: forehand, scale: 1.01, dy: 1.1 },
  backhand: { src: backhand, scale: 0.94, dy: 0.6 },
  footwork: { src: footwork, scale: 0.92, dy: 0.7 },
  serve: { src: serve, scale: 1.05, dy: -2 },
  volley: { src: volley, scale: 1.05, dy: 0.3 },
  slice: { src: slice, scale: 1.06, dy: 0.6 },
  smash: { src: smash, scale: 1, dy: -5 },
  mentality: { src: mentality, scale: 1.02, dy: 1.3 },
}

/**
 * Fills the free middle band of a Library folder card with that category's
 * pose. Returns null for categories with no art, so the card keeps its
 * original spacing untouched.
 *
 * `min-h-0` lets the band shrink below the artwork's intrinsic 512px inside a
 * flex column — without it the illustration would drive the card's height.
 * The caller supplies the vertical padding that keeps `scale`/`dy` clear of
 * the title below.
 *
 * NO CSS TRANSFORM. `scale`/`dy` are applied as layout size (height %) and
 * offset (top %), never `transform: scale()/translate()`. A transform on a
 * rasterised layer stretches pixels instead of redrawing the vector — the same
 * class of bug as the <img> path this component moved away from.
 *
 * @param {string} category - category key (must match ART / CATEGORIES)
 * @param {string} [className] - layout classes for the band wrapper
 */
export default function LibraryCoverArt({ category, className = '' }) {
  const art = ART[category]

  // The wrapper renders even without art: it is the card's flex spacer, so the
  // "More" folder keeps the same title position as the eight illustrated ones.
  return (
    <div
      className={`pointer-events-none flex min-h-0 items-center justify-center ${className}`}
      aria-hidden="true"
    >
      {art && (
        <div
          className="relative [&>svg]:block [&>svg]:h-full [&>svg]:w-auto"
          style={{ height: `${art.scale * 100}%`, top: `${art.dy}%` }}
          // Build-time constants from our own asset folder — no user input ever
          // reaches this, and the files are checked in alongside the component.
          dangerouslySetInnerHTML={{ __html: art.src }}
        />
      )}
    </div>
  )
}
