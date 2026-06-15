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
    await supabase.from('profiles').select('*').eq('id', userId).single(),
  )
}

/** Update a profile by id. RLS: a user may update their OWN row (non-role fields);
 *  a coach may update any row incl. role. */
export async function updateProfile(userId, patch) {
  return unwrap(
    await supabase.from('profiles').update(patch).eq('id', userId).select().single(),
  )
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
