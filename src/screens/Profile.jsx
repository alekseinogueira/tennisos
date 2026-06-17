// Student profile (/profile) — a real player profile with read + edit modes.
// Identity (full_name, avatar, DOB, gender, tennis fields) comes from profiles,
// phone from the roster row, email from auth (read-only). Edit mode reuses the
// onboarding chip selectors for the tennis/gender fields and saves via
// updateStudentProfile (profiles + students in one call). Empty fields show "—".
// 55TC tokens: forest / sand / ink · Bebas Neue display · DM Sans body.
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { getStudentProfile, updateStudentProfile, uploadAvatar } from '../lib/db'
import { formatNameAmericanStyle } from '../lib/name'

const HANDS = ['Right', 'Left', 'Both']
const LEVELS = ['Never played', 'Beginner', 'Intermediate', 'Advanced']
const SURFACES = ['Hard', 'Clay', 'Grass', 'No preference']
const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say']

const MAX_AVATAR_BYTES = 5 * 1024 * 1024 // 5MB

/** "1990-01-15" → "Jan 15, 1990". Parsed as a local date (no TZ shift). */
function formatDob(value) {
  if (!value) return '—'
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return '—'
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const dash = (v) => (v && String(v).trim() ? v : '—')

export default function Profile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [editing, setEditing] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    if (!user) return
    let active = true
    ;(async () => {
      try {
        const data = await getStudentProfile(user.id)
        if (!active) return
        setProfile(data.profile)
        setStudent(data.student)
      } catch (e) {
        if (active) setError(e.message ?? 'Could not load your profile.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [user])

  const fullName = (profile?.full_name || student?.full_name || '').trim()
  const [firstName, ...rest] = fullName.split(/\s+/)
  const lastName = rest.join(' ')
  const initial = (firstName?.[0] || '?').toUpperCase()
  const avatarUrl = profile?.avatar_url

  function startEdit() {
    setJustSaved(false)
    setEditing(true)
  }

  return (
    <div>
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-ink/50">
            55TC · Your Portal
          </p>
          <h1 className="mt-2 font-display text-5xl tracking-[0.06em] text-forest">
            Profile
          </h1>
        </div>
        {!loading && !error && !editing && (
          <button
            onClick={startEdit}
            className="hidden shrink-0 rounded bg-forest px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-sand transition hover:opacity-90 sm:block"
          >
            Edit Profile
          </button>
        )}
      </header>

      {loading && <p className="text-sm text-ink/50">Loading your profile…</p>}

      {error && !loading && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && justSaved && !editing && (
        <p className="mb-6 rounded-lg border border-forest/20 bg-forest/5 px-4 py-3 text-sm text-forest">
          Saved. Your profile is up to date.
        </p>
      )}

      {!loading && !error && !editing && (
        <ReadView
          firstName={firstName}
          lastName={lastName}
          initial={initial}
          avatarUrl={avatarUrl}
          fullName={fullName}
          email={user?.email}
          phone={student?.phone}
          profile={profile}
        />
      )}

      {!loading && !error && !editing && (
        <button
          onClick={startEdit}
          className="mt-8 w-full rounded bg-forest px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-sand transition hover:opacity-90 sm:hidden"
        >
          Edit Profile
        </button>
      )}

      {!loading && !error && editing && (
        <EditView
          userId={user?.id}
          studentId={student?.id}
          initial={initial}
          avatarUrl={avatarUrl}
          initialValues={{
            full_name: fullName,
            email: user?.email,
            phone: student?.phone || '',
            date_of_birth: profile?.date_of_birth || '',
            gender: profile?.gender || '',
            tennis_level: profile?.tennis_level || '',
            dominant_hand: profile?.dominant_hand || '',
            favorite_surface: profile?.favorite_surface || '',
            favorite_player: profile?.favorite_player || '',
          }}
          onCancel={() => setEditing(false)}
          onSaved={(savedProfile, savedPhone) => {
            setProfile((p) => ({ ...p, ...savedProfile }))
            setStudent((s) => (s ? { ...s, phone: savedPhone } : s))
            setEditing(false)
            setJustSaved(true)
          }}
        />
      )}
    </div>
  )
}

// ─── Read view ────────────────────────────────────────────────────────────────

function ReadView({ firstName, lastName, initial, avatarUrl, fullName, email, phone, profile }) {
  const { surname, given } = formatNameAmericanStyle(fullName)
  return (
    <div className="space-y-6">
      <div className="flex flex-row items-center gap-4 text-left sm:flex-col sm:items-center sm:text-center">
        <Avatar initial={initial} avatarUrl={avatarUrl} alt={firstName || 'You'} />
        <div className="min-w-0">
          {/* Mobile — surname-first "LASTNAME, First Middle" (this page only) */}
          <div className="sm:hidden">
            <span className="block font-display text-4xl leading-[0.9] tracking-[0.04em] text-forest">
              {surname || 'Player'}{given && ','}
            </span>
            {given && (
              <span className="mt-1 block text-base font-medium tracking-wide text-forest/55">
                {given}
              </span>
            )}
          </div>
          {/* Desktop — unchanged first-last */}
          <h2 className="hidden font-display text-4xl leading-[0.9] tracking-[0.04em] text-forest sm:mt-4 sm:block">
            {firstName || 'Player'} {lastName}
          </h2>
        </div>
      </div>

      <section className="rounded-2xl border border-forest/12 bg-white p-6">
        <h3 className="mb-5 font-display text-2xl tracking-[0.04em] text-forest">
          Your Details
        </h3>
        <dl className="divide-y divide-forest/8">
          <Row label="Full name">{dash(fullName)}</Row>
          <Row label="Email">{dash(email)}</Row>
          <Row label="Phone">{dash(phone)}</Row>
          <Row label="Date of birth">{formatDob(profile?.date_of_birth)}</Row>
          <Row label="Gender">{dash(profile?.gender)}</Row>
        </dl>
      </section>

      <section className="rounded-2xl border border-forest/12 bg-white p-6">
        <h3 className="mb-5 font-display text-2xl tracking-[0.04em] text-forest">
          Your Game
        </h3>
        <div className="flex flex-wrap gap-3">
          <GameChip label="Level" value={profile?.tennis_level} />
          <GameChip label="Dominant hand" value={profile?.dominant_hand} />
          <GameChip label="Favorite surface" value={profile?.favorite_surface} />
          <GameChip label="Favorite player" value={profile?.favorite_player} />
        </div>
      </section>
    </div>
  )
}

// ─── Edit view ────────────────────────────────────────────────────────────────

function EditView({ userId, studentId, initial, avatarUrl, initialValues, onCancel, onSaved }) {
  const [values, setValues] = useState(initialValues)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const fileRef = useRef(null)
  const [avatarPreview, setAvatarPreview] = useState(null) // local objectURL
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState(null) // uploaded public URL, committed on save
  const [uploading, setUploading] = useState(false)
  const [avatarError, setAvatarError] = useState(null)

  const set = (key) => (val) => setValues((v) => ({ ...v, [key]: val }))

  // Revoke the local preview objectURL on unmount to avoid a memory leak.
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  async function onPickAvatar(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    setAvatarError(null)
    if (!file.type.startsWith('image/')) {
      setAvatarError('That file isn’t an image. Pick a photo.')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError('That photo is over 5MB. Pick a smaller one.')
      return
    }
    // Instant local preview — stays visible through the whole upload.
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarPreview(URL.createObjectURL(file))
    setUploading(true)
    try {
      const url = await uploadAvatar(userId, file)
      setPendingAvatarUrl(url) // held locally; written to profiles only on Save
    } catch (err) {
      setAvatarError(err?.message ?? 'Upload failed. Try again.')
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    setSaveError(null)
    setSaving(true)
    try {
      const profilePatch = {
        full_name: values.full_name.trim() || null,
        date_of_birth: values.date_of_birth || null,
        gender: values.gender || null,
        tennis_level: values.tennis_level || null,
        dominant_hand: values.dominant_hand || null,
        favorite_surface: values.favorite_surface || null,
        favorite_player: values.favorite_player.trim() || null,
        ...(pendingAvatarUrl ? { avatar_url: pendingAvatarUrl } : {}),
      }
      const phone = values.phone.trim() || null
      const savedProfile = await updateStudentProfile({
        userId,
        profilePatch,
        studentId,
        phone,
      })
      onSaved(savedProfile, phone)
    } catch (e) {
      setSaveError(e?.message ?? 'Could not save your profile. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group relative h-28 w-28 rounded-full ring-2 ring-forest/15 focus:outline-none focus:ring-forest/40"
          aria-label="Change profile photo"
        >
          {avatarPreview || avatarUrl ? (
            <img
              src={avatarPreview || avatarUrl}
              alt="You"
              className="h-28 w-28 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-28 w-28 items-center justify-center rounded-full bg-forest">
              <span className="font-display text-5xl leading-none text-sand">{initial}</span>
            </span>
          )}
          {/* Hover / upload overlay */}
          <span
            className={`absolute inset-0 flex items-center justify-center rounded-full bg-ink/45 text-[10px] font-semibold uppercase tracking-[0.15em] text-sand transition ${
              uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            {uploading ? 'Uploading…' : 'Change'}
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onPickAvatar}
          className="hidden"
        />
        {avatarError && <p className="mt-3 text-sm text-red-700">{avatarError}</p>}
      </div>

      {/* YOUR DETAILS — editable */}
      <section className="rounded-2xl border border-forest/12 bg-white p-6">
        <h3 className="mb-5 font-display text-2xl tracking-[0.04em] text-forest">
          Your Details
        </h3>
        <div className="space-y-5">
          <Field label="Full name">
            <input
              type="text"
              className={INPUT}
              value={values.full_name}
              onChange={(e) => set('full_name')(e.target.value)}
              placeholder="Your name"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className={`${INPUT} cursor-not-allowed bg-sand/40 text-ink/55`}
              value={initialValues.email ?? ''}
              disabled
              placeholder="—"
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              className={INPUT}
              value={values.phone}
              onChange={(e) => set('phone')(e.target.value)}
              placeholder="Your phone"
            />
          </Field>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Date of birth">
              <input
                type="date"
                className={INPUT}
                value={values.date_of_birth}
                onChange={(e) => set('date_of_birth')(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Gender">
            <Chips options={GENDERS} value={values.gender} onChange={set('gender')} />
          </Field>
        </div>
      </section>

      {/* YOUR GAME — editable */}
      <section className="rounded-2xl border border-forest/12 bg-white p-6">
        <h3 className="mb-5 font-display text-2xl tracking-[0.04em] text-forest">
          Your Game
        </h3>
        <div className="space-y-5">
          <Field label="Tennis level">
            <Chips options={LEVELS} value={values.tennis_level} onChange={set('tennis_level')} />
          </Field>
          <Field label="Dominant hand">
            <Chips options={HANDS} value={values.dominant_hand} onChange={set('dominant_hand')} />
          </Field>
          <Field label="Favorite surface">
            <Chips options={SURFACES} value={values.favorite_surface} onChange={set('favorite_surface')} />
          </Field>
          <Field label="Favorite player">
            <input
              type="text"
              className={INPUT}
              value={values.favorite_player}
              onChange={(e) => set('favorite_player')(e.target.value)}
              placeholder="e.g. Federer, Alcaraz..."
            />
          </Field>
        </div>
      </section>

      {saveError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving || uploading}
          className="rounded bg-forest px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-sand transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="text-[11px] font-semibold uppercase tracking-[0.15em] text-forest/55 underline underline-offset-4 hover:text-forest disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Shared bits ──────────────────────────────────────────────────────────────

const INPUT =
  'w-full rounded-md border border-forest/12 bg-white px-4 py-3 text-ink outline-none transition focus:border-forest'

function Avatar({ initial, avatarUrl, alt }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={alt}
        className="h-16 w-16 rounded-full object-cover ring-2 ring-forest/15 sm:h-28 sm:w-28"
      />
    )
  }
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-forest ring-2 ring-forest/15 sm:h-28 sm:w-28">
      <span className="font-display text-3xl leading-none text-sand sm:text-5xl">{initial}</span>
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-forest/45">
        {label}
      </dt>
      <dd className="text-right text-ink">{children}</dd>
    </div>
  )
}

function GameChip({ label, value }) {
  return (
    <div className="rounded-xl border border-forest/12 bg-sand/40 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-forest/45">
        {label}
      </p>
      <p className="mt-1 font-medium text-forest">
        {value && String(value).trim() ? value : '—'}
      </p>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-forest/45">
        {label}
      </label>
      {children}
    </div>
  )
}

/** Onboarding chip selector — pill row, solid forest when selected. */
function Chips({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const selected = value === o
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={`rounded-full border px-4 py-2.5 text-sm font-medium transition ${
              selected
                ? 'border-forest bg-forest text-sand'
                : 'border-forest/12 bg-white text-forest hover:border-forest'
            }`}
          >
            {o}
          </button>
        )
      })}
    </div>
  )
}
