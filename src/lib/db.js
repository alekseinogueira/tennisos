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

/** Coach-only: update any profile (e.g. promote role). Students can't reach this. */
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

// ─── videos ──────────────────────────────────────────────────────────────────

export async function listVideosForStudent(studentId) {
  return unwrap(
    await supabase
      .from('videos')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false }),
  )
}

export async function createVideo(fields) {
  return unwrap(
    await supabase.from('videos').insert(fields).select().single(),
  )
}

export async function updateVideo(id, patch) {
  return unwrap(
    await supabase.from('videos').update(patch).eq('id', id).select().single(),
  )
}

// ─── feedback_video_links (join) ─────────────────────────────────────────────

/** Videos attached to one feedback (joined through the link table). */
export async function listVideosForFeedback(feedbackId) {
  const rows = unwrap(
    await supabase
      .from('feedback_video_links')
      .select('video:videos(*)')
      .eq('feedback_id', feedbackId),
  )
  return rows.map((r) => r.video)
}

/** Link a video to a feedback. user_id is the denormalized student subject. */
export async function linkVideoToFeedback({ feedbackId, videoId, userId }) {
  return unwrap(
    await supabase
      .from('feedback_video_links')
      .insert({ feedback_id: feedbackId, video_id: videoId, user_id: userId })
      .select()
      .single(),
  )
}

export async function unlinkVideoFromFeedback(feedbackId, videoId) {
  return unwrap(
    await supabase
      .from('feedback_video_links')
      .delete()
      .eq('feedback_id', feedbackId)
      .eq('video_id', videoId)
      .select(),
  )
}
