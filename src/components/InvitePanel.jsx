// Invite-link generator — shown after a coach creates a roster student. Builds
// the claim URL (/claim?email=…) for that student and lets the coach copy it.
//
// NOTE: the AUTOMATED email invite (a true Supabase magic link sent server-side
// via auth.admin.inviteUserByEmail) is delivered by the invite Edge Function,
// which is built in a later session. Until then this is the shareable claim link
// — the student still needs a session from the invite email to set a password,
// so treat this as the manual/preview path. 55TC tokens only.
import { useState } from 'react'

function buildClaimUrl(email) {
  const base = `${window.location.origin}/claim`
  return email ? `${base}?email=${encodeURIComponent(email)}` : base
}

export default function InvitePanel({ student, children }) {
  const url = buildClaimUrl(student?.email)
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="rounded-2xl border border-forest/15 bg-white/60 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">
        Invite link
      </p>
      <h2 className="mt-1 font-display text-3xl tracking-[0.04em] text-forest">
        {student?.full_name || 'Student'} is on the roster
      </h2>
      <p className="mt-2 text-sm text-ink/60">
        Share this claim link so {student?.email || 'they'} can set a password and
        activate their account.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
          className="w-full rounded-xl border border-forest/15 bg-white px-4 py-3 text-sm text-ink/80 outline-none focus:border-forest"
        />
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-xl bg-forest px-6 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-sand transition hover:bg-forest/90"
        >
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>

      <p className="mt-4 text-xs text-ink/50">
        Automated email invites arrive with the invite function. For now, send
        this link yourself — the student sets their password and the roster row
        links automatically.
      </p>

      {children && <div className="mt-6 flex items-center gap-4">{children}</div>}
    </div>
  )
}
