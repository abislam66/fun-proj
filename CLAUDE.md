# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

**TuEats** — an unofficial, mobile-first web app for finding every non-meal-plan food option around Temple University's main campus (food trucks first, later restaurants/cafes/vending machines), with verified-student ratings and reviews.

The project is **spec-first**: `Specs/` is a complete, mutually consistent SDD and is the source of truth for every decision. **No application code exists yet** — implementation starts at milestone ① (truck directory). When code and specs appear to disagree, the specs win; flag the conflict rather than improvising.

**Never modify files in `Specs/` without explicit instruction** (this rule is itself in `Specs/conventions.md`).

## Working files (`Context/`)

- `Context/progress.md` — running log, newest entries first. Add a dated entry after any meaningful unit of work (this satisfies the progress rule in `Specs/conventions.md`), and keep the "Current status / Next up" block at the top accurate — it is the fastest way for a fresh session to orient.
- `Context/backlog.md` — deliberately deferred items, each with a revisit trigger. Add a row whenever something is skipped "for later"; scan the triggers when planning new work. It is not a roadmap — planned work lives in `Specs/features.md`.

## Which spec answers what

| Question | Read |
|---|---|
| Scope, goals, milestones, constraints | `Specs/overview.md` |
| Domain facts, business rules, pitfalls (gyro-truck dedup, wall-clock hours, zones) | `Specs/domain-knowledge.md` |
| What to build, per phase, with acceptance criteria | `Specs/features.md` |
| Stack, folder layout, schema, caching, write path | `Specs/architecture-planning.md` |
| Auth, roles, PII rules, security hard rules | `Specs/auth-security.md` |
| Versions, naming, style, test priorities | `Specs/conventions.md` |
| Environments, migrations, CI/CD, env vars | `Specs/deployment.md` |
| AI features (deferred + gated — do not implement) | `Specs/llm-integration.md` |
| Visual / UI decisions (colors, type, pins, motion) | `DESIGN.md` |

## Design System

Always read `DESIGN.md` before making any visual or UI decisions.
All font choices, colors, spacing, map/pin treatment, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match `DESIGN.md`.
Pin assets and MapLibre notes live in `public/pins/` and `docs/design/map-and-pins.md`.

## Commands

No build exists yet. The spec'd script conventions (`Specs/deployment.md`) to implement at scaffolding, pnpm-based: `dev`, `db:generate`, `db:migrate` (never auto-run in builds), `seed:kml`, `test` (Vitest), `test:e2e` (Playwright).

## Architecture (the shape everything must fit)

Single Next.js App Router app on Vercel + Supabase (Postgres + Auth). No separate backend. Stack pins: TypeScript strict, React 19 (server components by default), Tailwind 4, Drizzle ORM, Zod 4, MapLibre GL + OpenFreeMap.

Load-bearing rules that span files:

- **Single write path**: every mutation is a server action running validate (Zod, strict) → authorize (`requireUser`/`requireAdmin`) → rate-limit (Postgres-backed) → write (Drizzle) → `revalidateTag`. The browser never touches the DB. The only route handler is `/auth/callback`.
- **Data access is server-only Drizzle**, and only `src/lib/db/queries/` imports the Drizzle client. `supabase-js` is for auth flows exclusively — never data. Supabase's PostgREST surface is neutralized with deny-all RLS. The service-role key is used nowhere.
- **Everything is venue-generic**: "truck" (or any venue type) appears only as a `venue.type` value — never in table, route, or component names (`/eat/[slug]`, `VenueCard`). This is the "platform-ready" goal; violating it recreates a future migration.
- **"Open now" is computed client-side** from shipped hours so public pages stay static/ISR. Hours are local wall-clock (`America/New_York`) via `lib/hours.ts` — never UTC instants.
- **Caching is event-driven**: tags `venues` and `venue:{slug}`, invalidated by the writes that change them. No TTLs, no cron.
- **Venues are retired, never deleted** (`status: draft → published → retired`); slugs are immutable after publish and collision-suffixed.
- **Auth**: passwordless email OTP to `@temple.edu` only (enforced in our `requestSignup` action, not a dashboard setting); no social logins ever — they'd bypass the campus-mailbox trust model. Browsing never requires login; auth gates writes only.
- **PII**: email lives only in Supabase `auth.users`; display name is the only user field in any payload; raw IPs never stored (salted hash); user geolocation never leaves the browser; user content rendered as plain text only (`dangerouslySetInnerHTML` banned).
- **No LLM anything** (deps, keys, `src/lib/ai/`, UI hooks) until the four-condition gate in `Specs/llm-integration.md` is passed.
- **Phase discipline**: don't implement later-phase features while the current milestone is incomplete. Build order: ① truck directory → ② accounts + ratings/reviews/proposals → ③ new venue types.
- **Google ratings are manual snapshots** entered by the admin (numbers + capture date only, auto-hidden after 12 months). Never add automated collection of Google data, and never copy review text.

## Environments

Two Supabase projects: `tueats-prod` (existing Pro org — backups, no pausing) and `tueats-dev` (separate free org) — local dev and all Vercel previews use dev; only production uses prod. Migrations: dev first, then prod, always **migrate → deploy**, backward-compatible one release.
