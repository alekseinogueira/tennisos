// Thin data-access layer (mirrors EPC's lib/db.js pattern).
//
// RULES (from architecture.md):
//   - Screens NEVER touch the supabase client for data — they call functions here.
//   - Every Supabase call is wrapped in a named async function.
//   - One unwrap() helper throws on error so callers use uniform try/catch.
//   - These functions return unwrapped data (rows/values), never { data, error }.
//
// RLS enforces who-can-see-what server-side; these functions assume the policies
// in supabase/migrations and simply express the query intent.
import { supabase } from './supabase'

/** Throw on a Supabase error, otherwise return the data. */
function unwrap({ data, error }) {
  if (error) throw error
  return data
}

// ─── profiles ────────────────────────────────────────────────────────────────

/** The current user's profile row (id, role, email, full_name). RLS: own row. */
export async function getProfile(userId) {
  return unwrap(
    await supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
  )
}

/** Idempotently ensure the caller's own profile row exists (id = auth.uid()).
 *  Belt-and-suspenders alongside the handle_new_user trigger. RLS: self-insert
 *  (role 'student' only) + own-row update. */
export async function upsertProfile(fields) {
  return unwrap(
    await supabase.from('profiles').upsert(fields, { onConflict: 'id' }).select().single(),
  )
}

/** Update a profile by id. RLS: a user may update their OWN row (non-role fields);
 *  a coach may update any row incl. role. */
export async function updateProfile(userId, patch) {
  return unwrap(
    await supabase.from('profiles').update(patch).eq('id', userId).select().single(),
  )
}

/** Save the student's editable profile. The identity fields live on `profiles`
 *  (own-row UPDATE via RLS); `phone` lives on the `students` roster row and is
 *  written separately — the two tables share no FK, only the auth id. Pass
 *  `studentId` to persist phone; omit it (no roster row) and phone is skipped.
 *  Returns the updated profile row. */
export async function updateStudentProfile({ userId, profilePatch, studentId, phone }) {
  const profile = await updateProfile(userId, profilePatch)
  if (studentId && phone !== undefined) {
    await updateStudent(studentId, { phone })
  }
  return profile
}

// ─── students (roster) ───────────────────────────────────────────────────────

/** Coach: full roster. Student: RLS narrows to their own row. */
export async function listStudents() {
  return unwrap(
    await supabase.from('students').select('*').order('full_name'),
  )
}

export async function getStudent(id) {
  return unwrap(
    await supabase.from('students').select('*').eq('id', id).single(),
  )
}

/** Resolve the logged-in student's roster row from their auth id. */
export async function getStudentByUserId(userId) {
  return unwrap(
    await supabase.from('students').select('*').eq('user_id', userId).maybeSingle(),
  )
}

/** Onboarding pre-fill: look up an unclaimed invited student by email via the
 *  get_invite_student RPC (SECURITY DEFINER — reachable by the anon claim visitor,
 *  unlike a direct table select which RLS blocks). Returns { full_name, phone, email }
 *  or null. */
export async function getStudentByEmail(email) {
  const rows = unwrap(await supabase.rpc('get_invite_student', { p_email: email }))
  return rows?.[0] ?? null
}

/** Home dashboard: the student's identity (profiles) + roster row (students),
 *  resolved from one auth id. profiles and students share no FK — they only
 *  share the auth user id (profiles.id = students.user_id) — so we fetch both
 *  in parallel and merge. Both helpers are null-safe (maybeSingle), so an
 *  incomplete or unclaimed student yields { profile, student } with null parts
 *  rather than throwing. */
export async function getStudentProfile(userId) {
  const [profile, student] = await Promise.all([
    getProfile(userId),
    getStudentByUserId(userId),
  ])
  return { profile, student }
}

/** Coach-only (RLS): create a roster row, pre-invite (user_id NULL). */
export async function createStudent(fields) {
  return unwrap(
    await supabase.from('students').insert(fields).select().single(),
  )
}

