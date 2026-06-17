// Broadcast-style player credential shown at the top of the student Home page.
// Think pre-match TV graphic: photo, big first name, a strip of stat chips.
// Forest surface + court motif, circular avatar (or a sand-circle initial when
// there's no photo). Self-fetches via getStudentProfile and NEVER errors on an
// incomplete profile — every missing tennis field degrades to an "—" placeholder
// and SESSIONS falls back to 0. 55TC tokens only: forest bg / sand text ·
// Bebas Neue display · DM Sans body.
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { getStudentProfile } from '../lib/db'
import CourtMotif from './CourtMotif'

export default function PlayerCard() {
  const { user, profile: authProfile } = useAuth()
  const [profile, setProfile] = useState(authProfile ?? null)
  const [student, setStudent] = useState(null)

  useEffect(() => {
    if (!user) return
    let active = true
    ;(async () => {
      try {
        const data = await getStudentProfile(user.id)
        if (!active) return
        setProfile(data.profile)
        setStudent(data.student)
      } catch {
        // Stay graceful — the card renders with "—" placeholders on any failure.
      }
    })()
    return () => {
      active = false
    }
  }, [user])

  const fullName = (profile?.full_name || student?.full_name || '').trim()
  const firstName = fullName.split(/\s+/)[0] || 'Player'
  const initial = (firstName[0] || '?').toUpperCase()
  const avatarUrl = profile?.avatar_url

  const stats = [
    { label: 'Level', value: profile?.tennis_level || '—' },
    { label: 'Arm', value: profile?.dominant_hand || '—' },
    { label: 'Surface', value: profile?.favorite_surface || '—' },
    { label: 'Sessions', value: student?.sessions_count ?? 0 },
  ]

  return (
    <section className="relative overflow-hidden rounded-xl bg-forest px-7 py-8 text-sand sm:px-10 sm:py-10">
      <CourtMotif className="pointer-events-none absolute -right-10 -bottom-16 h-[150%] w-auto text-sand/[0.06]" />

      <div className="relative flex flex-row items-center gap-4 text-left sm:gap-8">
        {/* Avatar — photo, or sand circle with the first initial. Smaller on
            mobile (64px) since it now shares the row with the name + stats. */}
        <div className="shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={firstName}
              className="h-16 w-16 rounded-full object-cover ring-2 ring-sand/20 sm:h-32 sm:w-32"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sand ring-2 ring-sand/20 sm:h-32 sm:w-32">
              <span className="font-display text-2xl leading-none text-forest sm:text-6xl">
                {initial}
              </span>
            </div>
          )}
        </div>

        {/* Name + stat strip */}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-sand/55">
            55TC · Player Card
          </p>
          <h1 className="mt-1 font-display leading-[0.9] tracking-[0.06em] text-sand text-[2rem] sm:text-[clamp(2.5rem,8vw,4rem)]">
            {firstName}
          </h1>

          {/* Mobile: 2-col grid — LEVEL · ARM / SURFACE · SESSIONS (no orphan). */}
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:hidden">
            {stats.map((s) => (
              <span key={s.label} className="text-[10px] uppercase tracking-[0.2em] text-sand/55">
                {s.label} <span className="text-sand/30">·</span>{' '}
                <span className="text-sand/85">{s.value}</span>
              </span>
            ))}
          </div>

          {/* Desktop: inline row with separators — unchanged. */}
          <div className="mt-4 hidden flex-wrap items-center gap-x-2.5 gap-y-2 sm:flex sm:justify-start">
            {stats.map((s, i) => (
              <div key={s.label} className="flex items-center gap-2.5">
                {i > 0 && (
                  <span aria-hidden="true" className="text-sand/25">·</span>
                )}
                <span className="text-[10px] uppercase tracking-[0.2em] text-sand/55">
                  {s.label} <span className="text-sand/30">·</span>{' '}
                  <span className="text-sand/85">{s.value}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
