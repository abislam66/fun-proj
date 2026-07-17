# Conventions

> **OpenOwls SDD** — Read by engineers and the AI coding assistant.
> Defines how code is written on this project. These rules apply to every file, every session.
> Claude Code must follow these conventions without being reminded each time.

---

## Language & Framework Versions

| Technology | Version |
|------------|---------|
| TypeScript | 5.x, `strict: true` — no `any` (use `unknown` + narrowing) |
| Node.js | 22 LTS |
| Package manager | pnpm 10 (lockfile committed; `packageManager` field pinned) |
| Next.js | 15.x, App Router only (no `pages/`) |
| React | 19.x — Server Components by default; `'use client'` only where interaction demands it |
| Tailwind CSS | 4.x |
| Drizzle ORM + drizzle-kit | latest stable at project start, then upgraded deliberately (not automatically) |
| Zod | 4.x |
| MapLibre GL JS | 5.x |
| Supabase JS (`@supabase/ssr`) | latest stable — **auth flows only**, never data |
| Vitest | 3.x (unit/integration) |
| Playwright | 1.x (smoke E2E) |
| ESLint 9 (flat config) + Prettier | Prettier is authoritative on formatting — no style debates |

---

## Naming Conventions

| Context | Convention | Example |
|---------|------------|---------|
| Files & folders | kebab-case | `venue-card.tsx`, `open-status.ts` |
| React components | PascalCase, named exports | `VenueCard`, `FilterBar` |
| Hooks | `use` + camelCase | `useVenueFilters` |
| Server actions | verb-first camelCase | `submitRating`, `retireVenue` |
| Query functions (`lib/db/queries/`) | verb-first camelCase | `getPublishedVenues`, `getVenueBySlug` |
| DB tables | snake_case, plural | `venues`, `problem_reports` |
| DB columns | snake_case | `last_verified_at`, `zone_key` |
| Postgres enums | snake_case, singular | `venue_type`, `rating_status` |
| Zod schemas / inferred types | camelCase + `Schema` / PascalCase | `venueInputSchema` / `VenueInput` |
| Config constants | UPPER_SNAKE_CASE | `CAMPUS_BOUNDS`, `MAX_REVIEW_LENGTH` |
| Cache tags | lowercase, colon-scoped | `venues`, `venue:richies-lunch-box` |
| Branches | `feature/…`, `fix/…`, `chore/…` | `feature/venue-detail-page` |
| **Domain rule** | "truck" (or any venue type) appears **only** as a `venue.type` value — never in a table, route, component, or variable name | `VenueCard`, not `TruckCard` |

---

## File & Folder Conventions

- Follow the folder layout in `architecture-planning.md`.
- One primary type/module per file where practical; file name matches the type.
- Keep routes/handlers thin; put business logic in services.
- Only `lib/db/queries/` imports the Drizzle client; pages and actions call query functions, never Drizzle directly.
- Server actions live in `src/actions/` grouped by domain — never defined inline in components.
- Shared validation lives in `lib/validation/` and is imported by both the form and the action that receives it — one schema, two consumers.
- Config values (zones, cuisines, semester dates, bounds, rate limits) live in `src/config/` — never inlined as magic values at call sites.
- Named exports everywhere; `default export` only where Next.js requires it (pages, layouts, route handlers).

---

## Code Style

- Maximum line length: 100 characters.
- No commented-out code in commits — delete it, or leave a `TODO:` with an explanation.
- No leftover debug output in committed code — use proper logging.
- Prefer small, pure, testable functions.
- Early returns over nested conditionals.
- Comments explain *why*, not *what* — and domain surprises (wall-clock hours, the five gyro trucks, snapshot rules) get a pointer to the relevant spec.
- Dates/times: construct and compare in `America/New_York` via the `lib/hours.ts` helpers — raw `new Date()` arithmetic on venue hours is a bug by definition.

---

## Git Conventions

- Commit messages: `type: short description`
  - Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- Every feature on its own branch (`feature/...`); no direct commits to `main`.
- Solo-project review rule: PRs are self-reviewed — read the full diff before merging, with CI green as the hard gate. (If a collaborator ever joins, this upgrades to one human review.)
- Migrations are committed in the same PR as the code that needs them, and are backward-compatible with the previously deployed code (see `deployment.md`).

---

## Testing Conventions

- Every service/business-logic function has at least one test.
- Use descriptive test names that state the behavior under test.
- Tests must pass before any PR is merged.
- Test files are colocated: `open-status.test.ts` next to `open-status.ts`.
- **Priority order for test effort** (solo project — spend it where bugs hurt):
  1. `lib/hours.ts` — open-now across DST boundaries, midnight-spanning ranges, unknown hours, semester breaks.
  2. Authorization boundaries — anon can't write, member can't admin, struck member can't write, ownership predicates hold.
  3. Validation schemas — domain restriction (`@temple.edu` + lookalikes rejected), bounds, strictness.
  4. `lib/slug.ts` — collision handling (the gyro-truck test), immutability.
  5. Rate limiting — limits actually trigger.
- Playwright smoke suite stays small and critical-path: home loads with map + list, filter + share URL, venue detail renders, signup flow rejects a non-campus email.

---

## Continuous Integration

- CI runs on every pull request and must pass before merge.
- A failing lint, format, build, or test check **blocks the merge**.
- Full pipeline details live in `deployment.md`.
- The pipeline is: typecheck → ESLint → Prettier check → Vitest → build. Playwright smoke runs against the Vercel preview deployment.

---

## LLM / AI Conventions

- **Phase 1 ground truth: this codebase contains zero LLM code, dependencies, or keys.** The rules below activate only if `llm-integration.md` approves an AI feature.
- All prompts to the LLM live in a dedicated prompts module — never hardcoded inline.
- All LLM calls have error handling and a fallback response.
- Never send personally identifiable information (PII) to the LLM unless specs explicitly allow it.
- LLM calls are server-side only unless specs say otherwise.
- Any AI feature is isolated in `src/lib/ai/` behind one route handler — nothing else imports it (see `architecture-planning.md`).

---

## What Claude Code Should Never Do

- Never modify files in `Specs/` without explicit instruction.
- Never skip writing tests to save time.
- Never add a dependency not already declared without asking first.
- Never expose secrets in the client app or the repository.
- Never bypass access-control rules or trust client-supplied identity for authorization.
- Never implement later-phase features while the current phase is still incomplete, unless explicitly instructed.
- Never import the Drizzle client outside `lib/db` — go through query functions.
- Never introduce venue-type-specific naming into schema, routes, or components.
- Never hand-edit an already-applied migration in `drizzle/` — write a new one.
- Never weaken a Zod schema (loosen a bound, drop `strict`) to make a form submit — fix the caller.