export async function updateStudent(id, patch) {
  return unwrap(
    await supabase.from('students').update(patch).eq('id', id).select().single(),
  )
}

// ─── packages (offerings catalog) ────────────────────────────────────────────

/** Coach: all packages. Student: RLS narrows to active = true. */
export async function listPackages() {
  return unwrap(
    await supabase.from('packages').select('*').order('name'),
  )
}

export async function createPackage(fields) {
  return unwrap(
    await supabase.from('packages').insert(fields).select().single(),
  )
}

export async function updatePackage(id, patch) {
  return unwrap(
    await supabase.from('packages').update(patch).eq('id', id).select().single(),
  )
}

// ─── lesson_credits (ledger) ─────────────────────────────────────────────────

/** Credit ledger rows for one student, newest first. */
export async function listCreditsForStudent(studentId) {
  return unwrap(
    await supabase
      .from('lesson_credits')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false }),
  )
}

/** Balance = SUM(delta). Computed client-side (no cached column in MVP). */
export async function getCreditBalance(studentId) {
  const rows = unwrap(
    await supabase.from('lesson_credits').select('delta').eq('student_id', studentId),
  )
  return rows.reduce((sum, r) => sum + r.delta, 0)
}

/**
 * Balances for the whole roster in ONE query, as a { [student_id]: balance }
 * map — avoids N+1 when rendering the student list. RLS still applies (coach
 * sees all; a student would see only their own rows).
 */
export async function getCreditBalances() {
  const rows = unwrap(
    await supabase.from('lesson_credits').select('student_id, delta'),
  )
  return rows.reduce((acc, r) => {
    acc[r.student_id] = (acc[r.student_id] ?? 0) + r.delta
    return acc
  }, {})
}

/** Coach/system-only (RLS): record a credit grant or use. */
export async function addCredit(fields) {
  return unwrap(
    await supabase.from('lesson_credits').insert(fields).select().single(),
  )
}

// ─── sessions (scheduled lessons; subject = student) ─────────────────────────

/** Upcoming sessions for one student (now and later), soonest first. Includes
 *  cancelled rows so the coach still sees them (rendered visually distinct). */
export async function listUpcomingSessionsForStudent(studentId) {
  return unwrap(
    await supabase
      .from('sessions')
      .select('*')
      .eq('student_id', studentId)
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true }),
  )
}

/** Coach-only (RLS): schedule a session. */
export async function createSession(fields) {
  return unwrap(
    await supabase.from('sessions').insert(fields).select().single(),
  )
}

/** Coach-only (RLS): cancel a session (soft — sets status, keeps the row). */
export async function cancelSession(id) {
  return unwrap(
    await supabase
      .from('sessions')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single(),
  )
}

/** Active roster students, A→Z — feeds the schedule-training picker. */
export async function listActiveStudents() {
  return unwrap(
    await supabase
      .from('students')
      .select('id, user_id, full_name, email')
      .eq('status', 'active')
      .order('full_name'),
  )
}

/** Coach-only (RLS): schedule a group training — one row per student, all
 *  sharing the same group_id so the whole training can be managed as one. */
export async function createSessionsGroup(rows) {
  return unwrap(await supabase.from('sessions').insert(rows).select())
}

/** Coach-only (RLS): apply the same patch to every session row of a training
 *  (by id list) — reschedule/edit hits the whole group at once. */
export async function updateSessions(ids, patch) {
  return unwrap(
    await supabase.from('sessions').update(patch).in('id', ids).select(),
  )
}

/** Coach-only (RLS): cancel a whole training (soft — sets status on all rows). */
export async function cancelSessions(ids) {
  return updateSessions(ids, { status: 'cancelled' })
}

/** The single next upcoming scheduled session for a student (status 'scheduled',
 *  in the future), soonest first, or null. RLS: a student sees only their own. */
