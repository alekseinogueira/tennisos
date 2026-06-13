// Branded protected shell: forest header with role-aware nav, the signed-in
// user + sign-out, and a sand content area that renders the active page.
// Sits inside <ProtectedRoute>, so a session is guaranteed here; signing out
// clears it and ProtectedRoute bounces back to /login.
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth, isCoachRole } from '../auth/useAuth'

export default function Layout() {
  const { user, role, signOut } = useAuth()
  const coach = isCoachRole(role)

  // Header account menu (☰): holds the email, role badge, and sign-out.
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Close the dropdown when clicking anywhere outside it.
  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [menuOpen])

  // Role-aware nav. Only the home destination exists today — feature sections
  // (roster, feedback, videos, packages…) get added here as their screens land.
  const navItems = coach
    ? [
        { to: '/coach', label: 'Home', end: true },
        // No `end` so Admin stays highlighted across /admin sub-routes.
        { to: '/admin', label: 'Admin', end: false },
        { to: '/admin/videos', label: 'Videos', end: true },
        { to: '/library', label: 'Library', end: true },
      ]
    : [
        { to: '/', label: 'Home', end: true },
        { to: '/feedback', label: 'Feedback', end: true },
        { to: '/library', label: 'Library', end: true },
        { to: '/gallery', label: 'Gallery', end: true },
        { to: '/profile', label: 'Profile', end: true },
      ]

  return (
    <div className="flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-sand">
      <header className="bg-forest text-sand">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-6">
          <span className="font-display text-2xl tracking-wide">TennisOS</span>

          <nav className="nav-scroll min-w-0 touch-pan-x overflow-x-auto">
            <ul className="flex w-max flex-nowrap items-center gap-1">
              {navItems.map((item) => (
                <li key={item.to} className="min-w-[30vw] shrink-0 md:min-w-0">
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `block rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                        isActive ? 'bg-sand/15 text-sand' : 'text-sand/70 hover:text-sand'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div ref={menuRef} className="relative ml-auto">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Account menu"
              aria-haspopup="true"
              aria-expanded={menuOpen}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-sand/25 text-xl leading-none text-sand transition hover:bg-sand/10"
            >
              ☰
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-12 z-20 w-56 rounded-lg border border-sand/15 bg-forest p-4 shadow-lg">
                <p className="truncate text-sm leading-tight text-sand">{user?.email}</p>
                <span className="mt-2 inline-block rounded border border-sand/25 px-2 py-0.5 text-xs uppercase tracking-[0.2em] text-sand/70">
                  {coach ? 'Coach' : 'Student'}
                </span>
                <button
                  onClick={signOut}
                  className="mt-4 w-full rounded-lg border border-sand/25 px-3 py-1.5 text-sm font-medium uppercase tracking-[0.1em] text-sand transition hover:bg-sand/10"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <Outlet />
      </main>
    </div>
  )
}
