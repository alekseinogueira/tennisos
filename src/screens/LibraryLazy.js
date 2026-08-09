// Code-split entry for the Library screen. It carries the eight inlined pose
// SVGs (~300 KB of path data) — they have to be inline to render sharp on iOS
// (see components/LibraryCoverArt), so the screen loads on demand instead of
// weighing down every other route. Lives in its own module so `lazy()` is
// called once at import time, never during a render.
import { lazy } from 'react'

export default lazy(() => import('./Library'))