export async function getNextSession(studentId) {
  const rows = unwrap(
    await supabase
      .from('sessions')
      .select('*')
      .eq('student_id', studentId)
      .eq('status', 'scheduled')
      .gt('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(1),
  )
  return rows?.[0] ?? null
}

// ─── coach dashboard (HQ) ────────────────────────────────────────────────────

const MS_PER_DAY = 864e5

function startOfMonthISO(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}
function startOfNextMonthISO(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString()
}

/** Count of active students (status = 'active'). Coach RLS sees the whole roster. */
export async function countActiveStudents() {
  const { count, error } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
  if (error) throw error
  return count ?? 0
}

/** Count of sessions in the current calendar month (scheduled or completed —
 *  cancelled excluded). Month boundaries are local to the coach. */
export async function countSessionsThisMonth() {
  const { count, error } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .in('status', ['scheduled', 'completed'])
    .gte('scheduled_at', startOfMonthISO())
    .lt('scheduled_at', startOfNextMonthISO())
  if (error) throw error
  return count ?? 0
}

/** Count of feedbacks PUBLISHED in the current calendar month — a draft awaiting
 *  review isn't a feedback given yet. */
export async function countFeedbacksThisMonth() {
  const { count, error } = await supabase
    .from('feedbacks')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published')
    .gte('created_at', startOfMonthISO())
    .lt('created_at', startOfNextMonthISO())
  if (error) throw error
  return count ?? 0
}

/** Recent activity for the HQ feed: the last 5 feedbacks given + last 5 sessions
 *  scheduled, merged and sorted newest-first by when the action happened
 *  (created_at). Each item carries what the feed row needs to render. */
export async function listRecentActivity() {
  const [feedbacks, sessions] = await Promise.all([
    unwrap(
      await supabase
        .from('feedbacks')
        .select('id, title, created_at, student:students(full_name)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(5),
    ),
    unwrap(
      await supabase
        .from('sessions')
        .select('id, scheduled_at, location, created_at, student:students(full_name)')
        .order('created_at', { ascending: false })
        .limit(5),
    ),
  ])

  const items = [
    ...feedbacks.map((f) => ({
      id: `f-${f.id}`,
      kind: 'feedback',
      at: f.created_at,
      student_name: f.student?.full_name ?? 'Student',
      title: f.title,
    })),
    ...sessions.map((s) => ({
      id: `s-${s.id}`,
      kind: 'session',
      at: s.created_at,
      student_name: s.student?.full_name ?? 'Student',
      scheduled_at: s.scheduled_at,
      location: s.location,
    })),
  ]
  items.sort((a, b) => b.at.localeCompare(a.at))
  return items
}

/** Sessions in the next 14 days (now → +14d), soonest first. Includes cancelled
 *  rows (rendered distinct). Joins name + email so group actions can re-email
 *  the roster. Feeds the HQ "Upcoming Trainings" block (Fase F1, Etapa 2). */
export async function listUpcomingSessions14d() {
  const now = new Date()
  const end = new Date(now.getTime() + 14 * MS_PER_DAY)
  return unwrap(
    await supabase
      .from('sessions')
      .select(
        'id, student_id, group_id, scheduled_at, duration_minutes, location, status, student:students(full_name, email)',
      )
      .gte('scheduled_at', now.toISOString())
      .lt('scheduled_at', end.toISOString())
      .order('scheduled_at', { ascending: true }),
  )
}

/** The coach's "feedback due" accountability list: students whose most recent
 *  FINISHED session in the last 14 days has no feedback recorded after it.
 *  A session counts as finished when status='completed' OR it's a past
 *  'scheduled' session (cancelled excluded) — the app has no "mark completed"
 *  action yet, so a past scheduled session is treated as having happened.
 *  Returns one row per student (their most recent uncovered session), newest
 *  session first: { student_id, student_name, session_at, location }. Reused for
 *  the AWAITING FEEDBACK metric (its length) and the HQ Awaiting Feedback list.
 *  A DRAFT counts as coverage on purpose: the session's feedback exists and sits
 *  in the Feedback Due (drafts) block — listing it here too would double-nag. */
export async function listPendingFeedback() {
  const now = new Date()
  const since = new Date(now.getTime() - 14 * MS_PER_DAY).toISOString()
  const nowIso = now.toISOString()

  const [sessions, feedbacks] = await Promise.all([
    unwrap(
      await supabase
        .from('sessions')
        .select('id, student_id, scheduled_at, location, student:students(full_name)')
        .neq('status', 'cancelled')
        .gte('scheduled_at', since)
        .lte('scheduled_at', nowIso)
        .order('scheduled_at', { ascending: false }),
    ),
    unwrap(
      await supabase
        .from('feedbacks')
        .select('student_id, created_at')
        .gte('created_at', since),
    ),
  ])

  const fbByStudent = new Map()
  for (const f of feedbacks) {
    const arr = fbByStudent.get(f.student_id) ?? []
    arr.push(f.created_at)
    fbByStudent.set(f.student_id, arr)
  }

  const seen = new Set() // sessions are newest-first → first hit per student is their latest
  const due = []
  for (const s of sessions) {
    if (seen.has(s.student_id)) continue
    seen.add(s.student_id)
    const covered = (fbByStudent.get(s.student_id) ?? []).some((c) => c > s.scheduled_at)
    if (covered) continue // a feedback after their latest session → up to date
    due.push({
      student_id: s.student_id,
      student_name: s.student?.full_name ?? 'Student',
      session_at: s.scheduled_at,
      location: s.location,
    })
  }
  return due
}

/** Coach-only in practice (a student's RLS can't see drafts): the AI-generated
 *  feedbacks awaiting review, newest first. Feeds the HQ "Feedback Due" block
 *  (Fase F1, Etapa 3). Joins the student name for the list row. */
export async function listDraftFeedbacks() {
  return unwrap(
    await supabase
      .from('feedbacks')
      .select('id, title, lesson_date, created_at, student:students(full_name)')
      .eq('status', 'draft')
      .order('created_at', { ascending: false }),
  )
}

// ─── feedbacks ───────────────────────────────────────────────────────────────

export async function listFeedbacksForStudent(studentId) {
  return unwrap(
    await supabase
      .from('feedbacks')
      .select('*')
      .eq('student_id', studentId)
      .order('lesson_date', { ascending: false, nullsFirst: false }),
  )
}

export async function getFeedback(id) {
  return unwrap(
    await supabase.from('feedbacks').select('*').eq('id', id).single(),
  )
}

/** The single most recent feedback for a student (lesson_date desc, then
 *  created_at), or null if none. RLS: a student sees only their own. */
export async function getLastFeedback(studentId) {
  const rows = unwrap(
    await supabase
      .from('feedbacks')
      .select('*')
      .eq('student_id', studentId)
      .order('lesson_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(1),
  )
  return rows?.[0] ?? null
}

export async function createFeedback(fields) {
  return unwrap(
    await supabase.from('feedbacks').insert(fields).select().single(),
  )
}

export async function updateFeedback(id, patch) {
  return unwrap(
    await supabase.from('feedbacks').update(patch).eq('id', id).select().single(),
  )
}

/** Coach-only (RLS): publish a feedback — persist the (possibly edited) coach's
 *  analysis and flip status so the student's RLS lets them see it. Callers that
 *  want the student notified follow up with sendFeedbackPublishedEmail(). */
export async function publishFeedback(id, patch = {}) {
  return updateFeedback(id, { ...patch, status: 'published' })
}

/** Coach-only (Edge Function guard): draft the coach's analysis with Claude.
 *  invoke() attaches the coach's JWT, which generate-feedback-analysis verifies
 *  (role coach/admin) before spending API credits. Returns the analysis text. */
export async function generateFeedbackAnalysis({ student_name, fields, history }) {
  const { data, error } = await supabase.functions.invoke(
    'generate-feedback-analysis',
    { body: { student_name, fields, history } },
  )
  if (error) throw error
  if (!data?.analysis) throw new Error('The AI returned no analysis.')
  return data.analysis
}

/** Notify a student their feedback is live. The send-feedback-email guard
 *  accepts the coach's JWT (Fase F2) in addition to n8n's service-role key. */
export async function sendFeedbackPublishedEmail(payload) {
  const { data, error } = await supabase.functions.invoke('send-feedback-email', {
    body: payload,
  })
  if (error) throw error
  return data
}

// ─── student_gallery (per-student PRIVATE lesson footage) ────────────────────

/** A student's own clips, newest first. RLS: student sees own; coach sees all. */
export async function listGalleryForStudent(studentId) {
  return unwrap(
    await supabase
      .from('student_gallery')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false }),
  )
}

/** Coach-only (RLS): add a clip to a student's gallery (external_url for now). */
export async function createGalleryClip(fields) {
  return unwrap(
    await supabase.from('student_gallery').insert(fields).select().single(),
  )
}

export async function deleteGalleryClip(id) {
  return unwrap(
    await supabase.from('student_gallery').delete().eq('id', id).select(),
  )
}

// ─── curated_library (GLOBAL coach-owned technical references) ───────────────

/** Every reference video. RLS: any authenticated user may browse; coach CRUD. */
export async function listLibrary() {
  return unwrap(
    await supabase
      .from('curated_library')
      .select('*')
      .order('category', { nullsFirst: false })
      .order('title'),
  )
}

export async function createLibraryItem(fields) {
  return unwrap(
    await supabase.from('curated_library').insert(fields).select().single(),
  )
}

export async function deleteLibraryItem(id) {
  return unwrap(
    await supabase.from('curated_library').delete().eq('id', id).select(),
  )
}

// ─── feedback links (gallery + curated library) ──────────────────────────────

/** Gallery clips attached to one feedback (joined through the link table). */
export async function listGalleryForFeedback(feedbackId) {
  const rows = unwrap(
    await supabase
      .from('feedback_gallery_links')
      .select('clip:student_gallery(*)')
      .eq('feedback_id', feedbackId),
  )
  return rows.map((r) => r.clip)
}

/** Curated-library items attached to one feedback (joined through the link table). */
export async function listLibraryForFeedback(feedbackId) {
  const rows = unwrap(
    await supabase
      .from('feedback_library_links')
      .select('item:curated_library(*)')
      .eq('feedback_id', feedbackId),
  )
  return rows.map((r) => r.item)
}

/** Link a gallery clip to a feedback. user_id is the denormalized student subject. */
export async function linkGalleryToFeedback({ feedbackId, galleryId, userId }) {
  return unwrap(
    await supabase
      .from('feedback_gallery_links')
      .insert({ feedback_id: feedbackId, gallery_id: galleryId, user_id: userId })
      .select()
      .single(),
  )
}

/** Link a curated-library item to a feedback. user_id is the denormalized subject. */
export async function linkLibraryToFeedback({ feedbackId, libraryId, userId }) {
  return unwrap(
    await supabase
      .from('feedback_library_links')
      .insert({ feedback_id: feedbackId, library_id: libraryId, user_id: userId })
      .select()
      .single(),
  )
}

export async function unlinkGalleryFromFeedback(feedbackId, galleryId) {
  return unwrap(
    await supabase
      .from('feedback_gallery_links')
      .delete()
      .eq('feedback_id', feedbackId)
      .eq('gallery_id', galleryId)
      .select(),
  )
}

export async function unlinkLibraryFromFeedback(feedbackId, libraryId) {
  return unwrap(
    await supabase
      .from('feedback_library_links')
      .delete()
      .eq('feedback_id', feedbackId)
      .eq('library_id', libraryId)
      .select(),
  )
}

// ─── storage (avatars) ───────────────────────────────────────────────────────

/** Upload (or replace) the user's avatar in the public "avatars" bucket at
 *  {userId}/avatar.{ext} and return its public URL. Storage RLS scopes writes to
 *  the user's own {userId}/ folder. */
export async function uploadAvatar(userId, file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${userId}/avatar.${ext}`
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
}
