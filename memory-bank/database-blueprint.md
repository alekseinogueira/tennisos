# Database Blueprint — TennisOS MVP

> Supabase Postgres. Architect for the future, implement only the MVP. Every table carries a
> `user_id` and has RLS enabled. `profiles` is the identity backbone; the 6 business tables
> below are the MVP. Timestamps are `timestamptz default now()`. IDs are `uuid default gen_random_uuid()`
> unless they mirror `auth.users`.

## Identity backbone (net-new, supports all RLS)

### profiles
| column     | type                         | notes |
|------------|------------------------------|-------|
| id         | uuid PK → auth.users(id)     | cascade on delete |
| role       | role_enum NOT NULL default 'student' | enum: student, coach, admin |
| email      | text NOT NULL                | linking key for invites |
| full_name  | text                         | |
| created_at | timestamptz default now()    | |
| *(8B onboarding, migration 004)* | | collected at `/claim` |
| dominant_hand | text                      | Right / Left / Both |
| tennis_level  | text                      | Never played / Beginner / Intermediate / Advanced |
| favorite_surface | text                   | Hard / Clay / Grass / No preference |
| favorite_player  | text                   | free text, optional |
| date_of_birth | date                      | |
| gender        | text                      | |
| avatar_url    | text                      | public URL into the `avatars` Storage bucket |
| term_accepted | boolean default false     | liability waiver accepted |
| term_accepted_at | timestamptz            | when accepted |

- Inserted by `handle_new_user()` trigger (security definer) on auth signup — no direct insert.
- **RLS:** SELECT own (`id = auth.uid()`) OR `is_coach()`. UPDATE own non-role fields; coach may
  update any row incl. role. INSERT: self-insert ONLY (`id = auth.uid()` AND `role = 'student'`,
  `profiles_insert_self`, migration `005`) — lets `/claim` upsert its own row as a fallback for the
  `handle_new_user` trigger, with no self-escalation. No client DELETE (auth.users cascade handles it).
- **Onboarding (8B):** `get_invite_student(email)` SECURITY DEFINER RPC (migration 004, granted to
  `anon`+`authenticated`) returns name/phone/email for an UNCLAIMED invite only, so the anonymous
  `/claim` page can pre-fill before signup (the `students` RLS would otherwise return nothing).
- **Storage:** public `avatars` bucket (migration 004); object path `{user_id}/avatar.{ext}`; storage
  RLS = public read, owner-only write/update/delete (first path segment must equal `auth.uid()`).

## MVP business tables

### students  (coach-managed roster; subject = student)
| column      | type                       | notes |
|-------------|----------------------------|-------|
| id          | uuid PK                    | |
| user_id     | uuid → auth.users(id) NULL | the student's auth id; NULL until invite claimed |
| email       | text NOT NULL              | used to auto-link on signup |
| full_name   | text NOT NULL              | |
| phone       | text                       | |
| status      | student_status default 'invited' | enum: invited, active, inactive |
| created_by  | uuid → auth.users(id)      | coach who created the row |
| created_at / updated_at | timestamptz    | |

- Rel: 1→0..1 with auth.users (via user_id); 1→* lesson_credits / feedbacks / videos.
- **RLS:** student SELECT/UPDATE own (`user_id = auth.uid()`, cannot change status); coach full CRUD.
  INSERT coach-only. (Coach-private freeform notes deferred to a future `student_notes` table to
  keep RLS row-level only — MVP `students` columns are student-safe.)

### packages  (offerings catalog; owner = coach)
| column           | type                  | notes |
|------------------|-----------------------|-------|
| id               | uuid PK               | |
| user_id          | uuid NOT NULL → auth.users(id) | owner coach |
| name             | text NOT NULL         | e.g. "Private x10" |
| lessons_included | int NOT NULL          | credits granted on purchase |
| price_cents      | int                   | nullable in MVP (Stripe later) |
| validity_days    | int                   | nullable |
| active           | boolean default true  | |
| created_at       | timestamptz           | |
| *(future)* stripe_price_id | text        | not in MVP |

- Rel: 1→* lesson_credits (package_id).
- **RLS:** coach full CRUD (`is_coach()`); students SELECT where `active = true`.

### lesson_credits  (credit ledger; subject = student)
| column      | type                       | notes |
|-------------|----------------------------|-------|
| id          | uuid PK                    | |
| user_id     | uuid NOT NULL → auth.users(id) | the student's auth id (subject) |
| student_id  | uuid NOT NULL → students(id)   | |
| package_id  | uuid → packages(id)        | nullable (manual adjustments) |
| delta       | int NOT NULL               | +granted / −used |
| reason      | credit_reason              | enum: purchase, lesson, adjustment, refund |
| note        | text                       | optional coach memo on the entry |
| created_by  | uuid → auth.users(id)      | who recorded it |
| created_at  | timestamptz                | |

