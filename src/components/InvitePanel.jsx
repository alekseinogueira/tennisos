// Invite-link generator — shown after a coach creates a roster student. Builds
// the claim URL for that student and lets the coach copy it for WhatsApp.
//
// The link is keyed on students.invite_token (migration 015) and expires 7 days
// after the student row is created. The older /claim?email=… form still resolves
// server-side, so links already sent keep working; it's only the fallback here
// for a row that somehow has no token.
//
// NOTE: the AUTOMATED email invite (a true Supabase magic link sent server-side
// via auth.admin.inviteUserByEmail) is delivered by the invite Edge Function.
// This panel is the manual path the coach sends themselves. 55TC tokens only.
import { useState } from 'react'
import { rotateInviteToken } from '../lib/db'

function buildClaimUrl(student) {
  const base = window.location.origin
  if (student?.invite_token) return `${base}/claim/${student.invite_token}`
  // Pre-015 row, or a token the insert didn't return — fall back to the email
  // form so the coach is never left without a sendable link.
  return student?.email
    ? `${base}/claim?email=${encodeURIComponent(student.email)}`
    : `${base}/claim`
}

/** "in 7 days" / "in 3 days" / "today" — the coach only needs the shape of the
 *  window, not a timestamp. Returns null when there's nothing to show. */
function describeExpiry(iso) {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  if (Number.isNaN(ms)) return null
  if (ms <= 0) return { expired: true, text: 'This link has expired.' }
  const days = Math.ceil(ms / 86_400_000)
  return {
    expired: false,
    text: days <= 1 ? 'Expires today.' : `Expires in ${days} days.`,
  }
}

export default function InvitePanel({ student, children }) {
  const [row, setRow] = useState(student)
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const [rotating, setRotating] = useState(false)
  const [rotateError, setRotateError] = useState(null)

  const url = buildClaimUrl(row)
  const expiry = describeExpiry(row?.invite_token_expires_at)

  async function copy() {
    setCopyFailed(false)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API is unavailable outside a secure context — tell the coach
      // to copy by hand instead of silently doing nothing.
      setCopied(false)
      setCopyFailed(true)
    }
  }

  async function regenerate() {
    setRotateError(null)
    setRotating(true)
    try {
      const fresh = await rotateInviteToken(row.id)
      if (!fresh) {
        setRotateError('This student already claimed their account.')
        return
      }
      setRow((r) => ({ ...r, ...fresh }))
    } catch (e) {
      setRotateError(e.message ?? 'Could not generate a new link.')
    } finally {
      setRotating(false)
    }
  }

  return (
    <div className="rounded-2xl border border-forest/15 bg-white/60 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">
        Invite link
      </p>
      <h2 className="mt-1 font-display text-3xl tracking-[0.04em] text-forest">
        {row?.full_name || 'Student'} is on the roster
      </h2>
      <p className="mt-2 text-sm text-ink/60">
        {row?.email
          ? `Send this link to ${row.email} so they can set a password and activate their account.`
          : 'Send this link over WhatsApp. They add their own email and password on the way in.'}
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

      {copyFailed && (
        <p className="mt-3 text-xs text-red-700">
          Couldn’t reach the clipboard — select the link above and copy it manually.
        </p>
      )}

      {expiry && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className={`text-xs ${expiry.expired ? 'text-red-700' : 'text-ink/50'}`}>
            {expiry.text}
            {!expiry.expired && ' The link stops working once they finish signing up.'}
          </p>
          {expiry.expired && (
            <button
              type="button"
              onClick={regenerate}
              disabled={rotating}
              className="text-xs font-semibold uppercase tracking-[0.15em] text-forest underline-offset-4 transition hover:underline disabled:opacity-60"
            >
              {rotating ? 'Generating…' : 'Generate new link'}
            </button>
          )}
        </div>
      )}

      {rotateError && (
        <p className="mt-2 text-xs text-red-700">{rotateError}</p>
      )}

      <p className="mt-4 text-xs text-ink/50">
        Less Theory. More Game. Send it over — the roster row links itself the
        moment they sign up.
      </p>

      {children && <div className="mt-6 flex items-center gap-4">{children}</div>}
    </div>
  )
}
