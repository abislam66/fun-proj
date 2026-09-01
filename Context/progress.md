# Progress Log

> Newest entries first. One dated entry per meaningful unit of work.
> Keep the **Current status / Next up** block accurate — it's the session-start orientation point.

---

## Current status

- **Phase:** Phase 1 implementation. Public reads, anonymous reports, admin auth, and admin venue CRUD are all wired to real Drizzle/Supabase (`tueats-dev`) — no mock data paths remain anywhere in the app. Campus MapLibre map (cuisine pins, locate, attribution, curated 2D building footprints) is in place. The live venue table has grown past the original 69-row KML seed (74 rows now — 61 published/draft, 13 retired) via ordinary admin edits made outside this progress log between sessions; this doc previously understated that and has been corrected as of 2026-08-21 (see that date's entry).
- **Map/UX overhaul (map-zones branch, 2026-08-25):** campus-overview zones (street-line + building-fill marks), baked venue-name pills that occlude instead of bleeding, pin-anchored popup mini-card with staged camera arrival (arrow disc, `$12` price placeholder), list rows select-on-map (detail pages only via the popup), inline filter drawer with cherry toggle pills, multi-zone map support, mobile sheet/controls fixes, dimmed zoom-gated dining pins. See the 2026-08-25 entries below and `DESIGN.md`'s changelog. (The co-founder's venue-photo gallery from this branch was later consolidated onto a DB backend the same day — see below.)
- **Admin auth is email/password**, not OTP/magic-link — the OTP flow never completed a real session end-to-end (see `Context/decisions.md`'s 2026-08-18 entries) and was replaced outright. Authorization is unchanged: `requireAdmin()` still requires a `profiles` row with `role: "admin"`, granted only via direct DB access. `Specs/auth-security.md` now documents this V1 model (anonymous public / password admin(s) / future OTP student accounts) and explicitly allows for more than one admin account — no more spec/implementation mismatch.
- **Live admin login:** `abislam64@gmail.com` (not `@temple.edu` — admin isn't domain-restricted, see spec). Password was set directly via Supabase Dashboard → Authentication → Users → Add User (password field right in that dialog, "Auto Confirm User" checked) — deliberately bypassing email/SMTP entirely after the custom-SMTP password-recovery path proved unreliable (intermittent `535 "Invalid username"` SMTP auth failures against Resend, one confirmed success sandwiched between many failures — never fully root-caused, see `Context/decisions.md`). The original `tur67594@temple.edu` account was deleted; its orphaned `profiles` row was deleted and replaced with one for the new account's `auth.users.id`.
- **Pending:** a second admin account for a friend — email not yet provided by the user ("will look later"). Same no-email bootstrap process once it's available: Supabase Dashboard → Add User (with password) → tell me the email + desired display name → I grant `role: "admin"` via direct DB insert. No code changes needed for any number of admins — `profiles.role` is a per-row flag, not a singleton.
- **Password recovery** (`/admin/reset-password`, "Forgot password?" on the sign-in page) is fully implemented and spec-documented, but **not confirmed working end-to-end** — the custom SMTP (Resend) setup behind it is still flaky. Not currently blocking anything since admin bootstrap no longer depends on it; worth finishing later if self-service reset is wanted.
- **Known gaps:** of the 61 active venues, 22 have no `hours` (confirmed via web research as venues with no credible posted schedule, mostly independent trucks — correctly left `null`/"Hours unknown" rather than guessed). Two venues (**Pretzel Dough**, **Vegan Tree**) were skipped entirely during the 2026-08-21 enrichment pass and need a manual look — Pretzel Dough's existence near campus couldn't be confirmed under that name, and Vegan Tree shows as **CLOSED** on current Yelp listings at both known locations (possible retirement candidate). See `Context/decisions.md` for why the KML seed source, the admin-publish path, and the auth mechanism changed in the 2026-08-18 session, and `Context/backlog.md` for deferred items.
- **Venue zones: admin-controlled as of 2026-08-26.** The old disconnected `zoneKey` (4 values, admin-picked, display-text-only) is gone. `venues.map_zone` is now the single source of truth, admin-selected from the co-founder's real 8 map zones (or explicit "Other/Outside mapped zones") in `/admin/venues/[id]`, with a live warning if the picked zone disagrees with what the coordinates actually compute to. Of 74 live venues, 25 sit inside a real drawn zone and 49 are "other" (most of campus is outside the 8 hand-drawn areas — expected, not a data problem). See `Context/decisions.md` 2026-08-26.
- **Venue photos: multi-photo gallery (up to 10) as of 2026-08-26.** The single-admin-photo model is gone — admin can upload, remove, reorder, and set a cover photo across up to `MAX_VENUE_PHOTOS` (10) photos per venue in `/admin/venues/[id]`, all still in the one `venue_photos` table from the 2026-08-25 consolidation (no schema change needed, just query/action layer changes). The co-founder's public `VenuePhotoGallery` was not touched — it already rendered any photo count with no extra controls, so 0/1/2–10 behavior was already correct by design. Storage is still Vercel Blob (`venue-images`); blob cleanup on delete only ever targets admin-uploaded photos, never legacy (locally-hosted) ones. Full detail: `Context/decisions.md` 2026-08-26.
- **IMPORTANT — the "tueats-dev" project was never created.** `.env.local`'s Supabase project (`ehuhoitlezcijbbfkzan`) _is_ production — confirmed 2026-08-27 by matching its dashboard project ref and finding same-day admin edits already live there. Every session's work, including everything in this log, has been happening directly against production data. Vercel's `tueats` project is now connected to `abislam66/fun-proj` (GitHub App re-authorized after repo ownership transferred from `templeterror`) with Production env vars pointed at this same Supabase project; a manual `vercel --prod` deploy was smoke-tested clean (map, filters, venue detail, photos, admin sign-in) before merging `integrate-cofounder-work` → `main`. There is still no separate dev database — treat every local `pnpm dev` session as touching the real live data.
- **Two new map zones as of 2026-08-27: Cecil B. Moore Ave and N Broad St.** Added because 27 real venues (mostly this session's Cecil B Moore/Broad St batch) had nowhere to go but "other." Both are approximate straight-line corridors (no tracing tool available), interpolated from real geocoded anchors — Broad St's shape is deliberately narrower south of Diamond St because the street runs close enough to the campus core there to threaten existing zones' deliberate gaps (Klein Law/Student Center notch, the 1940 Residence Hall exclusion). Verified via a full 92-venue old-vs-new regression check (zero regressions) before backfilling — see `Context/decisions.md` 2026-08-27.
- **`is_halal` and `is_vegan_friendly` added as of 2026-08-27** — both plain booleans, default false, admin-editable checkboxes in `/admin/venues/[id]`, filter chips on the public filter bar, small "Halal" tag on cards/detail (mirroring the existing "Cash Only" tag pattern). `is_halal` is deliberately never auto-set by any script — user determines this by hand. `is_vegan_friendly` was researched venue-by-venue against official menus/delivery-platform listings; 8 of 49 published venues currently qualify (Chopsticks Express, Yummy Phở, CAVA, BurgerFi, Saladworks, Zen Japanese Food Fast, Panda Express, QDOBA) — see `Context/decisions.md` for the evidence bar used and what got excluded despite partial signals (e.g. Champ's Diner's conflicting reviews, Maple Star's vegetarian-only udon).
- **Vercel Web Analytics added as of 2026-08-27** — `@vercel/analytics`'s `<Analytics />` in the root layout (`src/app/layout.tsx`), covering the whole app including `/admin`. No prior analytics existed (checked first). Needs a real Vercel deploy to start reporting — nothing shows in the dashboard until then.
- **Production domain is `tueats.co` as of 2026-08-27** — `NEXT_PUBLIC_SITE_URL` and Supabase's Site URL/redirect allow-list point at it; `metadataBase` set accordingly. `tueats.vercel.app` still resolves to the same deployment (not removed).
- **Member accounts + a login-wall on venue pages, as of 2026-08-28.** A real reversal of two previously-explicit rules in `Specs/auth-security.md` ("no login-walling," "no social login") — the site owner asked for it directly, I flagged the conflict, they chose to override the specs, so the specs (and `CLAUDE.md`) were updated to match rather than left describing a rule the code now breaks. Google OAuth via Supabase Auth, self-service, any Google account (no `@temple.edu` gate) — auto-creates a `profiles` row (`role: "member"`, never `admin`) on first sign-in through the one route handler in the app, `src/app/auth/callback/route.ts`. `/eat/[slug]` requires a session, checked server-side in the page component; the map/list/search stay fully anonymous. Full rationale and what changed: `Context/decisions.md` 2026-08-28.
- **Member ratings/reviews + photo queue as of 2026-09-01 (TUE-12).** Signed-in members can leave a 1–5 star rating with optional review text (one row per user per venue) and submit gallery photos that stay pending until an admin approves them. Public strip still shows published photos only. Storage is still Vercel Blob; no Supabase Storage. Venue proposals and Google snapshots are still out of this slice. Forms cannot be used in production until Google OAuth dashboard config is finished (same blocker as 2026-08-28).
- **Not yet done: the manual Google Cloud + Supabase dashboard configuration this depends on.** Code is implemented, typechecked, linted, tested (86/86), and builds clean, but Google sign-in will not actually work until the site owner: (1) creates a Google Cloud OAuth Client ID and configures the consent screen, (2) enables the Google provider in Supabase (Authentication → Providers) with that Client ID/Secret, and (3) adds `https://tueats.co/auth/callback` and `http://localhost:3000/auth/callback` to Supabase's redirect allow-list. See the conversation record for the exact steps. Not pushed/deployed pending that + the site owner's review.
- **Next up:**
  1. Run migration `0009_motionless_shocker.sql` (`pnpm db:migrate` with `DIRECT_DATABASE_URL`) on the live DB **before** deploying this branch — `getPublishedVenues` now reads `ratings`, so the homepage will error until the table exists.
  2. Complete the Google Cloud + Supabase manual configuration above, then do a real end-to-end sign-in test (not just local verification) before pushing.
  3. Retire **Vegan Tree** via `/admin` — reconfirmed 2026-08-27 as CLOSED per Yelp (this was already flagged 2026-08-21; still not acted on).
  4. Resolve **Pretzel Dough**'s identity — still unconfirmed after a second research pass 2026-08-27; the nearest name match found (Philly Pretzel Factory) is a different brand, not a confirmed match.
  5. Manually set `is_halal` for venues where it applies — deliberately never auto-set (see 2026-08-27 decisions entry).
  6. 7 published venues still have no hours after two research passes — see the missing-hours report delivered 2026-08-27 (conversation record) for the full list and reasons; re-check periodically in case they get a web presence.
  7. Flag to resolve: **OWL Breakfast & Lunch**'s hours have a source conflict (screenshot-sourced Tue-closed/6:30am-start vs. a 2026-08-27 web search's Mon-Fri-open/6am-start) — kept the screenshot version per "prefer the most recent official/location-specific source," but worth a direct confirm.
  8. Optional: give a building/landmark to the ~7 venues whose location text got generic after the zone-system replacement (see the 2026-08-26 decisions entry for the exact list) — cosmetic, not urgent.
  9. When the friend's email is available: repeat the Add-User + DB-grant bootstrap for a second admin account.
  10. Fix `tests/e2e/home.spec.ts` — still asserts against pre-migration mock venue names; deferred by explicit scope choice.
  11. Continue frontend polish against `DESIGN.md` where needed (optional Maputnik Positron fork; per-building hero tints).
  12. Manually verify, through a real authenticated browser session: the multi-photo admin UI, the map-zone picker/dropdown/warning UI, the photo-upload flow, and the new Halal/Vegan Friendly checkboxes — all verified at the data/logic layer this session or earlier, never through a real `/admin` click-through.

---

## 2026-09-01 — TUE-12 member ratings/reviews and moderated gallery photos

Pulled Feature 9–10 forward: `ratings` table (stars required, review text optional, one per user per venue), `requireMember()`, `submitRating`/`deleteRating`, student aggregate on detail + list rows, composer + review list on `/eat/[slug]`. Member photo submissions reuse Vercel Blob + `venue_photos` with `source: member` / `status: pending|published|rejected`; admin dashboard gained a photo queue (approve blocked at 10 published). Migration `0009_motionless_shocker.sql` is additive — not auto-applied; run `pnpm db:migrate` against the live DB before this ships.

**Not in this slice:** venue proposals, Google snapshots, public report-a-review queue, `/account` page, menu CMS.

**Not verified in a browser:** Google OAuth is still unconfigured, so the member forms cannot be clicked through end-to-end until that dashboard work lands. Logic is covered by unit tests.

---

## 2026-08-28 — Custom domain cutover to tueats.co, then Google OAuth member accounts + a login-wall on venue pages

Two pieces of work, one small and one large.

**1. Domain audit for `tueats.co`.** Confirmed nothing was hardcoded to `tueats.vercel.app` in application code (only in `Specs/`/`Context/` docs, left alone) — the domain was already fully env-var-driven via `NEXT_PUBLIC_SITE_URL`. Added `metadataBase` to the root layout (`src/app/layout.tsx`) so OG/canonical resolution has a real base once those tags exist, since there wasn't one before. Gave the site owner the exact Vercel env var and Supabase Auth URL-configuration changes needed — both since completed on their end.

**2. Google OAuth for regular users + a login-wall on `/eat/[slug]`.** The site owner asked for this directly; `Specs/auth-security.md` explicitly ruled out both social login and login-walling in three separate places. Flagged the conflict, the site owner chose to override the specs rather than scale down, so `Specs/auth-security.md` and `CLAUDE.md` were rewritten in the same session to describe what actually shipped. Full technical rationale, what changed, and why the old rules existed in the first place: `Context/decisions.md` 2026-08-28.

Shape of the implementation: `supabase.auth.signInWithOAuth({ provider: "google" })` client-side → Google → Supabase's hosted callback → `src/app/auth/callback/route.ts` (the one route handler in the app — OAuth's redirect handshake has no server-action equivalent) → `exchangeCodeForSession` → `ensureMemberProfile()` auto-creates a `profiles` row (`role: "member"`, hardcoded, never `admin`) → redirect to a validated `next` path (open-redirect-checked the same way the venue page's existing `from` back-link param already was). `/eat/[slug]` checks `getUser()` server-side before rendering any venue data, showing a `SignInGate` ("Sign in to explore this spot" / "Continue with Google") instead when logged out — gated in the page component, not a client click-handler, so a shared/typed URL is caught the same way. The middleware's session-refresh matcher, previously `/admin/:path*` only, was widened to run site-wide (except static assets and the callback route itself) — otherwise a member's session would silently stop refreshing on public pages after Supabase's ~1h access-token TTL, since only middleware/route-handlers (never Server Components) can persist a refreshed cookie.

Also fixed in passing: `/about` never actually got the Vercel Analytics disclosure `auth-security.md` requires happen "first," from when Analytics was added 2026-08-27 — added it now alongside the new Google sign-in disclosure.

Verified: typecheck, lint, 86/86 tests (5 new, covering `pickDisplayName()`'s collision/sanitization behavior, mirroring `uniqueSlug()`'s existing test style), production build all clean. **Not pushed or deployed** — Google sign-in won't actually work until the site owner completes the Google Cloud Console + Supabase dashboard configuration (see Current status above); still needs a real end-to-end sign-in test before this ships.

---

## 2026-08-27 — Two new map zones, Halal/Vegan Friendly fields, data research pass, Vercel Analytics

Five pieces of work in one session, all against the confirmed-production database (see Current status above):

**1. Zone fix + backfill.** Corrected Wendy's/Panera Bread's coordinates (previous estimates were inaccurate — redone via interpolation between two real geocoded anchors on N Broad St) and reshaped the `broad-st` zone so it actually contains them. Verified with a full 92-venue old-8-zones vs. new-10-zones regression check before writing anything — zero true regressions, 27 venues backfilled into `cecil-b-moore`/`broad-st` (up from 0 since those zones were added 2026-08-26 but never backfilled).

**2. `is_halal` / `is_vegan_friendly`** — new boolean columns (migration `0008_dark_daredevil.sql`, additive, default false), admin checkboxes, public filter chips, and a "Halal" tag on cards/detail (same pattern as the existing "Cash Only" tag). `is_halal` stays 0/49 on purpose — admin-only, never inferred. `is_vegan_friendly` researched per-venue against delivery-platform menus and reviews; 8/49 published venues qualified on real evidence (a listed vegan dish, not a drink or trivial side): Chopsticks Express, Yummy Phở, CAVA, BurgerFi, Saladworks, Zen Japanese Food Fast, Panda Express, QDOBA. Explicitly excluded despite partial signal: Champ's Diner (directly conflicting reviews), Maple Star (vegetarian udon only, not confirmed vegan), Mexican Grill Stand (a veggie filling exists but "served without cheese by default" wasn't confirmed).

**3. Hours/description research pass**, cross-referencing screenshots from earlier in the conversation plus fresh web research: 2 venues got real new hours (Mexican Grill Stand's official-Temple-News-sourced hours were already there — turned out not missing; Richie's Sandwich Shop got real hours from a matching-address business listing), 22 venues got real descriptions from official/delivery-platform sources, 2 venues (Famous halal food, Pretzel Dough) were left without descriptions because their identity itself can't be confirmed against any real business found. One conflict flagged, not resolved: OWL Breakfast & Lunch's hours per a fresh web search don't match the screenshot-sourced ones already in the DB — kept the screenshot version (more location-specific/recent) rather than guessing which is right.

**4. Vegan Tree reconfirmed CLOSED** (Yelp) — this was already a flagged backlog item from 2026-08-21, not a new finding. Still not retired.

**5. Vercel Web Analytics** — `@vercel/analytics`'s `<Analytics />` added to the root layout. No prior analytics existed in the app (checked before installing). Won't show data until an actual Vercel deployment runs.

**Verification:** typecheck/lint/81 tests (3 new)/build all pass. One transient build failure (`WasmHash` crash deep in Next's bundled webpack, unrelated to any of this session's code) resolved by clearing `.next` — not a real regression.

**Not done:** nothing pushed to `main` — held per explicit instruction pending user review of the full audit/missing-hours report.

---

## 2026-08-26 — Multi-photo venue gallery (up to 10), reorder + cover photo

Extended the single-admin-photo model to a real gallery: up to
`MAX_VENUE_PHOTOS` (10) photos per venue, with upload/remove/reorder/set-
cover, all still on the one `venue_photos` table from the prior day's
consolidation. No schema migration was needed — that table was already
row-per-photo with a `sort_order`; the single-photo constraint lived only
in the query layer (`upsertAdminVenuePhoto` always replaced the one
`source: "admin"` row) and has been removed.

**What shipped:**

- `lib/db/queries/venue-photos.ts`: `getVenuePhotosForAdmin` (full list),
  `insertVenuePhoto` (always appends), `deleteVenuePhotoById`,
  `setVenuePhotoOrder` (rewrites `sort_order` to a given id order via a
  transaction).
- `actions/admin.ts`: `uploadVenuePhoto` (enforces the 10-photo cap
  app-level before hitting Blob), `deleteVenuePhoto` (only calls Blob
  `del()` for `source: "admin"` rows — legacy photos are local files, not
  Blob objects), `reorderVenuePhotos` (validates the submitted id set
  exactly matches the venue's current photos before writing).
- "Make cover" reuses `reorderVenuePhotos` with the target photo moved to
  the front — no new field, since the gallery already treats index 0 as
  the priority-loaded cover image. New pure helpers
  (`lib/admin-photo-order.ts`: `movePhotoToFront`, `movePhoto`) back the
  cover button and the ↑/↓ reorder buttons; both are unit-tested (13
  cases covering the not-in-list and both-ends no-op edge cases).
- Admin editor UI: "Photo" → "Photos (X / 10)" — a small grid of
  thumbnails, each with ↑/↓, "Make cover" (hidden on the current cover),
  and "Remove"; upload control disables itself at the cap.
- **Zero changes to the public `VenuePhotoGallery` component or its
  CSS.** It already rendered a bare horizontal strip with no controls at
  any photo count, so the "0 → nothing, 1 → no extra controls, 2–10 →
  existing gallery" requirement was already satisfied by the co-founder's
  original design.

**Verification:** typecheck/lint/78 tests (13 new)/build all pass. Live-
verified against `tueats-dev` + the real Vercel Blob store with a
temporary script (deleted after use): drove a real zero-photo venue
through 0 → 1 → 10 photos, confirmed the cap blocks an 11th, reorder,
make-cover, delete-with-blob-cleanup, and delete-of-a-legacy-row-without-
touching-Blob — then fully restored the venue to 0 photos and deleted
every test blob. Confirmed existing photos (7-eleven's 3 legacy rows, one
pre-existing admin photo on Korea House) were untouched throughout.
**Not verified:** the admin UI itself through a real browser session — no
admin credentials available this session. Full reasoning in
`Context/decisions.md` (2026-08-26).

---

## 2026-08-26 — Admin-controlled map zone + exact location, replacing the old zone system

Replaced the disconnected old 4-zone admin field with the co-founder's
real 8-zone map system as the actual stored source of truth, per explicit
request to trace the full admin→map pipeline first (previous session) and
then fix it without touching any of the co-founder's public map/filter
behavior.

**Investigation before writing code:** queried live `tueats-dev` directly
during planning (not guessed) — confirmed the public zone filter
(`filterVenues`) already never read the old `zoneKey` at all, computing
membership live via `mapZoneContaining()` for every venue automatically.
That meant the actual filter mechanism needed zero changes; only admin
visibility/control was missing. Also confirmed via a real backfill dry
run: 25/74 venues land in one of the 8 real zones, 49 would be "other" —
and cross-checked against `building` data to find the real content impact
was ~7 venues losing a specific zone-based label (not the 49 it looked
like), since `building` already wins over zone text where set.

**What shipped:**

- `venues.map_zone` replaces `zone_key` (migrations `0006`/`0007` — add,
  backfill via `scripts/backfill-map-zones.ts`, then drop). Backfill uses
  the same `mapZoneContaining()` the live filter already trusted — not a
  new heuristic.
- Admin editor: new "Map zone" dropdown (8 real zones + explicit "Other /
  Outside mapped zones", the latter deliberately kept out of
  `config/map-zones.ts` so it can't leak into the public filter bar —
  confirmed live, still exactly 8 public chips) plus a new minimal
  click-to-place/drag map picker (`VenueLocationPicker`) alongside the
  existing plain lat/lng inputs (kept, not replaced).
- New non-blocking `zoneMismatchWarning()`: compares the admin's picked
  zone against what the coordinates actually compute to, warns in either
  direction, never auto-corrects. Caught and fixed a real bug during
  testing — `Number("")` is `0`, not `NaN`, so blank coordinate fields
  were briefly computing a false "outside every zone" warning at (0,0)
  before the admin had entered anything.
- `config/zones.ts` deleted (fully superseded).
- 6 new tests (`admin-venue-form.test.ts`) cover the warning function's
  both directions plus the blank-input edge case that caught the bug
  above.

**Verification:** typecheck/lint/70 tests/build all pass. Confirmed live:
exactly 8 zone chips still render publicly (no leaked 9th "Other" chip —
the "Other" chip visible in a raw scrape is the unrelated pre-existing
cuisine tag), the backfill hit 100% of rows with zero nulls, and
`zoneMismatchWarning` behaves correctly in both mismatch directions plus
the "nothing entered yet" case via direct calls against real polygon
coordinates. **Not verified:** the actual admin UI click-through (picker,
dropdown, warning banner, publish) through a real logged-in browser
session — no admin credentials available this session either. Full
reasoning and the exact list of venues whose location text changed is in
`Context/decisions.md` (2026-08-26).

---

## 2026-08-25 — Consolidated the two venue-photo systems

The earlier merge of the co-founder's map-zones branch left two
independent venue-photo systems coexisting un-reconciled: this session's
DB+Blob admin upload, and the co-founder's frontend-only static registry
(`config/venue-photos.ts` + `public/photos/<slug>/`, rendered by their
`VenuePhotoGallery`). Consolidated into one, per explicit instruction to
preserve the co-founder's frontend exactly and only change the data
source.

**What changed:**

- New `venue_photos` table (`venue_id`, `url`, `alt`,
  `source: 'legacy' | 'admin'`, `sort_order`) replaces `venues.image_url`
  (migration `0005_tough_captain_america.sql`, applied to `tueats-dev`).
  A single column couldn't hold `7-eleven`'s 3 existing placeholder
  photos, so a real one-to-many table was necessary, not optional.
- The migration's data-seed step moved those 3 existing photos into
  `venue_photos` as `source: 'legacy'` rows, byte-for-byte and
  path-for-path unchanged (`public/photos/_placeholders/` untouched) —
  confirmed via direct DB query before and after.
- `VenuePhotoGallery` (`src/components/venues/venue-photo-gallery.tsx`)
  is now an async Server Component querying `getVenuePhotosBySlug()`
  instead of the static config — same props, same JSX, same CSS classes,
  same "nothing without photos" behavior. Verified render-identical on
  `/eat/7-eleven` (3 frames, same alt text, same DOM) before and after.
- `uploadVenueImage`/`removeVenueImage` (`src/actions/admin.ts`) now
  target the one `source: 'admin'` row per venue via
  `upsertAdminVenuePhoto`/`deleteAdminVenuePhoto`
  (`src/lib/db/queries/venue-photos.ts`) instead of `venues.image_url`.
  Admin UI is unchanged — still single upload/replace/remove.
- Removed this session's own hero-image block from `venue-detail.tsx`
  (and its `.detail-hero-image` CSS) — keeping it would have shown an
  admin-uploaded photo twice once both systems shared data. This was the
  session's own addition, not the co-founder's, so it was fair game to
  remove without asking; called out anyway in `Context/decisions.md`.
- Deleted the now-fully-superseded `src/config/venue-photos.ts`.
- `Context/backlog.md`'s "Venue photo storage + upload backend" row is
  resolved (removed) — this is that work.

**Verification:** typecheck/lint/test/build all pass (64 tests, same as
after the merge — no test changes needed). A Playwright check confirmed
`/eat/7-eleven` renders identically (3 photo frames, same alt text, no
console/network errors beyond one pre-existing first-compile artifact
unrelated to this change). Since admin credentials weren't available to
this session, the upload→gallery wiring itself was verified by calling
`upsertAdminVenuePhoto`/`deleteAdminVenuePhoto` directly against
`tueats-dev`, confirming: legacy photos untouched, an admin photo appends
correctly and renders in the live gallery (4 frames, correct order),
removal cleanly restores exactly the original 3. Not yet verified: the
actual file-upload button in `/admin` combined with this new table (see
"Next up" above).

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

## 2026-08-25 — Multi-zone filter now shows venue pills on the map

Selecting 2+ zones showed only zone marks, never listings: `selectedMapZone` collapsed the filter to a single zone (null for multiple), and everything zone-related keyed off that. VenueMap now takes `selectedZones: MapZoneKey[]` (VenueMapLoader/explorer pass `filters.zones` directly; `selectedMapZone` deleted from lib/venues). Pills render whenever any zones are active; `flyToZones` fits the union bbox of all selected zones (max of their paddings + the mobile sheet inset); chip shows the zone label or "N zones"; MapZoneLayer takes a `zonesActive` boolean; dining layer hides for any active zones. Zoom-out-to-exit now applies ONLY when exactly one zone is active — a multi-zone fit can legitimately land below `MAP_ZONE_OVERVIEW_MAX_ZOOM` and must not self-clear. Verified: Tyler trucks + Student Center → "2 zones" chip, camera spans both corridors, all 6 pills and rows present, URL carries both `zone=` params.

---

## 2026-08-25 — Drawer options: checkboxes → horizontal cherry toggle pills

The drawer's vertical checkbox list became a wrapping horizontal multi-select: each option is a `button` pill with `aria-pressed`; tap toggles it, selected pills fill solid cherry with white text, unselected stay white with a border (hover shows a cherry border). Same filter state/URL behavior. Verified live: two cuisines selected read as cherry pills, chip badge shows "Cuisine · 2".

---

## 2026-08-25 — Filter menus: floating popover → inline drawer

The Cuisine/Zone `<details>` popovers (fixed/absolute panels floating over the venue list) are gone. `FilterBar` is now controlled: chip buttons with `aria-expanded`/`aria-controls` toggle one shared in-flow drawer under the chip row that pushes results down — animated via the `grid-template-rows: 0fr→1fr` trick (reduced-motion disables it), content kept mounted during collapse so closing animates, and the drawer is `inert` when closed so hidden checkboxes can't take focus. `.filter-menu`/`.filter-popover` CSS and the desktop popover overrides removed. Verified on desktop pane and mobile sheet.

---

## 2026-08-25 — Mini-card redesign: arrow disc + price placeholder

"View details" text replaced with a wordless ↗ arrow in a cherry-soft disc (fills solid cherry on card hover/focus-within; sr-only "View details" retained for screen readers — the whole card is still the link). Added a price-range readout beside it in data mono — hardcoded `$12` (`PLACEHOLDER_PRICE_RANGE` in venue-map.tsx) on every card per user instruction; real price data is a backlog row. DESIGN.md changelog + map-and-pins mini-card section updated.

---

## 2026-08-25 — Mobile zone tap: pills no longer land behind the sheet

Tapping a zone on the phone map looked like "no trucks appear": the zone flight's `fitBounds` centered the zone in the full-height canvas, but the mid-height results sheet covers the bottom ~60%, so the zone and every pill landed behind the drawer and the visible strip showed the empty area north of it. Two-part fix: (1) a zone chosen on the map (VenueMap's `onSelectZone` path — not the filter menu) now bumps `sheetCollapse`, tucking the sheet to peek like list selections do; (2) `flyToZone` pads its bottom by the tucked sheet height below the desktop breakpoint (`MOBILE_SHEET_PEEK_PX` 164, keep in sync with `.mobile-sheet-peek`'s 10.25rem) so the zone centers in the actually-visible strip. Desktop unchanged (inset 0; staged-arrival checks re-verified). Unrelated pre-existing console warning noticed while debugging: MapLibre logs "Expected value to be of type number, but found null" ×3 on zone selection — likely `symbol-sort-key: ["get","sort"]` on zone label/membership features missing `sort`; cosmetic, not chased.

---

## 2026-08-25 — Mini-card staged behind the camera

Selecting from the list at the campus overview used to pop the mini-card instantly while the map was still flying. `VenueMap` now stages it: `poppedVenueId` state gates the card, set only once the camera settles — the gating effect is deliberately declared AFTER the camera effects so a movement they just started registers via `map.isMoving()`, waits for `moveend`, and bails/re-runs while the host-zone selection round-trips through the parent. Zone-less venues also gained a real approach: the selection effect now eases to street zoom (`VENUE_STREET_ZOOM` 16) instead of only recentering when off-screen. No movement (e.g. pill click at street zoom) → instant pop, unchanged. Verified on desktop: card count is 0 mid-flight and 1 on arrival for both a zone venue (Korea House) and a zone-less one (7-Eleven).

---

## 2026-08-25 — List rows drive the map (no direct detail navigation)

`VenueRow` swapped from `<Link href=/eat/…>` to a button: clicking selects the venue, the map flies to it (auto-selecting its host zone), and the anchored mini-card opens — "View details" on the card is now the only explorer path to the detail page. On mobile, a list selection also tucks the sheet to peek (`collapseSignal` prop on MobileSheet) so the map + popup are visible. Zone-less venues now render a single pill when selected, so the popup always sits on a pin. `backPath` plumbing dropped from VenueList/VenueRow/ResultsPanel (mini-card still carries it); the ↗ row arrow removed; rows got button CSS resets + cherry focus ring. Verified live on desktop (search "korea" → row click → Tyler-trucks fly-in + popup, URL stays `/`) and mobile (search → tap → sheet at peek, popup below-flipped at the top edge). No spec conflict (Feature 2 ACs don't require row→detail).

---

## 2026-08-25 — Tucked mobile sheet is inert until expanded

At the peek snap the sheet content is now `inert` (React 19 prop) + `overflow: hidden`: no scrolling, tapping, or keyboard focus until the user expands the drawer. A tap anywhere on the tucked sheet body expands to mid — inert content retargets clicks to the section. Guard worth knowing: clicks originating from the drag handle are excluded in `onSectionClick`, because a drag down to peek still synthesizes a click (pointer capture keeps its target on the handle) which otherwise bounced the sheet straight back open — caught by the Playwright check. Verified at 390px: drag-to-peek sticks, wheel at peek doesn't scroll, tap expands without hitting venue links, scroll works again at mid.

---

## 2026-08-25 — Mobile map controls ride above the sheet as a row

On phones the zoom/reset/locate column sat behind the bottom sheet (only "+" peeked out). Below the desktop breakpoint the controls are now a horizontal row anchored just above the sheet: base position clears the peek snap (10.25rem), and `[data-sheet="mid"/"full"]` selectors (MobileSheet already mirrors its snap onto `<html>`) move it above the mid height, with a transition matching the sheet's. Desktop unchanged (vertical column above attribution — `flex-direction: column` added to the ≥64rem override since the base is now row). Verified at 390px in both peek and mid snaps and at 1400px.

---

## 2026-08-25 — "Accepts card" filter removed

Removed the payment filter end to end: the chip in `FilterBar`, and `VenueFilters.payments` with its parse/serialize/filter logic and the `?payment=` URL param (old bookmarked URLs just ignore it). Venue `acceptsCash`/`acceptsCard` data and the "Cash Only" tag are untouched. Conflicts with `Specs/features.md:45` (payment listed among Feature 1 filters) — flagged in `Context/decisions.md`, spec not edited. Tests updated.

---

## 2026-08-25 — Venue pills occlude instead of bleeding

Overlapping venue pills let the lower pill's name paint across the upper pill (MapLibre draws a symbol layer's icons, then all its text — the same defect the zone labels hit). Venue pills now follow the zone-label fix: `buildVenuePillIcon` bakes the name into one opaque sprite per venue × state (Satoshi bold like zone plates, replacing GL Noto), registered lazily per state and cache-busted by name; the layer is icon-only with an `icon-size` zoom ramp (10/13 → 1 over z14–18.5) reproducing the old text-size scaling around the stem tip. Verified in-browser: selected "Vegan Tree" cleanly covers "Korea House" in the formerly-bleeding cluster. Shared `paintPill` painter keeps the dining 9-slice variant unchanged.

---

## 2026-08-25 — Mini-card drops the location line

The map popup showed a zone/building line only for venues that had that data (e.g. "Montgomery Avenue · Near 1256 W Montgomery Ave", wrapping to two lines) and nothing for the rest — inconsistent card heights and clutter. Removed `VenueLocation` from the mini-card: it is now always name + cuisine/payment tags + open status + View details. Address information lives on the detail page; list rows still show their zone line (not part of this ask). DESIGN.md changelog + `docs/design/map-and-pins.md` decision-split table updated.

---

## 2026-08-25 — Frontend-only photo display on venue detail pages

Per the user's explicit frontend-only constraint, detail pages can now show photos with zero backend: files committed under `public/photos/<slug>/` and registered per-slug in `src/config/venue-photos.ts` (`VenuePhoto` = src + required alt). `VenuePhotoGallery` (server component, `next/image`) renders a horizontal snap-scroll strip of 4:3 `radius-lg` frames between the hero and "Good to know"; venues with no photos render nothing at all. The registry ships empty — drop files in `public/photos/<slug>/`, add entries, done. (Follow-up same day: three labeled placeholder images were added under `public/photos/_placeholders/` and registered on `7-eleven` at the user's request so they can preview the strip — marked TEMP in the config, to be removed when real photos land.) DESIGN.md content order + photo treatment documented; backend upload path recorded as a deliberate non-goal in `Context/decisions.md` with a backlog row for the eventual storage/upload project.

---

## 2026-08-25 — "View details not navigating" diagnosed: stale dev servers, not code

The mini-card's View details link appeared dead, but instrumented Playwright runs showed the click reaching the Link and Next initiating navigation — the target route simply never responded. Root cause: the dev servers on ports 3000 and 3001 had been running ~8 hours, predating the day's edits; the 3000 server was wedged (even static `/about` hung for 45s+, only the already-compiled `/` still served) and hydration-mismatched on the renamed Zone filter chip (its server bundle still said "Area"). A fresh `pnpm dev` served `/`, `/eat/[slug]`, and `/about` instantly, and the card click navigated end-to-end. No code changes; fix is restarting the dev server. Side observation for later: selecting a zoneless venue (e.g. 7-Eleven) from the list at campus overview shows the mini-card floating with no pill beneath it, since pills only render inside a selected zone.

`VenueLocation` (shared by the map mini-card and list rows) no longer prints "Near campus" when a venue has no `zoneKey` — everything in the product is near campus, so the fallback carried no information. It now shows the zone label and/or "Near {building}" when present, and renders nothing otherwise. Note: venues assigned the `other` zone still show its curated label "Elsewhere near campus" from `config/zones.ts` — that's a deliberate zone name, not the fallback.

---

## 2026-08-25 — Map controls to bottom-right; mini-card anchored to the pin

The zoom/reset/locate column moved from the map's top-right to the bottom-right, stacked above the attribution line (DESIGN.md desktop-layout line updated). The venue mini-card no longer sits in a fixed corner: a new `.map-mini-card-anchor` wrapper is positioned imperatively at the selected pin's projected screen point (updated on every map `move`/`resize`), centering the card above the pill with horizontal clamping at map edges and a below-the-pin flip when the pin is near the top edge. The whole card was already a link to `/eat/[slug]` — unchanged. Framer-motion note: the anchor animates opacity only (its CSS transform does the positioning); the y-slide lives on the inner wrap, and the anchor ref only overwrites on non-null so AnimatePresence's late exit-unmount can't clobber the entering card's ref.

---

## 2026-08-25 — Dining info pins dimmed, shrunk, and zoom-gated

The three meal-plan dining pins (Student Center Food Court, J&H Dining Hall, Morgan Hall Food Court) are static and unclickable, and at full pill size they dominated the campus overview. `CampusDiningLayer` now renders them at 65% `icon-opacity`/`text-opacity`, at 2/3 the venue-pill footprint (`buildDiningPillIcon` registers the same bitmap at 1.5× pixelRatio; text 9–11px, tighter fit padding), and behind a `minzoom: 16` gate so they no longer show at the campus overview (zoom 14.6) — only once the user zooms to building scale. The hide-on-zone-selection behavior is unchanged. DESIGN.md and `docs/design/map-and-pins.md` updated to match.

---

## 2026-08-25 — Zone flow finished: dining pins as overview peers, styled All zones button

Completed the zone UX another session started. Dining info pins now place like zone labels (`allow-overlap` + `ignore-placement`) so they always show at the campus overview as white static peers of the zone marks — building labels at the same centroids were colliding them away — and the whole layer still hides when a zone is selected. Styled the previously-unstyled `.map-zone-chrome` / `.map-all-zones` (button was invisible; now a surface control beside the campus chip). Fixed a strict-index type error in `selectedMapZone`, and updated `venues.test.ts` + the tacos fixture (moved onto the 12th St centerline) for the map-zone spatial filter. Zone tap → sidebar shows only that zone's venues; All zones → full list; Zone menu in the filter bar — all verified end-to-end with Playwright screenshots. Typecheck, lint, format, and all 56 unit tests pass.

Venue listing pins are single-line (width-only `icon-text-fit`, more padding, slightly larger type). All TuEats map overlays paint above Positron, so OSM road names never sit on pins, zone plates, or building fills (`src/lib/map/overlay-order.ts`).

---

## 2026-08-25 — Lighter zone name plates

Zone labels moved off `#E8D4D8` / cherry-deep type to `#F3E6E9` fill, cherry (`#9D2235`) type, and a 1.5px outline. Still darker than `#F8ECEF`, which disappeared on white streets.

---

## 2026-08-25 — Zone labels occlude instead of blending

Zone names are opaque sprites (plate + type in one bitmap). MapLibre’s icon-then-text pass was letting overlapping names bleed through each other.

---

## 2026-08-25 — Liacouras Walk buildingFill south of 1940

Added map zone `liacouras-walk` (`MAP_ZONE_MARK.buildingFill`) on OSM 1926–1938 N. Liacouras Walk. 1940 Residence Hall, the path, and 1810 Liacouras stay unfilled.

---

## 2026-08-25 — Richie's Cafe buildingFill on W Berks

Added map zone `richies-cafe` (`MAP_ZONE_MARK.buildingFill`) on the cafe’s OSM footprint only. Facilities and the rest of that Berks block stay unfilled.

---

## 2026-08-25 — Tyler trucks trimmed to Tomlinson–Tyler

`tyler-trucks` now starts on W Norris where Tomlinson’s west edge meets the street and ends a bit before Tyler’s east edge, still on the OSM centerline.

---

## 2026-08-25 — Tyler trucks street-line on W Norris

Added map zone `tyler-trucks` (`MAP_ZONE_MARK.streetLine`) on W Norris. Key is not list-filter `norris`. Street line uses the OSM Norris centerline.

---

## 2026-08-25 — Zone names on cherry-soft plates

Zone labels use a stretchable light-cherry plate (`#E8D4D8`) with a thin cherry outline — same family as `buildingFill`, not a white text halo. Not a cuisine pill (no stem, not solid cherry). `#F8ECEF` on white streets disappeared; this mix still reads as a wash.

---

## 2026-08-25 — W Montgomery stops at Klein Law, gap before Student Center

Trimmed `w-montgomery` so it no longer runs 15th→13th. The street-line now follows Montgomery only along Klein Law and ends ~75m west of 13th, leaving a visible gap before the Student Center L.

---

## 2026-08-25 — W Montgomery street-line from 15th to Student Center

Added map zone `w-montgomery` (`MAP_ZONE_MARK.streetLine`) on W Montgomery along Klein Law, with a visible gap before the Student Center L at 13th. Key is not list-filter `montgomery`. Street line uses the OSM Montgomery centerline.

---

## 2026-08-25 — Street-line corridors snapped to real street geometry

The two `street-line` features in `public/maps/map-zones.geojson` were axis-aligned in lng/lat, so they drifted off the tilted Philly grid. Replaced only those two geometries with OSM street centerlines (Overpass): Student Center now follows N 13th St up to the true W Montgomery Ave intersection then east along Montgomery; SERC trucks follows N 12th St. Nothing else in the file or config touched. Verified with dev-server screenshots at overview and mid zoom.

---

## 2026-08-25 — The Wall is buildingFill west of Anderson

The Wall is no longer a `streetLine` on Paley's 12th Street edge. It uses `MAP_ZONE_MARK.buildingFill` on the vendor-pad plaza immediately west of Anderson Hall — the same cherry wash as Vantage & The View, and not Anderson's footprint. Street-line stays on Student Center and SERC trucks.

---

## 2026-08-25 — Locked street-line + building-fill map marks

User picked the street-line overview (not rounded hulls) and kept the Vantage & The View building wash. Those two drawings are now named variables in `src/config/map-zones.ts`: `MAP_ZONE_MARK.streetLine` and `MAP_ZONE_MARK.buildingFill`. The Streets/Shapes toggle is gone. DESIGN.md documents the pair. Specs Feature 1 still says every truck is a pin at overview — conflict flagged, spec not edited.

---

## 2026-08-25 — Map zone A/B on the home map

Campus overview no longer dumps every venue pin. Four hand-authored clusters (Student Center L on 13th & Montgomery, Vantage & The View building fills, The Wall plaza by Anderson, SERC trucks on 12th) render as either cherry street/corridor highlights or rounded hulls. Click a zone to `fitBounds` and show only pins whose lat/lng fall inside that zone's membership polygon. Streets/Shapes toggle lives on the map chrome and persists as `zoneStyle` (does not touch list-filter `?zone=`). List filters and admin `zone_key` are unchanged. Specs not edited; DESIGN.md still forbids zone fills until a winner is picked.

Verified on the live home map: Streets overview (corridors + Vantage/View footprints, no pin soup) and Shapes overview (four hulls, URL `?zoneStyle=shapes`).

---

## 2026-08-25 — Retire Student Center food-court chain venues

Retired Saladworks, Zen Japanese Food Fast at Temple University, Chick-fil-A (Student Center), and BurgerFi (`status: retired`). They were meal-plan food-court tenants stacked on the Student Center; the white "Student Center Food Court" pin in `campus-dining.ts` is the only marker that should remain there. Morgan Hall Chick-fil-A draft left untouched. Cache busted via `.next/cache` after the SQL retire (no admin `revalidateTag` path from the script).

---

## 2026-08-25 — Meal-plan dining info pins (SC food court, J&H, Morgan)

Meal-plan dining is out of scope, but the three big dining buildings shouldn't read as empty. Added `CampusDiningLayer`: one neutral, non-interactive pill per building (Student Center Food Court, J&H Dining Hall, Morgan Hall Food Court) from static config `src/config/campus-dining.ts` — white fill, stone border, ink-secondary regular text, same pill+stem silhouette drawn by a now-parameterized `venue-pill-icon.ts`. Pins sit on footprint centroids (Morgan between the towers) and always lose label collisions to venue pills via mount/insertion order in `VenueMap`. Not venues, never in the DB. Documented in `DESIGN.md` (pins section + decisions log), `docs/design/map-and-pins.md`, and `Context/decisions.md`.

---

## 2026-08-21 — Venue pill overlap fix, Vercel groundwork, and venue enrichment pass

Three separate pieces of work:

**Map pins allow overlap instead of hiding.** `VenuePillLayer`
(`src/components/map/venue-pill-layer.tsx`) previously relied on MapLibre's
built-in symbol collision detection, which silently dropped pills in dense
clusters as you panned/zoomed. `icon-allow-overlap`/`text-allow-overlap`
are now `true` — every venue always renders. Visual stacking (which pill
sits on top when several overlap) is driven by `symbol-sort-key`, tiered
default → hovered → selected; note that with overlap allowed, a _higher_
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
  _every_ edit, so ~25 venues couldn't be saved at all until this landed.
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
