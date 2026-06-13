// Branded protected shell: forest header with role-aware nav, the signed-in
// user + sign-out, and a sand content area that renders the active page.
// Sits inside <ProtectedRoute>, so a session is guaranteed here; signing out
// clears it and ProtectedRoute bounces back to /login.
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth, isCoachRole } from '../auth/useAuth'

export default function Layout() {
  const { user, role, signOut } = useAuth()
  const coach = isCoachRole(role)

  // Role-aware nav. Only the home destination exists today — feature sections
  // (roster, feedback, videos, packages…) get added here as their screens land.
  const navItems = coach
    ? [
        { to: '/coach', label: 'Home', end: true },
        // No `end` so Admin stays highlighted across /admin sub-routes.
        { to: '/admin', label: 'Admin', end: false },
      ]
    : [{ to: '/', label: 'Home', end: true }]

  return (
    <div className="flex min-h-screen flex-col bg-sand">
      <header className="bg-forest text-sand">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-6">
          <span className="font-display text-2xl tracking-wide">TennisOS</span>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    isActive ? 'bg-sand/15 text-sand' : 'text-sand/70 hover:text-sand'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm leading-tight">{user?.email}</p>
              <p className="text-xs uppercase tracking-[0.15em] text-sand/60">
                {coach ? 'Coach' : 'Student'}
              </p>
            </div>
            <button
              onClick={signOut}
              className="rounded-lg border border-sand/25 px-3 py-1.5 text-sm font-medium text-sand transition hover:bg-sand/10"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <Outlet />
      </main>
    </div>
  )
}
