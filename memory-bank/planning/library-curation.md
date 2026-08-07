# Curated Library — Video Curation v1

> Curation of external instructional videos for the student-facing Curated Library (`/library`).
> 37 videos across the 8 existing technique folders. All content in **English**.
> Written 2026-08-07. Nothing applied to Supabase — see "How to apply".

---

## 1. Scope and constraints

The Library screen (`src/screens/Library.jsx`) renders 8 hard-coded folders in coaching order:
`forehand · backhand · footwork · serve · volley · slice · smash · mentality`.
Each folder reads `curated_library` rows whose `category` matches the folder key (lowercase).
Today all 8 folders are empty and every student sees "Coming soon".

**Decisions carried into this curation** (agreed with the coach before research started):

| Decision | Value |
|---|---|
| Language | English only |
| Volume | 4–5 per folder (37 total) |
| Structure | Subtopics inside the existing 8 folders — no new categories |
| Delivery | This document + a reviewable `.sql` file; **no live database writes** |

---

## 2. Schema finding — there is no `description` column

`memory-bank/planning/roadmap-portal.md` (Phase 8E) shows an insert with a `description`
column. **That column does not exist.** The real table (`supabase/migrations/002_mvp_schema.sql`)
is:

```
curated_library (id, coach_id, title, category, external_url, source, created_at)
```

`LibraryCard` renders **only** `title` plus the embedded player. So the subtopic has nowhere
to live except the title.

**Title convention adopted: `<Subtopic> · <Channel>`** — e.g. `Swing Path & Topspin · Intuitive Tennis`.

Why this and not the raw YouTube title:
- The folder header already says the category, so repeating "Forehand" in every title is noise.
- Many source titles are clickbait ("It's NOT Linear", "Insane Backhand Power"). That reads
  off-brand next to the 55TC voice ("direct, no jargon").
- The embedded YouTube player shows the original title anyway, so nothing is hidden from
  the student — and the channel credit is explicit on the card.

The original titles are recorded in section 4 of this document, and are the authoritative
record of what each URL actually is.

**Recommendation (not implemented, out of scope):** add `description text` and/or `subtopic text`
to `curated_library`. It would let the card carry a one-line "why watch this" and let the
title stay clean. This is a schema change and needs its own plan + approval.

---

## 3. Method

1. **Search per subtopic**, starting from the four reference channels the coach named, then
   widening to other coaches, academies and instruction platforms.
2. **Verify every URL** through the YouTube oEmbed endpoint
   (`youtube.com/oembed?url=…&format=json`), which returns the real `title` and `author_name`.
   No URL entered this document without that check.
3. **Judge each video individually**, then balance the folder for teacher variety.

### Honest caveat about what "judged" means here

**The videos were not watched.** Selection is based on: channel and coach credentials, the
video's stated subject, its fit to the subtopic, and the reputation of the source. Titles and
channels are **verified fact**; pedagogical fit is a **reasoned judgment that the coach should
spot-check** before these go live to students. Watching one video per folder before publishing
would close this gap cheaply.

One selection was killed by the verification step: `tJPk71BJzLM`
("Your Forehand is Great, But Your MENTAL GAME is Losing You Matches") looked like a strong
mentality pick in search results but belongs to **Peak Performance Table Tennis** — a different
sport. It is excluded. That is the whole reason the verification pass exists.

### Selection rules applied

- Reference channels were the starting point, with **no quota** — no folder was padded to hit one.
- Ranked by clarity and usefulness to a club-level student, **not** by subscriber count or views.
- **Max 3 videos from one channel inside one category.** Forehand hit that ceiling and was
  rebalanced (a Top Tennis Training video replaced a fourth Intuitive Tennis pick).
- Teacher variety is deliberate: 11 distinct channels across 37 videos.

---

## 4. The curation

Legend: **Subtopic** → the title that goes in `curated_library.title` (with the channel).
"Source title" is the actual YouTube title, verified via oEmbed.

