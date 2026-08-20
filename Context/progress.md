# Progress Log

> Newest entries first. One dated entry per meaningful unit of work.
> Keep the **Current status / Next up** block accurate — it's the session-start orientation point.

---

## Current status

- **Phase:** Phase 1 implementation. Public reads, anonymous reports, admin auth, and admin venue CRUD are all wired to real Drizzle/Supabase (`tueats-dev`) — no mock data paths remain anywhere in the app. 69 real venues (from the curated `TuEats.kml` export) are seeded and published. Campus MapLibre map (cuisine pins, locate, attribution, curated 2D building footprints) is in place.
- **Admin auth is email/password**, not OTP/magic-link — the OTP flow never completed a real session end-to-end (see `Context/decisions.md`'s 2026-08-18 entries) and was replaced outright. Authorization is unchanged: `requireAdmin()` still requires a `profiles` row with `role: "admin"`, granted only via direct DB access. `Specs/auth-security.md` now documents this V1 model (anonymous public / password admin(s) / future OTP student accounts) and explicitly allows for more than one admin account — no more spec/implementation mismatch.
- **Live admin login:** `abislam64@gmail.com` (not `@temple.edu` — admin isn't domain-restricted, see spec). Password was set directly via Supabase Dashboard → Authentication → Users → Add User (password field right in that dialog, "Auto Confirm User" checked) — deliberately bypassing email/SMTP entirely after the custom-SMTP password-recovery path proved unreliable (intermittent `535 "Invalid username"` SMTP auth failures against Resend, one confirmed success sandwiched between many failures — never fully root-caused, see `Context/decisions.md`). The original `tur67594@temple.edu` account was deleted; its orphaned `profiles` row was deleted and replaced with one for the new account's `auth.users.id`.
- **Pending:** a second admin account for a friend — email not yet provided by the user ("will look later"). Same no-email bootstrap process once it's available: Supabase Dashboard → Add User (with password) → tell me the email + desired display name → I grant `role: "admin"` via direct DB insert. No code changes needed for any number of admins — `profiles.role` is a per-row flag, not a singleton.
- **Password recovery** (`/admin/reset-password`, "Forgot password?" on the sign-in page) is fully implemented and spec-documented, but **not confirmed working end-to-end** — the custom SMTP (Resend) setup behind it is still flaky. Not currently blocking anything since admin bootstrap no longer depends on it; worth finishing later if self-service reset is wanted.
- **Known gaps:** every seeded venue is missing `hours`/`cuisines`/`zoneKey` (the KML source only carries name + coordinates) — pins show the "Food" fallback and the UI shows "Hours unknown" until an admin enriches each one via `/admin`. ~12-15 seeded entries are national chains (Chick-fil-A, 7-Eleven, etc.) stored with `type: "truck"` since the seed script hardcodes it — needs a reclassification pass. See `Context/decisions.md` for why the KML seed source, the admin-publish path, and the auth mechanism changed this session, and `Context/backlog.md` for deferred items.
- **Next up:**
  1. Confirm `abislam64@gmail.com` can sign in at `/admin/sign-in` and reach the real dashboard.
  2. When the friend's email is available: repeat the Add-User + DB-grant bootstrap for their account.
  3. Use the real `/admin` to enrich hours/cuisine/zone for the 69 seeded venues and reclassify mis-typed chain entries.
  4. Fix `tests/e2e/home.spec.ts` — still asserts against pre-migration mock venue names; deferred by explicit scope choice.
  5. Continue frontend polish against `DESIGN.md` where needed (optional Maputnik Positron fork; per-building hero tints).

---

## 2026-08-18 — Password recovery flow (Supabase token delivery fixed)

The first real password-reset attempt (dashboard-triggered) landed on the
homepage with no way to set a new password — Supabase delivers recovery
tokens in the URL **fragment**, which the app had no code to read anywhere.
Full root cause and fix in `Context/decisions.md`. Summary: added
`/admin/reset-password` (client-side token exchange via `setSession`/
`verifyOtp`, then a server-action password update via `updateAdminPassword`),
a "Forgot password?" self-service trigger on `/admin/sign-in`
(`requestPasswordReset`), and a small safety-net redirect
(`recovery-redirect.tsx`) that forwards stray recovery tokens landing on any
other page to the reset screen — needed because Supabase's dashboard-triggered
reset always uses the project's Site URL (this app's homepage) with no way to
override it. No callback route was restored; both token formats Supabase can
send are handled entirely client-side plus one server action for the actual
write. `requireAdmin()`/`profiles.role` authorization is untouched — a
recovery session can only ever change that one account's password.

`Specs/auth-security.md` also got an explicit rewrite (permission granted)
to describe the actual V1 model instead of the stale OTP-for-everyone text:
anonymous public browsing, password-only admin auth with authentication/
authorization kept separate, and a clearly-marked **not-implemented** future
phase for verified-student OTP accounts.

Verified without real admin credentials (Playwright + `pnpm` checks):
public site loads with no auth, `/admin` redirects unauthenticated visitors,
`/admin/reset-password` shows a graceful "link expired" state with no
session/tokens present (doesn't crash, doesn't get bounced by middleware),
wrong password still rejected on sign-in, zero console errors. `typecheck` /
`lint` / `test` (34 tests) / `build` all pass.

**Not verified** (needs the account owner): a real recovery email actually
landing on `/admin/reset-password` and successfully setting a password, then
signing in with it. The stale email already received won't work even now —
it points at the homepage with no handler for a same-page reset; a fresh one
via the in-app "Forgot password?" link is needed after the redirect URL is
allow-listed (see `ACTION REQUIRED` in the current status block above).

---

## 2026-08-18 — Admin auth: OTP/magic-link → email + password

The OTP admin sign-in built earlier this session never actually completed a
session (`auth.users.last_sign_in_at` stayed `null` across every real attempt,
confirmed by direct query) — root cause traced to Supabase's PKCE flow
requiring the same browser/device for request and click, which real-world
email checking (often on a different device) and corporate link-scanners
(Office 365 Safe Links) both break. Replaced outright per explicit product
decision: `signInAdmin(email, password)` via `supabase.auth.signInWithPassword()`,
`signOutAdmin()`, a "Sign out" control added to the admin header (didn't
exist before). Deleted the OTP-only `/auth/callback` route handler,
`requestSignup` action, `assertSignupAllowed` rate limiter, and
`SIGNUP_RATE_LIMIT` config. Dropped `otp_requests` via a proper migration
(`drizzle/0002_drop_otp_requests.sql`).

Verified without needing real admin credentials: public homepage loads with
no auth, `/admin` redirects unauthenticated visitors, the sign-in form is
email+password only (no OTP UI left), a wrong password is rejected with a
generic "Invalid login credentials" message (no user enumeration), zero
console errors — all via a live Playwright run against the dev server.
`pnpm typecheck` / `lint` / `test` (34 tests) / `build` all pass in a clean,
isolated run (dev server stopped, `.next` cleared first — running `next dev`
and `next build` concurrently against the same `.next` directory produces
spurious webpack module-resolution errors; not a real bug, just don't do
both at once).

Not yet verified (needs the account owner, who alone knows/sets the real
password): correct-password sign-in, sign-out invalidating a real session,
session persistence across a refresh. See `Context/decisions.md` for the full
rationale and the `Specs/auth-security.md` conflict this creates.

---

## 2026-08-18 — Real DB wiring, KML seed, and admin cutover

Ran a full engineering audit (kept out of this log — see conversation/plan history) that found the app split between a fully-built server side (schema, Drizzle queries, server actions, real Supabase auth plumbing) and a public/admin UI still running entirely on mock data. Closed that gap:

- Migrated `tueats-dev`, wired the public homepage and venue detail page to real `getPublishedVenues`/`getVenueBySlug` queries, removed `MOCK_VENUES` from both.
- Ran `seed:kml` against the curated local `TuEats.kml` export (75 placemarks, 69 unique after dedup) — see `Context/decisions.md` for why the seed source changed from a live Google My Maps URL to this local file.
- Built the real admin sign-in flow (`requestSignup` server action, `@temple.edu`-gated, Postgres-backed rate limit via a new `otp_requests` table) and cut the admin dashboard/venue editor over from the `localStorage` mock store to the real `src/actions/admin.ts` write path. Deleted `admin-mock.ts`, `admin-mock-store.ts`, `admin-mock.test.ts`, `mock-sign-in.tsx`.
- Hit and fixed two real bugs: a `DIRECT_DATABASE_URL` pointed at Supabase's IPv6-only direct host (fails on networks without IPv6 — repointed at the pooler's session-mode port), and a `.next/cache` staleness issue where a direct-SQL write bypassed `revalidateTag` and kept serving stale data across dev-server restarts. Both documented in `Context/decisions.md`.
- Verification: `pnpm typecheck`, `pnpm lint`, `pnpm test` (35 tests), `pnpm build` all pass. `pnpm format:check` fails across ~75 files (including untouched ones) due to a pre-existing `core.autocrlf`/Prettier LF mismatch on this Windows checkout — not a regression from this session.
- Explicitly deferred: `tests/e2e/home.spec.ts` (still asserts mock venue names), hours/cuisine enrichment content work, chain-restaurant type reclassification.

