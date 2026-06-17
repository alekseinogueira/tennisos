// Broadcast-style player credential shown at the top of the student Home page.
// Think pre-match TV graphic: photo, big name, a strip of stat fields.
// Forest surface + court motif, circular avatar (or a sand-circle initial when
// there's no photo). Self-fetches via getStudentProfile and NEVER errors on an
// incomplete profile — every missing tennis field degrades to an "—" placeholder
// and SESSIONS falls back to 0. 55TC tokens only: forest bg / sand text ·
// Bebas Neue display · DM Sans body.
//
// Mobile and desktop are rendered as two separate sibling blocks so the desktop
// tree stays a verbatim copy of the approved layout (zero regression):
//   - Mobile (< sm): photo + name (surname-first, American style) on one row,
//     then a full-width 2×2 stat sheet BELOW it.
//   - Desktop (≥ sm): avatar + first name + inline ·-separated stat row — unchanged.
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { getStudentProfile } from '../lib/db'
import { formatNameAmericanStyle } from '../lib/name'
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
  const { surname, given } = formatNameAmericanStyle(fullName)
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

      {/* ── MOBILE (< sm): photo + name row, then full-width 2×2 stat grid ── */}
      <div className="relative sm:hidden">
        {/* The avatar is vertically centered against the label + surname wrapper
            only (items-center on this row); given names sit below, indented to
            line up under the surname (pl-24 = avatar 80px + gap 16px). */}
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={firstName}
                className="h-20 w-20 rounded-full object-cover ring-2 ring-sand/20"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sand ring-2 ring-sand/20">
                <span className="font-display text-3xl leading-none text-forest">
                  {initial}
                </span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            {/* Label — identical treatment to desktop (unchanged size/weight/tracking) */}
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-sand/55">
              55TC · Player Card
            </p>
            {/* Surname — dominant element, same visual weight the first name has on desktop */}
            <h1 className="mt-1 font-display text-[2rem] leading-[0.9] tracking-[0.06em] text-sand">
              {surname || 'Player'}
            </h1>
          </div>
        </div>
        {/* Given names — smaller / lighter, tucked tight under the surname */}
        {given && (
          <p className="mt-1 pl-24 text-sm font-normal tracking-wide text-sand/60">
            {given}
          </p>
        )}

        {/* Stat sheet — full-width 2×2, no boxes; shared <Stat> for consistent rhythm */}
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3">
          {stats.map((s) => (
            <Stat key={s.label} label={s.label} value={s.value} />
          ))}
        </div>
      </div>

      {/* ── DESKTOP (≥ sm): EXACTLY the approved layout (verbatim) ── */}
      <div className="relative hidden flex-row items-center gap-8 text-left sm:flex">
        <div className="shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={firstName}
              className="h-32 w-32 rounded-full object-cover ring-2 ring-sand/20"
            />
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-sand ring-2 ring-sand/20">
              <span className="font-display text-6xl leading-none text-forest">
                {initial}
              </span>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-sand/55">
            55TC · Player Card
          </p>
          <h1 className="mt-1 font-display leading-[0.9] tracking-[0.06em] text-sand text-[clamp(2.5rem,8vw,4rem)]">
            {firstName}
          </h1>
          <div className="mt-4 flex flex-wrap items-center justify-start gap-x-2.5 gap-y-2">
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

/** One stat field for the mobile spec sheet — label stacked over value, no
 *  container. Shared so the label/value rhythm is identical across all four;
 *  stacking left-aligns every value into a clean column per row. */
function Stat({ label, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-sand/50">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-sand/90">{value}</p>
    </div>
  )
}