### 4.1 Forehand (5)

| # | Subtopic | Channel | Source title | URL |
|---|---|---|---|---|
| 1 | Fundamentals | Intuitive Tennis | How to Hit a Forehand \| Tennis Technique | https://www.youtube.com/watch?v=J96D3wqpd4E |
| 2 | Unit Turn & Preparation | Feel Tennis Instruction | Tennis Forehand Unit Turn - It's Not A Backswing | https://www.youtube.com/watch?v=vcWAEcF6klU |
| 3 | Swing Path & Topspin | Intuitive Tennis | The Intuitive Forehand Swing Path (It's NOT Linear) | https://www.youtube.com/watch?v=S6X4XN9rdJk |
| 4 | Power & Kinetic Chain | Top Tennis Training | Tennis Forehand Transformation - Technique For Maximum Power and Control | https://www.youtube.com/watch?v=-sZ3madzfoA |
| 5 | Inside-Out & Inside-In | Intuitive Tennis | How to Hit Inside Out & Inside In Forehand | https://www.youtube.com/watch?v=7kdaTE0c6Ak |

Why this set: a build order rather than five takes on the same swing — what the stroke is (1),
how the body gets ready (2), the shape of the swing (3), where the power comes from (4), and
finally aiming it (5). Feel Tennis is used for the unit turn on purpose: it frames preparation
as a body turn rather than a backswing, which is the correction most club players need.

### 4.2 Backhand (5)

| # | Subtopic | Channel | Source title | URL |
|---|---|---|---|---|
| 1 | Two-Hander Fundamentals | Top Tennis Training | Tennis Two Handed Backhand - 3 Steps To The Perfect Double Hander | https://www.youtube.com/watch?v=PBguk3yRPgI |
| 2 | Two-Hander Explained | 2MinuteTennis | How To Hit A Two Handed Backhand (Tennis Technique Explained) | https://www.youtube.com/watch?v=EMbM8DiI1vA |
| 3 | One-Hander Fundamentals | Meike Babel Tennis | Master the One-Handed Backhand in Tennis - Easy to follow instructions | https://www.youtube.com/watch?v=c65CK6TdT5Y |
| 4 | One-Hander in a Real Lesson | Online Tennis Instruction | Transform Your Backhand: Inside a Real Lesson with Florian Meier | https://www.youtube.com/watch?v=G9h2ZnOag9s |
| 5 | Two-Hander Power | Top Tennis Training | Insane Backhand Power in 3 Steps (Two-Hander) | https://www.youtube.com/watch?v=Lz7JGJNfkUc |

Why this set: the folder has to serve both grips, so it splits 3 two-handed / 2 one-handed.
Items 1 and 2 cover the same ground through two different teachers on purpose — students who
bounce off one explanation usually get it from the other. Item 4 is a filmed real lesson rather
than a piece-to-camera, which shows the correction process, not just the finished model.

### 4.3 Footwork (5)

| # | Subtopic | Channel | Source title | URL |
|---|---|---|---|---|
| 1 | Split Step Technique | Intuitive Tennis | How Perform the Tennis Split Step Intuitively | https://www.youtube.com/watch?v=TNO_bQBHv04 |
| 2 | Split Step Timing | Online Tennis Instruction | Tennis Footwork: Split-Step Timing Lesson | https://www.youtube.com/watch?v=zuLTHMubJws |
| 3 | Open, Neutral & Closed Stance | 2MinuteTennis | Open, Neutral, And Closed Stance Explained (Forehand And Backhand Tennis Footwork) | https://www.youtube.com/watch?v=8E5ln-ZCdTw |
| 4 | Recovering From Out Wide | Essential Tennis | How To Recover From Out Wide - Tennis Lesson | https://www.youtube.com/watch?v=_5lxOa9AJsU |
| 5 | Recovering Fast to the Middle | Top Tennis Training | Tennis Footwork \| How To Recover Fast \| 3 of 3 | https://www.youtube.com/watch?v=kwZDdsQgqcQ |

Why this set: split step is deliberately split into **technique** (1) and **timing** (2) —
doing it is easy, doing it at the right moment is the actual skill, and most students only ever
get taught the first half. Items 4 and 5 cover the half of footwork that never gets practised:
what happens *after* the shot. Five different channels, no repetition.

### 4.4 Serve (5)

| # | Subtopic | Channel | Source title | URL |
|---|---|---|---|---|
| 1 | Continental Grip | 2MinuteTennis | How To Serve With The Continental Grip (Improve Your Tennis Quickly) | https://www.youtube.com/watch?v=KKpDgeKG5OQ |
| 2 | The Toss | Online Tennis Instruction | Serve Toss Lesson with Online Tennis Instruction | https://www.youtube.com/watch?v=WJyJT-7Cspg |
| 3 | Pronation | Feel Tennis Instruction | 7 Serve Pronation Drills For A Better Tennis Serve | https://www.youtube.com/watch?v=-9cIObcQyME |
| 4 | Second Serve — Slice, Flat & Kick | Top Tennis Training | How To Hit The Perfect 2nd Serve in Tennis - Slice vs Flat vs Kick Tennis Serve Lesson | https://www.youtube.com/watch?v=20GhUFY27CU |
| 5 | Building a Kick Serve | Tom Avery Tennis | Tennis Serve - How To Develop A Topspin Kick Second Serve | https://www.youtube.com/watch?v=W4Ia5vkhJL8 |

Why this set: the serve is the stroke where the wrong first decision blocks everything after it,
so the folder runs in dependency order — grip, toss, pronation, then serve types. Item 3 is
drills rather than theory, which is what pronation actually needs. Items 4 and 5 pair a
"which second serve" overview with one deep build of the kick serve. Five different channels.

### 4.5 Volley (4)

| # | Subtopic | Channel | Source title | URL |
|---|---|---|---|---|
| 1 | Volley Feel & Contact | Feel Tennis Instruction | How To Hit A Tennis Volley - Tip For More Feel | https://www.youtube.com/watch?v=ixtikTVrpEY |
| 2 | Forehand & Backhand Volley | 2MinuteTennis | Hit Incredible Forehand And Backhand Volleys With These 5 Awesome Tips (Tennis Technique Explained) | https://www.youtube.com/watch?v=rpacFeUeioc |
| 3 | Backhand Volley | Meike Babel Tennis | Improve your backhand volley technique \| Tennis lesson | https://www.youtube.com/watch?v=E-G4T4ChW-8 |
| 4 | Approach Shot & Attacking the Net | Intuitive Tennis | How to Attack the Net \| Approach Shot & Volley Lesson w Shamir | https://www.youtube.com/watch?v=viUIvlUF5Bs |

Why this set: the volley fails at the contact point far more often than in the swing, so the
folder opens on feel (1) before mechanics (2). The backhand volley gets its own slot (3)
because it is the weaker wing for nearly every club player. Item 4 covers the part nobody
teaches: the volley is worthless if the approach that set it up was bad.

### 4.6 Slice (4)

| # | Subtopic | Channel | Source title | URL |
|---|---|---|---|---|
| 1 | Backhand Slice Fundamentals | Intuitive Tennis | Backhand Slice is The Easiest Shot in Tennis | https://www.youtube.com/watch?v=2ZpAyZvQ39A |
| 2 | Backhand Slice Grip & Technique | Essential Tennis | Tennis Lesson: Backhand Slice Grip & Technique | https://www.youtube.com/watch?v=CRkBSTc8234 |
| 3 | Backhand Slice Masterclass | Top Tennis Training | Tennis Backhand Slice Masterclass | https://www.youtube.com/watch?v=lv9qNBtN95k |
| 4 | Forehand Slice | Feel Tennis Instruction | Tennis Forehand Slice Technique: The Most Versatile Shot You're Not Using | https://www.youtube.com/watch?v=WXyzSxUhExo |

Why this set: three backhand slices at rising difficulty (fundamentals → grip and technique →
masterclass) plus the forehand slice, which almost no student has and which doubles as the
defensive squash-shot answer to a ball hit behind them. Four different channels.

### 4.7 Smash (4)

| # | Subtopic | Channel | Source title | URL |
|---|---|---|---|---|
| 1 | Overhead Technique | Top Tennis Training | Master Your Smash \| Tennis Overhead Smash Technique | https://www.youtube.com/watch?v=PdM6cmb3ef4 |
| 2 | Power & Control | Essential Tennis | OVERHEAD SMASH Tennis Lesson: Technique for POWER + CONTROL | https://www.youtube.com/watch?v=3C8a_ZBVwok |
| 3 | Never Miss an Overhead | PlayYourCourt | Tennis Overhead Smash Technique - How To Never Miss An Overhead Again | https://www.youtube.com/watch?v=NOMh7eK5HY4 |
| 4 | Three Simple Cues | 2MinuteTennis | Perfect Overhead Technique (3 Easy Tennis Tips) | https://www.youtube.com/watch?v=qENjaMTnCmc |

Why this set: the smash is the least-practised shot in club tennis, so the folder leans toward
**consistency over power** — item 3 is explicitly about not missing, and item 4 is a short
three-cue version a student can actually recall mid-point. Four different channels.

### 4.8 Mentality (5)

| # | Subtopic | Channel | Source title | URL |
|---|---|---|---|---|
| 1 | Playing Under Pressure | Essential Tennis | Play your BEST tennis under pressure! - Mental Toughness Lesson | https://www.youtube.com/watch?v=teZlZP_0gEg |
| 2 | Between-Point Routines | Aubone Tennis | A Key Element to Mental Toughness in Tennis: Routines In-Between Points | https://www.youtube.com/watch?v=awbsmYIgoVE |
| 3 | Calming Down On Court | Feel Tennis Instruction | How To Calm Down In Tennis | https://www.youtube.com/watch?v=NwbxznLExyQ |
| 4 | What To Focus On In a Match | Online Tennis Instruction | What To Focus On During A Match | https://www.youtube.com/watch?v=e6yGaShjtHo |
| 5 | Closing Out Matches | Meike Babel Tennis | Stop choking! Simple Mental Toughness strategies to close out tennis matches | https://www.youtube.com/watch?v=twMrBvmrUb0 |

Why this set: mentality is the folder most likely to fill with motivational filler, so every
pick had to be **actionable** — a routine, a breathing reset, a focus cue, a closing-out plan.
Item 2 is the anchor: between-point routine is the one mental skill that transfers immediately
without any talent for it. Five different channels.

---

## 5. Channel distribution

| Channel | Videos | Folders |
|---|---|---|
| Top Tennis Training | 7 | forehand, backhand ×2, footwork, serve, slice, smash |
| Intuitive Tennis | 6 | forehand ×3, footwork, volley, slice |
| 2MinuteTennis | 5 | backhand, footwork, serve, volley, smash |
| Feel Tennis Instruction | 5 | forehand, serve, volley, slice, mentality |
| Essential Tennis | 4 | footwork, slice, smash, mentality |
| Online Tennis Instruction | 4 | backhand, footwork, serve, mentality |
| Meike Babel Tennis | 3 | backhand, volley, mentality |
| Aubone Tennis | 1 | mentality |
| PlayYourCourt | 1 | smash |
| Tom Avery Tennis | 1 | serve |

**11 channels / 37 videos.** All four reference channels are represented (22 of 37 videos), but
none dominates: the largest single-channel share in any one folder is 3 (Intuitive Tennis in
forehand), which is the ceiling set by the rules. No folder is a single-channel folder.

---

## 6. New sources found, and why they are trustworthy

These are outside the four reference channels. Each was checked before being used.

| Source | Basis for trust |
|---|---|
| **Essential Tennis** (Ian Westermann) | Graduate of the Ferris State University Professional Tennis Management program and four-year college player there; 20+ years coaching; launched the first tennis instruction podcast (2008) and has run the channel since 2009 (~254k subscribers, ~2,000 videos); published author of *Essential Tennis* (Macmillan). Strong on structured, progression-based explanation. |
| **Meike Babel Tennis** | Former WTA professional — career-high **No. 27 singles / No. 45 doubles (1995)**, 19 Grand Slams, Fed Cup for Germany, WTA Rookie of the Year nominee (1992). Post-tour assistant coach for women's tennis at Tulane and Vanderbilt; now a teaching professional and mental-skills coach. The highest playing pedigree of any source used here, and the reason she carries the one-handed backhand and the closing-out-matches slots. |
| **2MinuteTennis** (Ryan Reidy) | USPTA Elite Professional; 1,200+ video library built around very short, single-idea lessons. Used deliberately where the value is a short cue a student can recall on court, not a deep dive. |
| **Aubone Tennis** (J.Y. Aubone) | Two-time All-American at Florida State, four years playing professionally, then four years contracting for USTA Player Development — travelling coach for Reilly Opelka through his rise from ~No. 229 to a career-high No. 19 ATP. His public work is specifically about performing under match pressure, which is exactly the mentality subtopic he was picked for. |
| **PlayYourCourt** (Scott Baxter) | RSPA Elite Certified Tennis Professional, 22+ years coaching, Division I player at the University of Maryland, top-100 national junior ranking; known in the industry for match toughness and simplifying technique. Used for the "never miss an overhead" consistency angle. |
| **Tom Avery Tennis / CTW Academy** | Tennis Director and Head Professional at CTW Academy (Naples, FL), 45+ years teaching from beginner to tour level; personally taught by Vic Braden. Long-standing video-instruction catalogue. Used for the kick-serve build. |

### Sources considered and rejected

- **Peak Performance Table Tennis** — different sport. Surfaced in a tennis mentality search
  and was caught by URL verification.
- Several one-off uploads from club/personal channels with no traceable coaching credential
  (e.g. a "Quail CreekCC" upload) — dropped in favour of an equivalent from a vetted source.
- Shorts and TikTok-format clips — excluded across the board; the Library embeds a full player
  and short vertical clips read as filler in that layout.

---

## 7. How to apply

The insert statements are in **`supabase/seeds/curated_library_v1.sql`** — a seed file, kept
deliberately **outside `supabase/migrations/`** so `supabase db push` will not pick it up.

It is idempotent: each row inserts only if no row with the same `external_url` already exists,
so re-running it is safe. `coach_id` is left NULL (the column is nullable and nothing reads it).
`source` is `'youtube'` for all 37 rows, which is what `youtubeId()` and `LibraryCard` expect
for an inline embed.

Applying it is a live production database write and therefore a coordinator action requiring
explicit approval — it is not covered by this document.

**Before publishing to students,** the recommended check is: apply, open `/library`, confirm all
8 folders show counts instead of "Coming soon", and spot-check that each embed plays inline
(a video with embedding disabled by its owner will show a player error — that is the one failure
mode this curation cannot detect without loading each page).

---

## 8. Known limitations

1. **The videos were not watched** (see section 3). Titles, channels and availability are
   verified; teaching quality is inferred.
2. **Link rot.** Any of these can be deleted or made private by its owner later. There is no
   monitoring for that. A periodic re-run of the oEmbed check over
   `select external_url from curated_library` would catch it cheaply.
3. **Embedding permission is unverified.** oEmbed confirms a video exists; it does not confirm
   the owner allows third-party embedding.
4. **No level tagging.** A beginner and a 4.0 player see the same shelf. `curated_library` has
   no level column, and adding one is a schema change.
5. **Subtopic lives in the title** because there is no column for it (section 2).