---

## 2026-07-20 — Custom campus buildings (2D MapLibre overlay)

Explored how to tweak the map stack for per-building design. OpenFreeMap Positron / OpenMapTiles `building` tiles are anonymous (no names), so Maputnik forks alone cannot style “Charles Library” vs “Engineering.” Recommended approach: mute stock footprints and overlay curated GeoJSON with per-feature paint tokens. Seeded 52 named Temple buildings from OSM, added `CampusBuildingLayer`, and documented options in `docs/design/campus-buildings.md`.

---

## 2026-07-18 — Campus MapLibre map + cuisine pins

Replaced the explorer map placeholder with a client-only MapLibre map locked to Temple campus bounds (OpenFreeMap Positron). Cuisine-pill HTML markers, list↔pin hover/selection sync, pin mini-card → detail, custom zoom + locate (browser-only blue dot), and quiet OSM/OpenFreeMap attribution. Public `Venue` fixtures now carry `lat`/`lng`.

---

## 2026-07-17 — Nearby landmark location context

Added optional nearby-building context to venue locations using the existing building/landmark field. Explorer rows now pair the campus corridor with a landmark (for example, “Montgomery Avenue · Near Student Center”), detail pages show the landmark beneath the street location, and the admin editor exposes a clearer nearby-landmark label.

