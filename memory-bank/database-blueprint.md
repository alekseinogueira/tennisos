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

- Inserted by `handle_new_user()` trigger (security definer) on auth signup — no direct insert.
- **RLS:** SELECT own (`id = auth.uid()`) OR `is_coach()`. UPDATE own non-role fields; coach may
  update any row incl. role. No client INSERT/DELETE.

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

### videos  (subject = student)
| column           | type                    | notes |
|------------------|-------------------------|-------|
| id               | uuid PK                 | |
| user_id          | uuid NOT NULL → auth.users(id) | the student's auth id (subject) |
| student_id       | uuid NOT NULL → students(id)   | |
| coach_id         | uuid → auth.users(id)   | |
| title            | text                    | |
| storage_path     | text                    | Supabase Storage object path (uploads) |
| external_url     | text                    | for youtube/link sources |
| source           | video_source default 'link' | enum: upload, youtube, link (future: n8n/agente_cortes) |
| external_ref     | text                    | id from an external producer (n8n) — future-friendly, nullable |
| duration_seconds | int                     | |
| created_at       | timestamptz             | |

- Rel: *→1 students; *↔* feedbacks via feedback_video_links.
- **RLS:** student SELECT own; coach full CRUD. Storage bucket `videos`, object paths prefixed
  by `student_id`; storage RLS mirrors this table.

### feedback_video_links  (join feedbacks ↔ videos; denormalized user_id)
| column      | type                       | notes |
|-------------|----------------------------|-------|
| id          | uuid PK                    | (or composite PK feedback_id+video_id) |
| feedback_id | uuid NOT NULL → feedbacks(id) ON DELETE CASCADE | |
| video_id    | uuid NOT NULL → videos(id) ON DELETE CASCADE    | |
| user_id     | uuid NOT NULL              | **denormalized** = student subject (copied from feedback) |
| created_at  | timestamptz                | |
| UNIQUE(feedback_id, video_id) | | prevent dup links |

- **RLS:** student SELECT own (`user_id = auth.uid()`); coach full CRUD. `user_id` denormalized
  so the policy is a single predicate (no EXISTS-join), set by the writing code/coach UI.

## Relationship map
```
auth.users ─1:1─ profiles
auth.users ─1:0..1─ students (students.user_id)
students ─1:*─ lesson_credits, feedbacks, videos
packages ─1:*─ lesson_credits (package_id)
feedbacks ─*:*─ videos  (via feedback_video_links)
```

## Enums
- `role_enum`: student, coach, admin
- `student_status`: invited, active, inactive
- `credit_reason`: purchase, lesson, adjustment, refund
- `video_source`: upload, youtube, link

## Built later (not MVP)
Stripe (`stripe_price_id`, checkout fn, credit-grant webhook), `student_notes` (coach-private),
n8n event webhooks, scheduling.
