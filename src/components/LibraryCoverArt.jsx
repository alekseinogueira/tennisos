// Library cover art — the eight approved 55TC pose illustrations, one per
// technique category. Rendered as a decorative layer inside the existing
// Library folder cards; it never replaces the emoji, title or count.
//
// WHY <img> AND NOT INLINE SVG: the eight files total ~300 KB of path data and
// this app ships a single non-code-split bundle (see main.jsx). As URL imports
// Vite emits them as separate hashed assets the browser fetches and caches on
// demand, leaving the JS bundle untouched. The trade-off is that CSS can't
// reach `currentColor` across the <img> boundary, so the sand token is baked
// into each file's root `color` attribute (#F5EDE0 — the same value as
// --color-sand in index.css). The paths still use fill="currentColor", so an
// inline embed later would pick the colour up from CSS with no edit.
import forehand from '../assets/library-covers/forehand.svg'
import backhand from '../assets/library-covers/backhand.svg'
import footwork from '../assets/library-covers/footwork.svg'
import serve from '../assets/library-covers/serve.svg'
import volley from '../assets/library-covers/volley.svg'
import slice from '../assets/library-covers/slice.svg'
import smash from '../assets/library-covers/smash.svg'
import mentality from '../assets/library-covers/mentality.svg'

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
 * The caller supplies the vertical padding that gives `scale`/`dy` room to
 * move without ever reaching the emoji above or the title below.
 *
 * NO CSS TRANSFORM. `scale`/`dy` are applied as layout size (height %) and
 * offset (top %), never `transform: scale()/translate()`. An <img> holding an
 * SVG is rasterised at its *layout* size; a transform then stretches that
 * bitmap instead of re-rendering the vector, which reads as a soft, blurry
 * figure on iOS Safari in particular. Sizing by layout keeps every pose
 * rasterised at the size it is actually drawn at, so it stays sharp.
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
    >
      {art && (
        <img
          src={art.src}
          alt=""
          aria-hidden="true"
          draggable="false"
          decoding="async"
          className="relative max-w-none"
          style={{
            height: `${art.scale * 100}%`,
            width: 'auto',
            top: `${art.dy}%`,
          }}
        />
      )}
    </div>
  )
}