---

## 2026-07-17 — Venue row visual corrections

Updated venue cuisine tags to use the Cherry Compass selected-chip palette, aligned filter-chip corners with the cuisine-tag shape, removed the redundant Explore navigation link, and simplified the wordmark by removing its trailing dot. Payment UI now treats cash as the baseline: only cash-only vendors get a warning chip beside cuisine tags, while the useful filter asks whether a venue accepts cards. Detail verification copy now reads “Last updated.”

---

## 2026-07-17 — Phase 1 mock-functional UI complete

Built the Cherry Compass frontend across the responsive explorer, URL-persisted search and filters, mobile sheet detents, venue detail/report flow, about page, mock admin OTP flow, dense venue editor, lifecycle controls, and problem-report queue. The desktop explorer uses an intentional list/map split; the map side is an isolated placeholder with no MapLibre or pin implementation.

Verification passed: TypeScript, ESLint, Prettier, 32 Vitest tests, production build, and 4 Chromium Playwright flows covering desktop filtering, mobile sheet behavior, detail/report/back-state, and admin sign-in/editing.

---

## 2026-07-17 — Phase 1 UI foundation

Scaffolded the Next.js 15, React 19, strict TypeScript, Tailwind 4 toolchain and minimal App Router shell. Added self-hosted design fonts and CSS tokens, venue-generic domain types, cuisine and zone configuration, typed mock fixtures, and mock venue/report/admin repository contracts.

