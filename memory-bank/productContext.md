# Product Context — TennisOS Personal V1

## Project Identity
TennisOS is the student portal + internal operating system for **55 Tennis Crew (55TC)**,
a tennis coaching business. V1 is a **personal, single-coach tool** — built for one coach
(me) to run lessons, track students, and handle the day-to-day of the business.

## Vision
A calm, branded home base where everything about coaching lives: students, schedules,
notes, progress, and the operational glue that today lives in scattered apps and my head.
Grow it one real feature at a time. It should feel like 55TC — not a generic SaaS dashboard.

## Decision Framework
Before building any feature, it must satisfy **at least 2 of these 3**:
1. **Real problem** — it solves a recurring pain I actually hit while coaching.
2. **Other coaches** — it would plausibly help other coaches, not just my exact setup.
3. **Reusable** — it's a reusable building block (a primitive others/future-me build on).

If a feature can't clear 2 of 3, it doesn't get built yet.

## Do NOT Build Yet
These are explicitly out of scope for V1. Do not start them, scaffold them, or design for them:
- Marketplace (coach/student matching, listings)
- Multi-coach SaaS (multi-tenant, team accounts, billing per coach)
- Court reservation / booking system
- Club management system
- Mobile app (native iOS/Android)

V1 stays a personal, single-coach web tool. Revisit this list only when V1 is solid.
