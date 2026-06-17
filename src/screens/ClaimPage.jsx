// src/screens/ClaimPage.jsx
// Phase 8B onboarding — 4-step claim flow. 1:1 translation of the approved
// prototype (CSS kept verbatim in a scoped <style>; removed on unmount).
//
// Flow: ?email= pre-fills Step 1 → signUp (creates the auth user; handle_new_user
// creates the profile + links the roster row by email) → profile UPDATEs in
// steps 1-3 (RLS: own row) → avatar to Storage bucket "avatars" → portal.
//
// NOTE: profiles has no client INSERT policy, so every persist is an UPDATE of
// the row the trigger already created. Steps 2-4 require an active session, so
// the project must have email confirmation disabled.
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getStudentByEmail, updateProfile, upsertProfile, uploadAvatar } from '../lib/db'
import TennisOSWordmark from '../components/TennisOSWordmark'

const HANDS = ['Right', 'Left', 'Both']
const LEVELS = ['Never played', 'Beginner', 'Intermediate', 'Advanced']
const SURFACES = ['Hard', 'Clay', 'Grass', 'No preference']
const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say']

function humanAuthError(err) {
  const m = (err?.message || '').toLowerCase()
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'You already have an account. Head to sign in instead.'
  return err?.message || 'Something went wrong. Try again.'
}