---

## 2026-07-17 — Desktop as first-class layout

Updated `DESIGN.md`: mobile-first priority unchanged, but desktop (≥1024) is an intentional **split explorer** (list + map, synced hover/selection, no bottom-sheet chrome). Portfolio/hiring-manager viewport called out; anti-patterns for stretched-mobile desktop added. Type scale and motion notes include desktop.

---

## 2026-07-17 — Cuisine-label pins

Pins are **cuisine pills** only (Halal, Mex, Amer, Chin, Fruit, Carib, Food). Open status removed from pin chrome — lives on list/mini-card. Updated `DESIGN.md`, `public/pins/`, `docs/design/map-and-pins.md`, preview. Mid-fi design system still; not final product pixels.

---

## 2026-07-17 — Pin redesign (beacon)

Preview pins failed to render (broken relative `<img>` paths) and the CSS teardrop mock looked dated. Replaced with **beacon** pins (solid head + sharp stem, no inner hole), inlined SVGs in `docs/design/previews/cherry-compass.html`, updated `public/pins/*`, `DESIGN.md`, and `docs/design/map-and-pins.md`.

---

## 2026-07-17 — Cherry Compass UI design system

Design consultation from `Specs/overview.md` + `Specs/features.md` + competitive research. Direction locked and documented:

- **`DESIGN.md`** — source of truth: Cherry Compass aesthetic, Temple-adjacent cherry `#9D2235` on cool stone neutrals, Cabinet Grotesk + Satoshi + JetBrains Mono, map+bottom-sheet IA, Framer + deferred GSAP motion budget, anti-patterns (no Temple marks, no cream+serif AI default, no photo-feed home).
- **`CLAUDE.md`** — Design System pointer; router table now includes `DESIGN.md`.
- **`public/pins/`** — soft-teardrop SVGs for default / open / closed / unknown / selected / retired.
- **`docs/design/map-and-pins.md`** — OpenFreeMap Positron, campus bbox, symbol-layer strategy, density/motion notes.
- **`docs/design/previews/cherry-compass.html`** — font + color + pin + home/detail mock preview.

---

## 2026-07-17 — SDD authored (all 8 specs)

Full spec suite written in one session, with the decision trail:

- **Product:** TuEats (renamed from TuTrucks when scope grew) — off-meal-plan food discovery for Temple's main campus. Trucks first; restaurants/cafes/vending later; venue-generic architecture from day one so expansion needs no migration.
- **Stack decided:** Next.js App Router on Vercel + Supabase (Postgres + Auth, chosen over Neon+Clerk/Auth.js), Drizzle, Tailwind 4, MapLibre GL + OpenFreeMap. Two vendors total.
- **Community model:** verified `@temple.edu` accounts (email OTP only, no social logins); ratings + reviews (one table — a review is a rating with text); venue proposals behind an admin approval queue; browsing never login-walled.
- **Google ratings:** decided **against** the Places API (attribution/link-out concern) and against scraping — manual numbers-only snapshots with visible capture date, 12-month auto-hide. Consequence: no card-on-file, no cron, no external API in the whole product.
- **Seed data verified:** Temple's Google My Map KML export works (~40 trucks with coordinates + blurbs, My Maps ID captured in `domain-knowledge.md`). Real zone structure identified (Norris St corridor, Montgomery Ave corridor, 12th St spur). The five near-identical gyro trucks became the canonical dedup/slug test case.
- **Budget reality:** existing Supabase Pro plan hosts prod (backups, no pausing); dev project on a free org; everything else free tier. No new spend.
- **Dropped along the way:** Diamond Dollars payment tracking, detail-page mini-map, AI features (deferred behind the 4-condition gate in `llm-integration.md`).
- Also: root `CLAUDE.md` created (spec router + cross-cutting rules); `Context/` logging system established.
