# Progress Log

> Newest entries first. One dated entry per meaningful unit of work.
> Keep the **Current status / Next up** block accurate — it's the session-start orientation point.

---

## Current status

- **Phase:** Phase 1 implementation. Public reads, anonymous reports, admin auth, and admin venue CRUD are all wired to real Drizzle/Supabase (`tueats-dev`) — no mock data paths remain anywhere in the app. Campus MapLibre map (cuisine pins, locate, attribution, curated 2D building footprints) is in place. The live venue table has grown past the original 69-row KML seed (74 rows now — 61 published/draft, 13 retired) via ordinary admin edits made outside this progress log between sessions; this doc previously understated that and has been corrected as of 2026-08-21 (see that date's entry).
- **Admin auth is email/password**, not OTP/magic-link — the OTP flow never completed a real session end-to-end (see `Context/decisions.md`'s 2026-08-18 entries) and was replaced outright. Authorization is unchanged: `requireAdmin()` still requires a `profiles` row with `role: "admin"`, granted only via direct DB access. `Specs/auth-security.md` now documents this V1 model (anonymous public / password admin(s) / future OTP student accounts) and explicitly allows for more than one admin account — no more spec/implementation mismatch.
- **Live admin login:** `abislam64@gmail.com` (not `@temple.edu` — admin isn't domain-restricted, see spec). Password was set directly via Supabase Dashboard → Authentication → Users → Add User (password field right in that dialog, "Auto Confirm User" checked) — deliberately bypassing email/SMTP entirely after the custom-SMTP password-recovery path proved unreliable (intermittent `535 "Invalid username"` SMTP auth failures against Resend, one confirmed success sandwiched between many failures — never fully root-caused, see `Context/decisions.md`). The original `tur67594@temple.edu` account was deleted; its orphaned `profiles` row was deleted and replaced with one for the new account's `auth.users.id`.
- **Pending:** a second admin account for a friend — email not yet provided by the user ("will look later"). Same no-email bootstrap process once it's available: Supabase Dashboard → Add User (with password) → tell me the email + desired display name → I grant `role: "admin"` via direct DB insert. No code changes needed for any number of admins — `profiles.role` is a per-row flag, not a singleton.
- **Password recovery** (`/admin/reset-password`, "Forgot password?" on the sign-in page) is fully implemented and spec-documented, but **not confirmed working end-to-end** — the custom SMTP (Resend) setup behind it is still flaky. Not currently blocking anything since admin bootstrap no longer depends on it; worth finishing later if self-service reset is wanted.
- **Known gaps:** of the 61 active venues, 26 still have no `zoneKey` (see 2026-08-21 entry — this is deliberately left as a human curation task, not automatable) and 22 have no `hours` (confirmed via web research as venues with no credible posted schedule, mostly independent trucks — correctly left `null`/"Hours unknown" rather than guessed). Two venues (**Pretzel Dough**, **Vegan Tree**) were skipped entirely during the 2026-08-21 enrichment pass and need a manual look — Pretzel Dough's existence near campus couldn't be confirmed under that name, and Vegan Tree shows as **CLOSED** on current Yelp listings at both known locations (possible retirement candidate). See `Context/decisions.md` for why the KML seed source, the admin-publish path, and the auth mechanism changed in the 2026-08-18 session, and `Context/backlog.md` for deferred items.
- **Venue photo upload (admin-only) shipped 2026-08-25.** Admins can upload/replace/remove a photo per venue from `/admin/venues/[id]`; it renders as a hero image on the public `/eat/[slug]` page when present. Storage is Vercel Blob (`venue-images`, public-read store, linked to the `tueats` Vercel project), not Supabase Storage — see `Context/decisions.md` 2026-08-25 for why. User-submitted photos are explicitly deferred to the accounts phase (milestone ②) — see the same entry.
- **Next up:**
  1. Manually review **Vegan Tree** (possibly closed — consider retiring) and **Pretzel Dough** (existence unconfirmed) via `/admin`.
  2. Curate `zoneKey` for the 26 venues still missing it — this needs a human with local knowledge of the actual truck corridor, not automation (see 2026-08-21 entry for why).
  3. When the friend's email is available: repeat the Add-User + DB-grant bootstrap for a second admin account.
  4. Fix `tests/e2e/home.spec.ts` — still asserts against pre-migration mock venue names; deferred by explicit scope choice.
  5. Continue frontend polish against `DESIGN.md` where needed (optional Maputnik Positron fork; per-building hero tints).
  6. Manually verify the venue-photo upload flow end-to-end in `/admin` (sign in → upload → confirm it renders on the public page) — built and smoke-tested this session, but the actual authenticated upload wasn't exercised since the admin password wasn't available to this session.
  7. Still-uncommitted from 2026-08-24: the venue-detail-page rewrite (type-aware location text, "Get directions", hours formatting, "Last verified") — awaiting go-ahead to commit.

---

## 2026-08-25 — Venue photo upload (admin-only)

Added the ability for admins to upload/replace/remove a photo per venue,
shown as a hero image on the public venue detail page. Scoped to
admin-only after clarifying with the user: V1 has no student/member
accounts, so "user upload" has no auth surface to attach to yet — that
half is deferred to milestone ② (accounts), not built as a workaround.
Full reasoning for both scoping calls (admin-only, and Vercel Blob over
Supabase Storage) is in `Context/decisions.md`.

**What changed:**
- `venues.image_url` column (migration `0004_yummy_bloodaxe.sql`, applied
  to `tueats-dev`).
- `uploadVenueImage`/`removeVenueImage` server actions
  (`src/actions/admin.ts`) — same `requireAdmin()` → validate → write →
  `revalidateTag` shape as every other admin action, using `@vercel/blob`'s
  `put()`/`del()` for the file itself instead of Drizzle (there's no table
  row for a blob).
- Admin editor (`venue-editor.tsx`) gained a "Photo" section — gated on
  the venue already being saved once (needs a real `id` for the blob path).
- Public detail page (`venue-detail.tsx`) renders the photo via `next/image`
  when present; `next.config.ts` allowlists the Blob public-storage host.
- A `venue-images` Blob store was created and linked to the `tueats`
  Vercel project (`vercel blob create-store`); `BLOB_READ_WRITE_TOKEN` was
  pulled into `.env.local` automatically as part of that.

**Verification:** typecheck/lint/format-check/test/build all pass (40
existing tests unchanged — no new unit tests, matching the existing
pattern where admin server actions are integration-verified rather than
unit-tested, same as `upsertVenue`/`publishVenue`/etc.). A Playwright
smoke pass against an isolated dev server confirmed no console/network
errors on the home page, a venue detail page, and `/admin/sign-in`. The
authenticated upload/remove path itself was **not** exercised this
session — it needs a real admin login, and the password wasn't available
here. Worth a hands-on pass before considering this fully done.

One incidental fix along the way: `pnpm install` was failing
(`ERR_PNPM_UNEXPECTED_VIRTUAL_STORE`) because `node_modules` was linked
against a virtual store under an unrelated project directory
(`C:\Users\abisl\fun-proj`). Running `pnpm install --no-frozen-lockfile`
rebuilt it correctly against this project's own `node_modules/.pnpm` — required
stopping the user's running dev server first (native binary file lock),
restarted cleanly afterward. If this recurs, it's an environment quirk,
not a project bug.

---

## 2026-08-21 — Venue pill overlap fix, Vercel groundwork, and venue enrichment pass

Three separate pieces of work:

**Map pins allow overlap instead of hiding.** `VenuePillLayer`
(`src/components/map/venue-pill-layer.tsx`) previously relied on MapLibre's
built-in symbol collision detection, which silently dropped pills in dense
clusters as you panned/zoomed. `icon-allow-overlap`/`text-allow-overlap`
are now `true` — every venue always renders. Visual stacking (which pill
sits on top when several overlap) is driven by `symbol-sort-key`, tiered
default → hovered → selected; note that with overlap allowed, a *higher*
sort key wins the overlap (opposite of its meaning when overlap is
disallowed with `icon-allow-overlap:false`). Click/hover handlers pick the
topmost hit by that same priority field rather than trusting
`queryRenderedFeatures`'s array order, which isn't a documented contract.

**Vercel project created, not yet deployed.** A `tueats` project exists
under the user's personal Vercel account (`abislam66s-projects`), with
`NEXT_PUBLIC_MAP_STYLE_URL` set for Production. GitHub connection is
blocked on the repo owner (`templeterror`, a personal account — only they
can authorize the Vercel GitHub App, collaborator access isn't enough) —
the user opted to ask them directly rather than use a GitHub
Actions–based workaround. The user's friend may end up doing the actual
deploy instead. `tueats-prod` Supabase credentials were never provided
this session, so Production env vars beyond the map style are still
unset.

**Venue enrichment.** The live `tueats-dev` venue table (61 active rows)
turned out to be **far more enriched than this doc previously claimed** —
prior admin sessions had already filled `zoneKey` for 35 venues, `cuisines`
for 41, and `hours` for 18, none of which was reflected here. This entry
corrects that. This session's actual work:

- Widened `CAMPUS_BOUNDS` (`src/config/site.ts`) from the original
  truck-corridor-only box to cover the full venue spread (Liacouras Walk
  chains, north/south outliers) — both the admin form's client-side
  validation and the server's `venueInputSchema` re-validate lat/lng on
  *every* edit, so ~25 venues couldn't be saved at all until this landed.
  Still comfortably inside the DB's own check constraint.
- Tried computing `zoneKey` from lat/lng automatically — a corridor-box
  +latitude-band rule, backtested against all 35 already-assigned zones.
  **Rejected**: 23% mismatch rate (8/35) against real curated assignments,
  confirming `domain-knowledge.md`'s "zones are curated, not computed"
  warning is accurate, not just a theoretical caution. No zoneKey backfill
  was applied; the 26 venues still missing it need a human.
- Web-researched real cuisine/hours/type per venue (parallel research
  passes, each requiring a credible source — official site, Google
  Business listing, or a very recent review — before writing `hours`;
  independent trucks with no findable schedule were correctly left
  `null`/"Hours unknown" rather than guessed, per the domain rule that
  "unknown" must never become a false "closed").
- Built `scripts/enrich-venues/{data.ts,apply.ts}` (`pnpm enrich:venues`)
  — a Playwright driver that logs into the real `/admin` UI and submits
  each venue's actual edit form (same `requireAdmin` → `venueInputSchema`
  → `upsertVenue` → `revalidateTag` path a human admin uses; no direct DB
  writes, unlike `seed-kml.ts`'s bootstrap-only exception). Piloted on 5
  venues headed before a full headless run against an isolated dev server
  instance (kept separate from whatever dev server the user/friend may
  have running, to avoid Next's HMR chunk-hash races under concurrent
  navigation — hit and diagnosed exactly that race on the first attempt
  against the shared port-3000 server).
- Result: cuisine filled for 43 more venues (20 missing → 2 remain, both
  flagged below), hours filled for 22 more (44 missing → 22 remain, all
  confirmed no-reliable-source), `type` corrected for 4 misclassified
  venues (7-Eleven → `convenience`; Tropical Smoothie Cafe → `cafe`;
  Yummy Phở, Zen Japanese Food Fast → `restaurant`, both confirmed fixed
  storefronts/kiosks rather than literal trucks).
- Two venues intentionally skipped: **Pretzel Dough** (couldn't confirm
  this business exists near campus under this name) and **Vegan Tree**
  (current Yelp shows CLOSED at both known locations — likely a retirement
  candidate, not a data-fill).
- A handful of applied hours values are medium-confidence
  (aggregator-derived, not an official primary source) and worth a human
  spot-check eventually, not urgently: Chick-fil-A (two conflicting
  official-ish sources — went with Temple Dining's own PDF), Cha Cha,
  Honey Truck, Chop Chop, Pinky Fresh Fruit Salad & Smoothies, Johny's
  Express, Maple Star, Korea House.

Verified: `pnpm typecheck`/`lint`/`test` all pass; re-queried the live DB
after the run to confirm exact expected before/after field counts; spot-
checked public `/eat/[slug]` pages render "Hours unknown" (never "Closed")
for null-hours venues and correct hours for known ones.

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
