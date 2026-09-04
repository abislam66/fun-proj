# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

**TuEats** — an unofficial, mobile-first web app for finding every non-meal-plan food option around Temple University's main campus (food trucks first, later restaurants/cafes/vending machines), with verified-student ratings and reviews.

The project is **spec-first**: `Specs/` is a complete, mutually consistent SDD and is the source of truth for every decision. **Implementation is underway at milestone ① (truck directory)**: schema, Drizzle queries, admin server actions, real Supabase auth, and the public map/list UI are built and wired to a real database; milestone ① is not yet complete (venue hours/cuisine enrichment and content curation are ongoing — see `Context/progress.md`). When code and specs appear to disagree, the specs win; flag the conflict rather than improvising.

**Never modify files in `Specs/` without explicit instruction** (this rule is itself in `Specs/conventions.md`).

## Working files (`Context/`)

- `Context/progress.md` — running log, newest entries first. Add a dated entry after any meaningful unit of work (this satisfies the progress rule in `Specs/conventions.md`), and keep the "Current status / Next up" block at the top accurate — it is the fastest way for a fresh session to orient.
- `Context/backlog.md` — deliberately deferred items, each with a revisit trigger. Add a row whenever something is skipped "for later"; scan the triggers when planning new work. It is not a roadmap — planned work lives in `Specs/features.md`.
- `Context/decisions.md` — append-only log of decisions too small for a `Specs/` change but important enough that silently reversing them would cause confusion (the _why_, not the _what_ or _when_). Add an entry whenever you make a call like this; check it before "fixing" something that looks broken but might be intentional.
- New markdown docs (beyond `Specs/`, which stays spec-first) default into `Context/` rather than the repo root — e.g. `Context/DESIGN.md`. `CLAUDE.md` itself stays at the root since Claude Code only auto-loads it from there.

## Which spec answers what

| Question                                                                           | Read                             |
| ---------------------------------------------------------------------------------- | -------------------------------- |
| Scope, goals, milestones, constraints                                              | `Specs/overview.md`              |
| Domain facts, business rules, pitfalls (gyro-truck dedup, wall-clock hours, zones) | `Specs/domain-knowledge.md`      |
| What to build, per phase, with acceptance criteria                                 | `Specs/features.md`              |
| Stack, folder layout, schema, caching, write path                                  | `Specs/architecture-planning.md` |
| Auth, roles, PII rules, security hard rules                                        | `Specs/auth-security.md`         |
| Versions, naming, style, test priorities                                           | `Specs/conventions.md`           |
| Environments, migrations, CI/CD, env vars                                          | `Specs/deployment.md`            |
| AI features (deferred + gated — do not implement)                                  | `Specs/llm-integration.md`       |
| Visual / UI decisions (colors, type, pins, motion)                                 | `Context/DESIGN.md`              |

## Design System

Always read `Context/DESIGN.md` before making any visual or UI decisions.
All font choices, colors, spacing, map/pin treatment, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match `Context/DESIGN.md`.
Pin assets and MapLibre notes live in `public/pins/` and `docs/design/map-and-pins.md`.

## Commands

pnpm-based, per `Specs/deployment.md`: `dev`, `build`, `lint`, `typecheck`, `format:check`, `db:generate`, `db:migrate` (never auto-run in builds), `seed:kml`, `test` (Vitest), `test:e2e` (Playwright).

## Architecture (the shape everything must fit)

Single Next.js App Router app on Vercel + Supabase (Postgres + Auth). No separate backend. Stack pins: TypeScript strict, React 19 (server components by default), Tailwind 4, Drizzle ORM, Zod 4, MapLibre GL + OpenFreeMap.

Load-bearing rules that span files:

- **Single write path**: every mutation is a server action running validate (Zod, strict) → authorize (`requireUser`/`requireAdmin`) → rate-limit (Postgres-backed) → write (Drizzle) → `revalidateTag`. The browser never touches the DB. Admin auth is email/password via server actions (`signInAdmin`/`signOutAdmin`), no OTP code-exchange callback needed. The one deliberate exception is `src/app/auth/callback/route.ts` — member Google OAuth's redirect handshake has no server-action equivalent (see `Specs/auth-security.md`). Don't add another route handler without the same kind of justification.
- **Data access is server-only Drizzle**, and only `src/lib/db/queries/` imports the Drizzle client. `supabase-js` is for auth flows exclusively — never data. Supabase's PostgREST surface is neutralized with deny-all RLS. The service-role key is used nowhere.
- **Everything is venue-generic**: "truck" (or any venue type) appears only as a `venue.type` value — never in table, route, or component names (`/eat/[slug]`, `VenueCard`). This is the "platform-ready" goal; violating it recreates a future migration.
- **"Open now" is computed client-side** from shipped hours so public pages stay static/ISR. Hours are local wall-clock (`America/New_York`) via `lib/hours.ts` — never UTC instants.
- **Caching is event-driven**: tags `venues` and `venue:{slug}`, invalidated by the writes that change them. No TTLs, no cron.
- **Venues are retired, never deleted** (`status: draft → published → retired`); slugs are immutable after publish and collision-suffixed.
- **Auth**: two separate surfaces. Admin — email/password via Supabase Auth (`signInAdmin`), never OTP/magic-link. Member — self-service Google OAuth via Supabase Auth, open to any Google account (no `@temple.edu` restriction), auto-creating a `profiles` row (`role: "member"`) on first sign-in through the one deliberate route handler in the app, `src/app/auth/callback/route.ts`. Authentication and authorization are always separate: a successful sign-in of either kind only proves identity, never grants admin access — `requireAdmin()` separately requires a `profiles` row with `role: "admin"`, set only via direct DB access (`Specs/auth-security.md`). Browsing the map/search/filters never requires login; opening an individual venue's detail page (`/eat/[slug]`) does, enforced server-side in the page component, not just a click handler (reversed 2026-08-28 from the original "no login-walling" rule — see `Context/decisions.md`). Signed-in members have a private `/account` page (name, username, class year, their ratings/reviews). Ratings/reviews and the member photo queue exist; venue proposals are still a later phase.
- **PII**: email lives only in Supabase `auth.users`; display name is the only identity on public reviews; username and class year live on the private `/account` page (not public profiles); raw IPs never stored (salted hash); user geolocation never leaves the browser; user content rendered as plain text only (`dangerouslySetInnerHTML` banned). No profile photos.
- **No LLM anything** (deps, keys, `src/lib/ai/`, UI hooks) until the four-condition gate in `Specs/llm-integration.md` is passed.
- **Phase discipline**: don't implement later-phase features while the current milestone is incomplete. Build order: ① truck directory → ② accounts + ratings/reviews/proposals → ③ new venue types.
- **Google ratings are manual snapshots** entered by the admin (numbers + capture date only, auto-hidden after 12 months). Never add automated collection of Google data, and never copy review text.

## Environments

Two Supabase projects: `tueats-prod` (existing Pro org — backups, no pausing) and `tueats-dev` (separate free org) — local dev and all Vercel previews use dev; only production uses prod. Migrations: dev first, then prod, always **migrate → deploy**, backward-compatible one release.