- Balance = `SUM(delta)` per student, computed in `db.js` (`getCreditBalance`) — no cached column in MVP.
- Rel: *→1 students, *→0..1 packages.
- **RLS:** student SELECT own (`user_id = auth.uid()`); coach full CRUD. No student writes.

### feedbacks  (written lesson feedback; subject = student)
| column      | type                       | notes |
|-------------|----------------------------|-------|
| id          | uuid PK                    | |
| user_id     | uuid NOT NULL → auth.users(id) | the student's auth id (subject) |
| student_id  | uuid NOT NULL → students(id)   | |
| coach_id    | uuid → auth.users(id)      | author |
| title       | text                       | |
| body        | text NOT NULL              | the feedback content |
| lesson_date | date                       | |
| created_at / updated_at | timestamptz    | |

- Rel: *→1 students; *↔* videos via feedback_video_links.
- **RLS:** student SELECT own; coach full CRUD. Students read-only.

### student_gallery  (per-student PRIVATE lesson footage; subject = student)
| column           | type                    | notes |
|------------------|-------------------------|-------|
| id               | uuid PK                 | |
| user_id          | uuid NOT NULL → auth.users(id) | the student's auth id (subject) |
| student_id       | uuid NOT NULL → students(id)   | |
| coach_id         | uuid → auth.users(id)   | who added the clip |
| title            | text                    | |
| storage_path     | text                    | Supabase Storage object path (future upload) |
| external_url     | text                    | Drive/YouTube link (manual paste until upload lands) |
| source           | video_source default 'link' | enum: upload, youtube, link (future: n8n/agente_cortes) |
| external_ref     | text                    | id from an external producer (n8n) — future-friendly, nullable |
| duration_seconds | int                     | |
| created_at       | timestamptz             | |

- The student's own clips, added by the coach; visible only to that student.
- Rel: *→1 students; *↔* feedbacks via feedback_gallery_links.
- **RLS:** student SELECT own (`user_id = auth.uid()`); coach full CRUD. Future storage bucket
  `gallery`, object paths prefixed by `student_id`; storage RLS mirrors this table.

### curated_library  (GLOBAL coach-owned technical references; no subject)
| column       | type                    | notes |
|--------------|-------------------------|-------|
| id           | uuid PK                 | |
| coach_id     | uuid → auth.users(id)   | who curated it |
| title        | text NOT NULL           | |
| category     | text                    | free text — forehand, backhand, footwork, serve, … |
| external_url | text NOT NULL           | YouTube / external link |
| source       | video_source default 'link' | enum: youtube, link |
| created_at   | timestamptz             | |

- Reusable reference videos, not tied to any student. Organized by free-text `category`.
- Rel: *↔* feedbacks via feedback_library_links.
- **RLS:** ANY authenticated user may SELECT (browse); coach full CRUD.

### feedback_gallery_links  (join feedbacks ↔ student_gallery; denormalized user_id)
| column      | type                       | notes |
|-------------|----------------------------|-------|
| id          | uuid PK                    | |
| feedback_id | uuid NOT NULL → feedbacks(id) ON DELETE CASCADE | |
| gallery_id  | uuid NOT NULL → student_gallery(id) ON DELETE CASCADE | |
| user_id     | uuid NOT NULL              | **denormalized** = student subject (copied from feedback) |
| created_at  | timestamptz                | |
| UNIQUE(feedback_id, gallery_id) | | prevent dup links |

- **RLS:** student SELECT own (`user_id = auth.uid()`); coach full CRUD. Single-predicate policy.

### feedback_library_links  (join feedbacks ↔ curated_library; denormalized user_id)
| column      | type                       | notes |
|-------------|----------------------------|-------|
| id          | uuid PK                    | |
| feedback_id | uuid NOT NULL → feedbacks(id) ON DELETE CASCADE | |
| library_id  | uuid NOT NULL → curated_library(id) ON DELETE CASCADE | |
| user_id     | uuid NOT NULL              | **denormalized** = student subject the feedback is for |
| created_at  | timestamptz                | |
| UNIQUE(feedback_id, library_id) | | prevent dup links |

- **RLS:** student SELECT own (`user_id = auth.uid()`); coach full CRUD. Single-predicate policy.

## Relationship map
```
auth.users ─1:1─ profiles
auth.users ─1:0..1─ students (students.user_id)
students ─1:*─ lesson_credits, feedbacks, student_gallery
packages ─1:*─ lesson_credits (package_id)
feedbacks ─*:*─ student_gallery   (via feedback_gallery_links)
feedbacks ─*:*─ curated_library   (via feedback_library_links)
curated_library  (global; no student link)
```

## Enums
- `role_enum`: student, coach, admin
- `student_status`: invited, active, inactive
- `credit_reason`: purchase, lesson, adjustment, refund
- `video_source`: upload, youtube, link

## Built later (not MVP)
Stripe (`stripe_price_id`, checkout fn, credit-grant webhook), `student_notes` (coach-private),
`gallery` storage bucket + real upload (replaces manual external_url paste), n8n event webhooks,
scheduling.