export default function ClaimPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const emailParam = params.get('email') || ''

  const [step, setStep] = useState(1)

  // Step 1
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState(emailParam)
  const [phone, setPhone] = useState('') // pre-fill only; no profiles column to persist to
  const [password, setPassword] = useState('')

  // Step 2
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [hand, setHand] = useState('Right') // prototype default
  const [level, setLevel] = useState('')
  const [surface, setSurface] = useState('')
  const [favPlayer, setFavPlayer] = useState('')

  // Step 3
  const [termChecked, setTermChecked] = useState(false)

  const [userId, setUserId] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  // Best-effort pre-fill from the roster row via the get_invite_student RPC
  // (SECURITY DEFINER — works for the anonymous claim visitor; email from the URL).
  useEffect(() => {
    if (!emailParam) return
    let active = true
    ;(async () => {
      try {
        const s = await getStudentByEmail(emailParam)
        if (active && s) {
          setFullName(s.full_name || '')
          setPhone(s.phone || '')
          if (s.email) setEmail(s.email)
        }
      } catch {
        /* degrade to email-only pre-fill */
      }
    })()
    return () => {
      active = false
    }
  }, [emailParam])

  function barClass(n) {
    if (n === step) return 'step-bar active'
    if (n < step) return 'step-bar done'
    return 'step-bar'
  }

  function onPickPhoto(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setPhotoFile(f)
    setPhotoPreview(URL.createObjectURL(f))
  }

  async function submitStep1(e) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Use at least 8 characters for your password.')
      return
    }
    setBusy(true)
    try {
      const { data, error: signErr } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (signErr) throw signErr
      // Steps 2-4 (and the upsert below) need an active session. With email
      // confirmation ON, signUp returns no session — fail loud and clear.
      if (!data.session) {
        setError('Check your email to confirm your account, then open your invite link again.')
        return
      }
      const uid = data.user?.id ?? null
      setUserId(uid)
      // Guarantee the profile row exists (don't rely solely on the trigger).
      await upsertProfile({ id: uid, email, full_name: fullName, role: 'student' })
      setStep(2)
    } catch (err) {
      setError(humanAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  async function submitStep2() {
    setError(null)
    setBusy(true)
    try {
      const patch = {
        date_of_birth: dob || null,
        gender: gender || null,
        dominant_hand: hand || null,
        tennis_level: level || null,
        favorite_surface: surface || null,
        favorite_player: favPlayer.trim() || null,
      }
      if (photoFile && userId) {
        patch.avatar_url = await uploadAvatar(userId, photoFile)
      }
      if (userId) await updateProfile(userId, patch)
      setStep(3)
    } catch (err) {
      setError(err?.message ?? 'Could not save your profile. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function submitStep3() {
    setError(null)
    setBusy(true)
    try {
      if (userId) {
        await updateProfile(userId, {
          term_accepted: true,
          term_accepted_at: new Date().toISOString(),
        })
      }
      setStep(4)
    } catch (err) {
      setError(err?.message ?? 'Could not save. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="claim-root">
      <style>{STYLES}</style>

      <div className="header">
        <TennisOSWordmark />
      </div>

      <div className="progress-wrap">
        <div className="progress-steps">
          <div className={barClass(1)} />
          <div className={barClass(2)} />
          <div className={barClass(3)} />
          <div className={barClass(4)} />
        </div>
      </div>

      <div className="main">
        {/* STEP 1 */}
        {step === 1 && (
          <form className="step visible" onSubmit={submitStep1}>
            <div className="step-label">Step 1 of 4</div>
            <div className="step-title">CREATE YOUR ACCOUNT</div>
            <div className="field">
              <label>Full Name</label>
              <input
                type="text"
                className="prefilled"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                className="prefilled"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
              />
            </div>
            <div className="field">
              <label>Phone</label>
              <input
                type="tel"
                className="prefilled"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Your phone"
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                autoComplete="new-password"
              />
            </div>
            {error && <p className="form-error">{error}</p>}
            <div className="btn-row">
              <button className="btn-primary" type="submit" disabled={busy}>
                {busy ? 'CREATING…' : 'NEXT →'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="step visible">
            <div className="step-label">Step 2 of 4</div>
            <div className="step-title">YOUR TENNIS PROFILE</div>

            <div
              className="photo-upload"
              onClick={() => fileRef.current?.click()}
              style={
                photoPreview
                  ? {
                      backgroundImage: `url(${photoPreview})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      border: 'none',
                    }
                  : undefined
              }
            >
              {!photoPreview && (
                <>
                  <span className="photo-icon">📷</span>
                  <span>
                    Add
                    <br />
                    photo
                  </span>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onPickPhoto}
              style={{ display: 'none' }}
            />

            <div className="field-row">
              <div className="field">
                <label>Date of Birth</label>
                <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
              </div>
              <div className="field">
                <label>Gender</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="">Select</option>
                  {GENDERS.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label>Dominant Hand</label>
              <Chips options={HANDS} value={hand} onChange={setHand} />
            </div>
            <div className="field">
              <label>Tennis Level</label>
              <Chips options={LEVELS} value={level} onChange={setLevel} />
            </div>
            <div className="field">
              <label>Favorite Surface</label>
              <Chips options={SURFACES} value={surface} onChange={setSurface} />
            </div>
            <div className="field">
              <label>Favorite Player (optional)</label>
              <input
                type="text"
                value={favPlayer}
                onChange={(e) => setFavPlayer(e.target.value)}
                placeholder="e.g. Federer, Alcaraz..."
              />
            </div>

            {error && <p className="form-error">{error}</p>}
            <div className="btn-row">
              <button className="btn-primary" onClick={submitStep2} disabled={busy}>
                {busy ? 'SAVING…' : 'NEXT →'}
              </button>
              <button className="btn-skip" onClick={() => setStep(3)} disabled={busy}>
                Skip
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="step visible">
            <div className="step-label">Step 3 of 4</div>
            <div className="step-title">BEFORE WE START</div>
            <div className="term-box">
              I confirm that I am physically able to participate in tennis training sessions
              and take full responsibility for my health and safety during all activities. I
              understand that tennis involves physical effort and accept the associated risks.
              I agree to inform my coach of any physical limitations, injuries, or medical
              conditions before each session.
            </div>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={termChecked}
                onChange={(e) => setTermChecked(e.target.checked)}
              />
              <span>I have read and agree to the above statement.</span>
            </label>
            {error && <p className="form-error">{error}</p>}
            <div className="btn-row">
              <button
                className="btn-primary"
                style={
                  termChecked && !busy
                    ? undefined
                    : { opacity: 0.4, pointerEvents: 'none' }
                }
                onClick={submitStep3}
              >
                {busy ? 'SAVING…' : 'NEXT →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <div className="step visible">
            <div className="welcome">
              <div className="welcome-icon">🎾</div>
              <div className="welcome-title">YOU'RE IN.</div>
              <div className="welcome-sub">
                Your profile is set. Time to get on the court and start building your game.
              </div>
              <button
                className="btn-primary"
                style={{ maxWidth: 240, margin: '0 auto', display: 'block' }}
                onClick={() => navigate('/')}
              >
                GO TO MY PORTAL →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Chips({ options, value, onChange }) {
  return (
    <div className="chips">
      {options.map((o) => (
        <div
          key={o}
          className={`chip${value === o ? ' selected' : ''}`}
          onClick={() => onChange(o)}
        >
          {o}
        </div>
      ))}
    </div>
  )
}

const STYLES = `
  :root { --forest: #1C3526; --sand: #F5EDE0; --ink: #0D0D0D; --muted: rgba(28,53,38,0.45); --border: rgba(28,53,38,0.12); }
  .claim-root * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: var(--sand); font-family: 'DM Sans', Arial, sans-serif; min-height: 100vh; -webkit-font-smoothing: antialiased; }
  .claim-root { font-family: 'DM Sans', Arial, sans-serif; }
  .header { background: var(--forest); padding: 20px 32px; display: flex; align-items: center; }
  .header svg { height: 24px; width: auto; display: block; overflow: visible; }
  .progress-wrap { background: var(--forest); padding: 8px 32px 16px; }
  .progress-steps { display: flex; gap: 6px; }
  .step-bar { height: 2px; flex: 1; border-radius: 2px; background: rgba(245,237,224,0.15); transition: background 0.3s; }
  .step-bar.active { background: var(--sand); }
  .step-bar.done { background: rgba(245,237,224,0.5); }
  .main { max-width: 520px; margin: 0 auto; padding: 40px 24px 80px; }
  .step-label { font-size: 10px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
  .step-title { font-family: 'Bebas Neue', 'Arial Black', sans-serif; font-size: 40px; color: var(--forest); letter-spacing: 1.5px; line-height: 1; margin-bottom: 28px; }
  .field { margin-bottom: 20px; }
  .field label { display: block; font-size: 10px; font-weight: 600; letter-spacing: 2.5px; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
  .field input, .field select { width: 100%; padding: 14px 16px; background: white; border: 1px solid var(--border); border-radius: 6px; font-family: 'DM Sans', Arial, sans-serif; font-size: 15px; color: var(--ink); appearance: none; outline: none; transition: border-color 0.2s; }
  .field input:focus, .field select:focus { border-color: var(--forest); }
  .field input.prefilled { background: #f8f6f1; color: var(--forest); }
  .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
  .chip { padding: 10px 18px; border: 1px solid var(--border); border-radius: 100px; font-size: 13px; font-weight: 500; color: var(--forest); background: white; cursor: pointer; transition: all 0.15s; user-select: none; }
  .chip:hover { border-color: var(--forest); }
  .chip.selected { background: var(--forest); color: var(--sand); border-color: var(--forest); }
  .photo-upload { width: 100px; height: 100px; border-radius: 50%; border: 2px dashed var(--border); display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; background: white; gap: 6px; transition: border-color 0.2s; margin-bottom: 28px; }
  .photo-upload:hover { border-color: var(--forest); }
  .photo-upload span { font-size: 10px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); text-align: center; line-height: 1.3; }
  .photo-icon { font-size: 24px; }
  .term-box { background: white; border: 1px solid var(--border); border-radius: 8px; padding: 20px; font-size: 13px; color: var(--forest); line-height: 1.7; max-height: 160px; overflow-y: auto; margin-bottom: 16px; }
  .checkbox-row { display: flex; align-items: flex-start; gap: 12px; cursor: pointer; }
  .checkbox-row input[type=checkbox] { width: 18px; height: 18px; flex-shrink: 0; accent-color: var(--forest); margin-top: 2px; cursor: pointer; }
  .checkbox-row span { font-size: 13px; color: var(--forest); line-height: 1.5; }
  .btn-row { display: flex; gap: 12px; margin-top: 32px; align-items: center; }
  .btn-primary { flex: 1; padding: 16px; background: var(--forest); color: var(--sand); border: none; border-radius: 4px; font-family: 'DM Sans', Arial, sans-serif; font-size: 12px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; cursor: pointer; transition: opacity 0.2s; }
  .btn-primary:hover { opacity: 0.88; }
  .btn-skip { font-size: 12px; font-weight: 500; color: var(--muted); letter-spacing: 1px; cursor: pointer; background: none; border: none; padding: 8px; text-decoration: underline; text-underline-offset: 3px; }
  .welcome { text-align: center; padding: 48px 0; }
  .welcome-icon { font-size: 48px; margin-bottom: 20px; }
  .welcome-title { font-family: 'Bebas Neue', sans-serif; font-size: 48px; color: var(--forest); letter-spacing: 2px; margin-bottom: 12px; }
  .welcome-sub { font-size: 15px; color: var(--muted); line-height: 1.6; max-width: 320px; margin: 0 auto 32px; }
  .form-error { color: #b3261e; font-size: 13px; margin-top: 12px; }
`
