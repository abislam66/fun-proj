# Decisions

> Append-only log of decisions too small for a `Specs/` change but important enough
> that silently reversing them would cause confusion. Newest first. Not a roadmap
> (`Context/backlog.md`) and not a changelog (`Context/progress.md`) — this is the
> **why**, for things that don't fit either.

---

## 2026-08-27 — Evidence bar for `is_vegan_friendly`, and how the Broad St zone conflict was actually resolved

**`is_vegan_friendly`'s bar, applied literally:** a venue only qualifies with a specific, named, standing menu item that's plant-based — not a drink, not a side by itself, not "could be made vegan on request." This ruled out several venues that had *some* signal: Champ's Diner had one source claiming vegan options and a Yelp reviewer directly denying it — conflicting evidence, left false rather than picking a side. Maple Star has vegetarian udon, confirmed, but vegetarian isn't vegan (broth/egg risk) and nothing confirmed it was actually vegan — left false. Mexican Grill Stand has a standing "veggies" taco/burrito filling, but nothing confirmed it ships without cheese/crema by default — the difference between "a real menu path" (counts, like Saladworks'/QDOBA's build-your-own vegan bowls, which do count) and "an ingredient that could theoretically anchor a request" (doesn't count) was the deciding line throughout.

**How the Broad St zone was widened without breaking the co-founder's deliberate gaps:** the naive fix (just enlarge the polygon to cover Wendy's/Panera's stored coordinates) would have swallowed the intentional notch between Klein Law and the Student Center zone and the intentional exclusion of the 1940 Residence Hall from Liacouras Walk — both real, tested design decisions from the original 8-zone build. The actual fix had two parts: (1) Wendy's/Panera's own coordinates were bad estimates from the 2026-08-26 batch-add (guessed too close to the campus core) — corrected via linear interpolation between two *real* geocoded points on the same street (Chick-fil-A Morgan Hall at 1601, McDonald's at 2109), which placed them meaningfully further from the conflict zone than originally guessed; (2) the zone polygon itself became a stepped/flag shape (full width north of Diamond St, narrow south of it) rather than a uniform rectangle, because Broad St and the campus core genuinely run close together south of Diamond. Before writing any DB update, every one of the 92 live venues was checked old-8-zones vs. new-10-zones (not "does the new zone's bounding box overlap" — an actual point-in-polygon comparison) to catch any real regression before it happened, not after.

**Why Mexican Grill Stand's "already had hours" surprised me mid-task:** it had been miscategorized as missing during an earlier scan of this same session — a bookkeeping slip on my end, not a data issue. The apply script's own "only write if currently null/empty" guard caught it and skipped the write, which is exactly why that guard exists.

---

## 2026-08-26 — Fixed a latent `unstable_cache` + Date bug in `toVenue()`

Found while manually testing after this session's `.next` cache clear
(the clear itself was to fix an unrelated stale-webpack-chunk error) —
the homepage threw `row.lastVerifiedAt?.toISOString is not a function`
on some requests but not others.

**Root cause:** `getPublishedVenues`/`getVenueBySlug`
(`lib/db/queries/venues.ts`) are wrapped in `unstable_cache`, whose
disk-backed store (`.next/cache`) round-trips values through JSON. A
`Date` survives untouched on a cache miss (fresh from postgres-js), but
comes back as a plain ISO string on a cache hit — `toVenue()` assumed
`row.lastVerifiedAt` was always a `Date` and called `.toISOString()`
unconditionally, which only exists on the former. Pre-existing bug, not
introduced by this session's work; it just hadn't been hit before because
nothing had cleared/exercised the disk cache mid-session until now.

**Fix:** `new Date(row.lastVerifiedAt).toISOString()` instead of
`row.lastVerifiedAt.toISOString()` — accepts either a `Date` or an
already-stringified date, since `new Date(x)` is a no-op-equivalent for
both. This is the only call site affected: admin reads
(`getVenueById`/`listAllVenuesAdmin` in the same file, feeding
`admin-venue-form.ts`) are never wrapped in `unstable_cache`, so they
always get real `Date` objects and were never at risk.

**Verified:** hit `/` twice against a freshly-cleared cache (first =
cache miss, second = cache hit) — both return 200 with no error markers
in the body. Lint/78 tests/typecheck all still pass.

---

## 2026-08-26 — Venue photos extended to a real multi-photo gallery (up to 10)

The single-admin-photo model (one `source: "admin"` row per venue,
upsert-in-place) is gone. Admin can now upload, remove, reorder, and set a
cover photo across up to `MAX_VENUE_PHOTOS` (10) photos per venue, all in
the same `venue_photos` table introduced during the 2026-08-25 photo-
system consolidation — no new table or column was needed, since that
table was already row-per-photo with a `sort_order`. Extending it was a
matter of removing the "only ever one admin row" constraint from the
query/action layer, not a schema change.

**What changed:**
- `getAdminVenuePhoto`/`upsertAdminVenuePhoto`/`deleteAdminVenuePhoto`
  (single-row, upsert-in-place) replaced by `getVenuePhotosForAdmin`
  (full list), `insertVenuePhoto` (always appends), `deleteVenuePhotoById`,
  and `setVenuePhotoOrder` (rewrites `sort_order` to match a given id
  list) in `lib/db/queries/venue-photos.ts`.
- Server actions: `uploadVenueImage`/`removeVenueImage` replaced by
  `uploadVenuePhoto`, `deleteVenuePhoto`, `reorderVenuePhotos` in
  `actions/admin.ts`. The 10-photo cap is enforced app-level (count before
  insert), not a DB constraint — consistent with how validation elsewhere
  in this codebase lives in the action/schema layer, not in Postgres
  constraints, except the one existing campus-bounds check.
- "Set as cover" is not a new field — it's `reorderVenuePhotos` with the
  chosen photo moved to the front (`sort_order = 0`), reusing the existing
  reorder machinery via a new pure helper
  (`lib/admin-photo-order.ts::movePhotoToFront`). The public gallery
  already treats index 0 as the priority-loaded photo
  (`venue-photo-gallery.tsx`'s `priority={index === 0}`), so this needed
  no gallery change at all — cover photo and sort_order 0 were already the
  same concept, just not admin-controllable before.
- Blob cleanup on delete now checks `photo.source === "admin"` before
  calling Blob `del()` — legacy photos point at local `/photos/...` paths
  (from the pre-backend static registry), never a Blob URL, so they must
  never be passed to `del()`. Verified directly against a real
  legacy-source row that this guard is actually exercised, not just
  assumed correct by inspection.
- **The public `VenuePhotoGallery` component was not touched at all** —
  it already rendered a bare horizontal strip with no arrows/dots/count
  UI regardless of photo count, so "0 → nothing, 1 → no unnecessary
  controls, 2–10 → existing gallery" was already true of the co-founder's
  design before this work; extending to 10 admin-manageable photos needed
  zero frontend changes to preserve.
- Admin editor UI: the old single "Photo" section (preview + replace/
  remove) became a "Photos (X / 10)" grid — each photo gets ↑/↓ reorder,
  "Make cover" (hidden for the current cover), and "Remove" buttons, plus
  an upload control that disables itself at the cap instead of erroring
  after the fact.

**Verified live against `tueats-dev` + the real Vercel Blob store**
(`.scratch/verify-photo-system.mjs`, deleted after use, not committed):
picked a real zero-photo venue, drove it through 0 → 1 → 10 photos,
confirmed the 11th-upload cap check, reorder, make-cover, delete-with-
blob-cleanup, and delete-of-a-legacy-row-without-touching-Blob — then
fully restored the venue to 0 photos and deleted every test blob. Existing
photos (7-eleven's 3 legacy rows, one pre-existing admin photo on
Korea House) were confirmed untouched before and after.

**Not verified:** the actual admin UI (upload/reorder/cover buttons)
through a real logged-in browser session — same standing limitation as
the zone-system work, no admin credentials available to this session.

---

## 2026-08-26 — Old 4-zone system replaced by the co-founder's 8-zone map system

Admins now explicitly control both a venue's map zone and its exact
coordinates in `/admin/venues/[id]`, instead of the old, disconnected
setup where the admin picked a value from an unrelated 4-zone vocabulary
(`config/zones.ts`: norris/montgomery/twelfth/other) while the co-founder's
real 8-zone map system (`config/map-zones.ts`) computed silently in the
background with no admin visibility.

**What changed:**
- `venues.zone_key` → `venues.map_zone` (migrations `0006`/`0007`), storing
  one of the 8 `MapZoneKey`s or the literal `"other"` sentinel
  (`OTHER_MAP_ZONE`, `src/lib/venues.ts`) — deliberately **not** added to
  `config/map-zones.ts`'s `MAP_ZONES` object, so it can never leak into
  the public filter bar as a 9th chip. Confirmed live: exactly 8 zone
  chips still render, unchanged.
- Backfilled via `scripts/backfill-map-zones.ts` (kept in the repo,
  idempotent, same one-off-script pattern as `seed-kml.ts`) using the
  same `mapZoneContaining()` that already drives the live public zone
  filter — not a guess, since it can't disagree with itself. Live
  `tueats-dev` result: 74 venues, 25 landed in a real zone, 49 became
  `"other"` (most of campus sits outside the 8 hand-drawn areas — expected
  given how small/specific those areas are, not a bug).
- **The live public zone filter (`filterVenues`, `venue-map.tsx`,
  `filter-bar.tsx`) was not touched at all.** It already computed zone
  membership live from lat/lng, automatically, before this change — this
  work only added admin-side visibility and control on top of an already-
  correct mechanism. Confirmed nothing there changed behaviorally.
- Admin editor gained a "Map zone" dropdown (8 real zones + explicit
  "Other / Outside mapped zones") and a small new interactive location
  picker (`VenueLocationPicker`, click/drag on a minimal MapLibre map) —
  the old plain lat/lng number inputs stay as a fallback/precise-entry
  option alongside it, not replaced.
- New non-blocking validation: `zoneMismatchWarning()`
  (`lib/admin-venue-form.ts`) compares the admin's picked zone against
  what `mapZoneContaining()` computes from the current coordinates, in
  both directions, and shows a warning without ever auto-correcting
  either field. Caught a real bug during testing: `Number("")` is `0`,
  not `NaN`, so blank coordinate fields were briefly treated as a real
  point (0,0) and produced a false "outside every zone" warning before
  the admin had entered anything — fixed by checking for blank strings
  explicitly before parsing.
- `config/zones.ts` deleted (fully superseded, zero remaining consumers).
  `config/map-zones.ts` itself was left untouched except one factual
  comment-only fix (it referenced the now-deleted file).

**Publishing still requires a zone chosen** (real or explicit "other") —
same UX invariant as before, just retargeted to the new vocabulary.

**Known content side-effect (not a bug):** since old/new zone vocabularies
describe different geography, a handful of venues that had a specific old
zone label with no `building` set now show generic "outside mapped zones"
text instead (`venueLocationText`/`VenueLocation`) — verified against live
data to be about 7 venues (e.g. `top-bap`, `hanks-cafe`, `cha-cha`), not
the 49 it might look like at first glance (most either already showed
generic text, already have a building override, or land on a different
but still-real new-zone label). Worth a manual building/landmark touch-up
for those few, not a systemic problem.

---

## 2026-08-25 — Two venue-photo systems consolidated into one (`venue_photos` table)

Resolved the conflict flagged in the entry directly below: this session's
admin-upload path (DB + Vercel Blob) and the co-founder's frontend-only
`VenuePhotoGallery` (static `public/photos/<slug>/` + `config/venue-photos.ts`)
were two independent answers to "how do venue photos work," merged
side by side with neither wired to the other. Per explicit instruction,
**the co-founder's `VenuePhotoGallery` appearance, layout, styling, and
interactions were not touched at all** — only its data source changed
from the static config to a DB query.

**New table, not a reused single column.** The existing `venues.image_url`
(added earlier this session, never actually used — no admin had uploaded
a photo yet, confirmed empty before dropping it) could only ever hold one
photo per venue. The frontend-only registry had **3** photos on one venue
(`7-eleven`), and "preserve all existing photos" ruled out anything that
would lose 2 of them. `venue_photos` (`venue_id`, `url`, `alt`,
`source: 'legacy' | 'admin'`, `sort_order`) supports the many-photos-per-venue
shape `VenuePhotoGallery` was already built for. The 3 existing placeholder
photos were migrated in as `source: 'legacy'` rows pointing at their
original `public/photos/_placeholders/` files — same bytes, same paths,
untouched — via a data migration in `drizzle/0005_tough_captain_america.sql`.

**Admin UI unchanged.** `uploadVenueImage`/`removeVenueImage` still do
exactly what they did before (single upload/replace/remove) — they just
now target the one `source: 'admin'` row per venue in `venue_photos`
instead of `venues.image_url`. Legacy rows are never touched by admin
actions. An admin-uploaded photo is appended after any legacy photos and
shows up in the *same* gallery strip, at the *same* position photos
already occupy — no second photo UI on the page.

**Removed, not cofounder's:** the separate "hero image" block this
session had added directly to `venue-detail.tsx` (a `next/image` render of
`venue.imageUrl` above the hero). It was this session's own addition, not
the co-founder's — keeping it would have shown an admin-uploaded photo
twice (once as a hero, once in the gallery) once both systems shared data.
Removed along with its now-dead `.detail-hero-image` CSS rule.

`src/config/venue-photos.ts` is deleted (fully superseded). See
`Context/backlog.md`'s now-removed "Venue photo storage + upload backend"
row — this entry is what actioned it.

---

## 2026-08-25 — Venue photos: Vercel Blob for storage, admin-only for now

Added venue image upload. Two scoping decisions worth recording:

**Admin-only, not user-uploaded.** The request was "let admins and users
upload images." V1 has no student/member accounts at all
(`auth-security.md`'s explicit V1 note) — there's no auth surface to gate
a user upload behind, and building one would mean pulling milestone ②
(accounts) forward, which `CLAUDE.md`'s phase-discipline rule forbids
while milestone ① is still incomplete. Only the admin half was built;
user-submitted photos wait for the accounts phase, same as ratings/reviews.

**Vercel Blob, not Supabase Storage.** `auth-security.md` states plainly:
"Never read or write data through `supabase-js` — data access is Drizzle,
server-side, period. (`supabase-js` is for auth flows only.)" Supabase
Storage is accessed through that same `supabase-js` client, so using it
here would mean stretching "auth flows only" to cover file storage too.
Vercel Blob avoids the question entirely — it's a Vercel product (keeps
the vendor count at two: Vercel + Supabase, per `architecture-planning.md`'s
existing note on that), called directly from inside the server action
(`put()`/`del()` from `@vercel/blob`) after `requireAdmin()` has already
run, so the single-write-path shape (validate → authorize → write →
revalidateTag) is unchanged. A Blob store (`venue-images`, public-read) was
created and linked to the `tueats` Vercel project via `vercel blob
create-store`; `BLOB_READ_WRITE_TOKEN` was pulled into `.env.local`
automatically and needs the same treatment as the other secrets when the
project is eventually deployed (Preview/Production env vars in Vercel).

---

## 2026-08-25 — List rows select on the map; they never navigate

`VenueRow` is a button, not a link (user call: "our UI is very map-heavy, we need to be consistent with that"). Clicking a row selects the venue — map flies to it and the anchored mini-card opens; on mobile the results sheet tucks to peek (via `collapseSignal` on `MobileSheet`) so the map is actually visible. The mini-card's "View details" is the ONLY explorer path to `/eat/[slug]`. A selected venue outside every map zone renders its own single pill (`pinVenues` fallback in venue-map.tsx) so the popup never floats bare. Don't "restore" row links; no spec conflict — Feature 2's ACs don't require row navigation, and Feature 1's mini-card→detail AC still holds.

---

## 2026-08-25 — Payment filter removed (user call; spec conflict flagged)

The "Accepts card" chip — and the whole `payments` field of `VenueFilters` (parse/serialize/filter, `?payment=` param) — was removed at the user's request. The model supported cash+card but the UI only ever exposed card, and most seeded venues have `acceptsCard: null`, so the filter mostly emptied the list. **This diverges from `Specs/features.md:45`**, which lists payment among Feature 1's combinable filters — flagged here, spec not edited (per `Specs/conventions.md`). Venue payment DATA stays: `acceptsCash`/`acceptsCard` still render as the "Cash Only" tag and on detail/admin. Old `?payment=` URLs now parse as unknown params and are ignored.

---

## 2026-08-25 — Venue pill names are baked sprites, not text-fields

Same root cause and fix as the zone labels below: MapLibre paints a symbol layer's icons first, then all its text, so overlapping pills let a lower pill's name bleed across the pill above it. `buildVenuePillIcon` now bakes the name into one opaque sprite per venue × state (normal/hover/selected), registered lazily and cache-busted by name; the layer is icon-only with an `icon-size` zoom ramp reproducing the old text scaling. Don't reintroduce a `text-field` on this layer — overlap + live text always bleeds.

---

## 2026-08-25 — Venue photos are frontend-only static content, no backend

Detail-page photos ship with **no backend at all** — the user's explicit call ("we won't touch backend logic or infrastructure, frontend only"). No DB column, no Supabase Storage bucket, no upload server action, no service-role key; nothing in `Specs/` changed. Instead, image files are committed under `public/photos/<slug>/` and registered per-slug in `src/config/venue-photos.ts`; `VenuePhotoGallery` renders a strip when entries exist and nothing otherwise. Don't "fix" the missing upload path — when photos should come from admins instead of repo commits, that's the spec-change project in `Context/backlog.md`.

---

## 2026-08-25 — Map overlays always cover OSM labels

Positron road names (and other basemap symbols) paint _under_ every TuEats overlay. Inserting our symbol layers ahead of the style’s first label put pins _under_ “West Montgomery Avenue”. Stack lives in `overlay-order.ts`; `liftOverlaysAboveBasemap` keeps it on remount.

---

## 2026-08-25 — Listing pins stay one line

Venue-name pills use `icon-text-fit: width` and a wide `text-max-width` so names like “Nanu's Hot Chicken” stay on one line instead of growing into a taller stadium. DESIGN.md still specifies cuisine labels on pins; implementation continues to show venue names (flagged 2026-08-20).

---

## 2026-08-25 — Zone name plates are opaque sprites

MapLibre draws every symbol `icon-image` in a layer, then every `text-field`. A stretchable plate plus live type let “Student Center” bleed through “W Montgomery”. Zone names are now baked into opaque sprites so the top plate fully covers the one under it.

---

## 2026-08-25 — Liacouras Walk is buildingFill, not 1940 Residence Hall

`liacouras-walk` uses `MAP_ZONE_MARK.buildingFill` on OSM 1926–1938 N. Liacouras Walk — the building labeled “Liacouras Walk” south of 1940 Residence Hall. The path, 1940, and 1810 Liacouras stay unfilled.

---

## 2026-08-25 — Richie's Cafe is buildingFill, not the Facilities block

`richies-cafe` uses `MAP_ZONE_MARK.buildingFill` on the OSM Richie's Cafe footprint on W Berks. Facilities and the rest of that block stay unfilled — same “paint the named place, not the neighbor” rule as The Wall vs Anderson.

---

## 2026-08-25 — Tyler trucks runs Tomlinson to short of Tyler’s east edge

`tyler-trucks` follows W Norris from Tomlinson’s west edge, through 13th and Presser, and stops a bit before Tyler’s east edge — not at 13th and not out to 12th/SERC. Still not list-filter `norris`.

---

## 2026-08-25 — Tyler trucks is a map zone, not list-filter `norris`

`tyler-trucks` is a campus-overview street-line on W Norris. It is not `config/zones.ts` `norris` (list/admin filter). Same split as `w-montgomery` vs `montgomery`.

---

## 2026-08-25 — W Montgomery is a map zone, not list-filter `montgomery`

`w-montgomery` is a campus-overview street-line along Klein Law on Montgomery, stopping short of 13th so a visible gap sits before the Student Center L. It is not `config/zones.ts` `montgomery` (list/admin filter). Same split as the other map clusters.

---

## 2026-08-25 — The Wall paints the plaza, not Anderson Hall

`the-wall` is `MAP_ZONE_MARK.buildingFill` because students mean the 12th Street vendor-pad plaza (OSM outdoor seating / food-pad west of Anderson), not a street centerline and not Anderson Hall itself. The cherry wash sits immediately left of Anderson's west facade. Paley and Anderson stay unfilled.

---

## 2026-08-25 — Map marks: `streetLine` vs `buildingFill`

The winning overview is both marks at once, not a hull overlay. Named so we can talk about them without saying "the red line" vs "the building outline":

- `MAP_ZONE_MARK.streetLine` — cherry corridor. Student Center, W Montgomery, SERC trucks, Tyler trucks.
- `MAP_ZONE_MARK.buildingFill` — cherry wash. Vantage & The View buildings; The Wall plaza west of Anderson (not Anderson); Richie's Cafe (cafe only, not Facilities); Liacouras Walk (1926–1938 building only, not 1940).

Rounded hulls were the rejected A/B. Do not reintroduce a public toggle unless we are comparing again.

---

## 2026-08-25 — Map zones are a new overlay, not list-filter `zone_key`

The home map A/B (Student Center / Vantage & The View / The Wall / SERC trucks)
is **not** the existing `config/zones.ts` keys (`norris`, `montgomery`,
`twelfth`, `other`). Those remain list/admin filter language. Map clusters are
`src/config/map-zones.ts` plus `public/maps/map-zones.geojson`. Venue membership
for the prototype is spatial (point-in-polygon), not `venues.zone_key`, because
most seeded rows have no zone and the user will upload corridor data later.

**Why two treatments:** the user asked to compare street/corridor highlights vs
rounded hulls on the live map before locking DESIGN.md. Cherry stays rare
(line casement + soft fill, not a solid flood). Vantage & The View is buildings,
not a street, even in the Streets treatment.

**Why this contradicts DESIGN.md on purpose:** DESIGN.md currently says zones
are list-filter language only with no polygon fills. Specs Feature 1 still says
every truck appears as a pin. Neither file was edited. After a winner is picked,
update DESIGN.md / `docs/design/map-and-pins.md` and drop the Streets/Shapes
toggle. Do not reuse map-zone keys as list `zone_key` values without an explicit
decision.

---

## 2026-08-25 — Student Center food-court chains are retired, not mapped as venues

Saladworks, Zen Japanese Food Fast, Chick-fil-A (Student Center), and BurgerFi
were seeded as published venues because the KML dump treated every pin as
off-meal-plan food. They're meal-plan food-court tenants inside Howard Gittis
Student Center — out of scope (`Specs/overview.md`). The user asked to drop
those cherry pills and keep only the white "Student Center Food Court" info
pin.

**Why retire, not delete:** venues are retired never deleted. Public
`getPublishedVenues()` already hides `status: retired`. Detail URLs can stay
as Closed. The Morgan Hall Chick-fil-A draft was left alone (not in the
screenshot, not published).

**How to apply:** don't republish these four without an explicit scope change.
Other meal-plan tenants that show up the same way should be retired the same
way, not filtered in the map layer.

---

## 2026-08-25 — Meal-plan dining halls get one static info pin each, not venue rows

The product explicitly does not cover meal-plan dining, but the Student Center
food court, J&H dining hall, and Morgan Hall food court are the most food-dense
buildings on campus — leaving them blank makes the map look wrong. Per the
user's ask, each building now carries exactly one pin that just says what it is.

**Why:** these are map annotations, not venues. Modeling them as venues (even
retired/unpublished ones) would pull out-of-scope places into the DB, the admin
UI, and the single write path for no benefit. They live in static config
(`src/config/campus-dining.ts`) rendered by `CampusDiningLayer` — neutral
white/stone pill, non-interactive, always losing label collisions to venue
pills. Coordinates are the curated building-footprint centroids (Morgan's pin
sits between the two towers, where the dining floor is).

**How to apply:** don't "promote" these to venues later without an explicit
scope change, and don't reuse the cherry venue pill for anything
non-tappable — the neutral treatment is what signals "information, not a
choice". If more out-of-scope-but-visible places show up, add them to the same
config, sparingly.

---

## 2026-08-21 — `zoneKey` will not be auto-computed from coordinates

During the venue enrichment pass, a lat/lng bounding-box + latitude-band
rule was written to backfill `zoneKey` for the 26 venues missing it,
mirroring the corridor description in `domain-knowledge.md`. Before
applying it, it was backtested against all 35 venues that already had a
human-assigned `zoneKey` in the live DB: **8/35 (23%) disagreed** with the
already-curated value (e.g. Hank's Cafe is `twelfth`, the rule said
`montgomery`; Samosa Deb is `montgomery`, the rule said `norris`). A
nearest-neighbor variant did worse (31% mismatch).

This confirms `domain-knowledge.md`'s "zones are curated data, not
computed clusters" line is a real, load-bearing constraint, not boilerplate
caution — geography alone doesn't predict which side of an informal truck
corridor a venue counts as. The rule was discarded rather than applied;
`zoneKey` backfill for the remaining 26 venues stays a manual `/admin` task
for someone with local knowledge of where the corridor boundaries actually
fall. Don't resurrect an automated version without new signal beyond
coordinates (e.g. street-address parsing, or an admin walking the
corridor).

---

## 2026-08-18 — Admin accounts bootstrapped via Supabase dashboard "Add User", not email

The custom-SMTP (Resend) password-recovery path built earlier the same day
proved unreliable in practice: Supabase's Auth Logs showed repeated
`535 "Invalid username"` SMTP authentication failures against Resend, with
exactly one confirmed `200` success sandwiched in between many failures —
never fully root-caused (the SMTP username field kept reverting or
mismatching between saves; possibly compounded by a browser extension
already known to interfere with form fields on this machine, per the
`fdprocessedid` hydration issue fixed earlier). Rather than keep debugging a
flaky third-party mail pipeline just to get a _first_ admin password set,
switched to a strictly simpler bootstrap: Supabase Dashboard → Authentication
→ Users → **Add User** exposes a direct password field + "Auto Confirm User"
checkbox on user creation — no email involved at all.

The site owner's account was recreated this way, deliberately using a
personal Gmail (`abislam64@gmail.com`) instead of the original
`tur67594@temple.edu` — allowed, since admin identity in this app was never
domain-restricted (only the old, now-removed OTP flow was). The old
`auth.users` row was deleted; its `profiles` row (same id) became orphaned
and was deleted and replaced with a fresh row for the new `auth.users.id`,
same `display_name` ("TuEats Team"), `role: "admin"`.

**Why noting this:** the app also has a working self-service "Forgot
password?" flow (`/admin/reset-password`, `Context/decisions.md`'s earlier
entry the same day) that depends on this same SMTP config actually working.
That flow's code is correct and tested — the SMTP delivery layer underneath
it just isn't reliably configured yet. Don't assume "Forgot password?" works
in production without re-verifying the Resend/SMTP setup independently.

**How to apply:** bootstrap every future admin account (starting with the
site owner's friend, pending as of this entry) the same no-email way — Add
User with a password, then a direct DB insert into `profiles` with
`role: "admin"` for that user's id. This is the standard mechanism now, not
a one-off workaround; keep using it unless the SMTP/Resend setup is
confirmed reliable end-to-end first.

---

## 2026-08-18 — Password recovery: client-side token exchange, no callback route restored

The first real-world password reset (dashboard-triggered "Send Password
Recovery") landed on the homepage with no way to set a new password. Root
cause: Supabase puts recovery tokens in the URL **fragment**
(`#access_token=...&type=recovery`) for dashboard-triggered resets, and a
server (route handler, middleware, Server Component) never receives the
fragment at all — it's stripped by the browser before the request is sent.
Nothing in the app was reading it, so the tokens were just sitting unused in
the URL bar.

Fixed without restoring the old `/auth/callback` route: `/admin/reset-password`
(`reset-password-form.tsx`) is a client component that reads the fragment (or
a `?token_hash=` query param, defensively, in case the email template is ever
customized to the newer style) and calls `supabase.auth.setSession()` /
`verifyOtp()` **client-side** — there's no way around this being client-side
for the fragment case, since the server structurally cannot see it. The
actual password write still goes through a server action
(`updateAdminPassword`), keeping the mutation itself server-side per the
single-write-path rule; only the session bootstrap is client-side, and only
because Supabase's own token delivery mechanism leaves no alternative.

Also added: a "Forgot password?" self-service trigger on `/admin/sign-in`
(`requestPasswordReset` → `resetPasswordForEmail`, redirect target
`/admin/reset-password`), and `src/components/auth/recovery-redirect.tsx` — a
tiny client component mounted in the root layout that forwards stray recovery
tokens found on _any_ page to `/admin/reset-password`. This exists because
Supabase's dashboard-triggered reset has no field to specify a redirect
target — it always uses the project's Site URL (this app's homepage) — so
without this safety net, a maintainer using the dashboard's own "Reset
Password" button (rather than the in-app link) would hit the exact bug just
fixed, again.

**Why noting this:** the fragment-vs-query token distinction is easy to
re-break — if anyone in the future decides `/auth/confirm` or a similar
route handler is needed, remember it will only ever catch the query-param
case; the fragment case is not fixable server-side, full stop.

**How to apply:** don't move the token-reading logic into a route handler
expecting it to catch every case. Don't remove `recovery-redirect.tsx`
without confirming the Supabase project's Site URL and dashboard-reset
behavior no longer route recovery tokens to a non-recovery page.

---

## 2026-08-18 — Admin auth switched from OTP/magic-link to email + password

Replaced the admin sign-in flow entirely: `signInAdmin(email, password)` via
`supabase.auth.signInWithPassword()`, no more `requestSignup`/OTP, no more
`/auth/callback` route handler (deleted — it existed solely for OTP code
exchange). Added `signOutAdmin()` and a "Sign out" control in the admin header
(previously missing entirely). Dropped the now-unused `otp_requests` table via
a proper migration (`drizzle/0002_drop_otp_requests.sql`), not a hand-edit of
past migrations.

**Why:** the OTP flow never worked end-to-end this session — `auth.users.last_sign_in_at`
stayed `null` across every real attempt. Root cause: Supabase's default PKCE
flow requires the `code_verifier` cookie set when the link is _requested_ to
still be present when it's _clicked_ — which fails if the email is opened on a
different device/browser than the one used to sign in (common — people check
email on their phone), and separately is vulnerable to corporate link-scanners
(Office 365 Safe Links, common on `.edu` tenants) pre-fetching and consuming
the single-use code. Password auth has neither failure mode: the whole
exchange happens in one request, no second device, no clickable link to
pre-fetch.

This was a deliberate, explicit product-owner decision (not a quick fix) that,
at the time, contradicted `Specs/auth-security.md`'s text (email-OTP-only, no
password, for every user). The owner has since given explicit permission to
update that spec, and it now reflects this reality: public browsing stays
anonymous, a future phase may add verified `@temple.edu` **student** accounts
via OTP for ratings/reviews (not implemented — see `Context/backlog.md`), and
**admin** specifically is email/password.

**How to apply:** authorization is unchanged — `requireAdmin()` still requires
a `profiles` row with `role: "admin"`, granted only by direct DB access, and a
successful password sign-in never implies admin access on its own. Don't
reintroduce OTP/magic-link code without revisiting this decision. The admin
account's password is never known to or handled by app code — it's set via
the Supabase dashboard (see the account-bootstrap note in the same session's
progress entry).

---

## 2026-08-18 — Admin role grant stays manual DB-only, even post-cutover

`Specs/auth-security.md:57` says role escalation to `admin` happens only via direct
database access by the maintainer — no app surface may grant it. That's still true
after this session's admin cutover to real Supabase OTP auth: signing in for real
only creates a Supabase `auth.users` row and lets `requestSignup`/`/auth/callback`
issue a session. It does **not** create a `profiles` row, and without one
`getUser()` (`src/lib/auth.ts:60-68`) treats the session as unauthenticated for
authorization purposes. `requireAdmin()` will throw `AuthError` for a real,
successfully-signed-in user until a `profiles` row with `role: 'admin'` exists for
their `auth.users.id`.

**Why:** this is the specced mechanism, not a gap — "no app surface can grant admin"
is a deliberate security boundary (auth-security.md:57), not an oversight.

**How to apply:** after the site owner signs in once via `/admin/sign-in` with a
real `@temple.edu` address, look up their id (`select id from auth.users where
email = '...'`, reachable over the same `DATABASE_URL` connection Drizzle already
uses — no service-role key needed) and insert their `profiles` row directly via
SQL, `role: 'admin'`. Until that row exists, `/admin` shows a plain "your account
isn't an admin yet" message (`src/components/admin/access-denied.tsx`) instead of
crashing.

---

## 2026-08-18 — `.next/cache` + `revalidateTag`: any out-of-band DB write needs a manual cache clear

Direct SQL writes to `venues` (bypassing `src/actions/admin.ts`) don't trigger
`revalidateTag("venues")`. Next's on-disk incremental cache (`.next/cache`) then
keeps serving whatever `getPublishedVenues()`/`getVenueBySlug()` returned on the
_first_ call after the dev server started — even across dev-server restarts, since
the cache persists to disk, not just memory. Hit this directly this session: an
out-of-band `UPDATE venues SET status='published'` left the public homepage
showing stale (in one case, empty) results until `.next/cache` was deleted by hand.

**Why noting this at all:** the fix (`rm -rf .next` + restart) is trivial once you
know the cause, but the symptom looks exactly like a broken query or a wrong DB
connection, and cost real time to diagnose.

**How to apply:** any future write to `venues`/`profiles`/`problem_reports` that
doesn't go through a real server action (ad hoc SQL, a one-off script, a Supabase
dashboard edit) needs an explicit `.next/cache` clear before the public site will
reflect it. Writes through `src/actions/admin.ts` don't have this problem — they
already call `revalidateTag` correctly.

---

## 2026-08-18 — KML seed source: live Google My Maps URL → local `TuEats.kml` file

`scripts/seed-kml.ts` used to fetch Temple's public My Maps KML export live
(`Specs/domain-knowledge.md:89,102` — `mid=1kFf5IaeeXiFpn_UHIyd4UqwHj90`, documented
there as "~40 placemarks"). That map turned out to be a smaller, older snapshot (31
unique names on inspection) than the one actually being curated — a separate,
more complete Google My Maps export manually saved to `TuEats.kml` at the repo
root (75 placemarks, including chains like Chick-fil-A/BurgerFi/Saladworks/7-Eleven
that the live URL's map didn't have at all). The script now reads that local file
instead of fetching the live URL.

**Why:** completeness over automatic freshness — the live URL would keep silently
missing venues that were only ever added to the newer map.

**How to apply:** re-export from Google My Maps (File → Download → KML) and
overwrite `TuEats.kml` whenever the source map changes, then re-run `pnpm
seed:kml` — it's idempotent (dedupes by exact name or ~15m coordinate proximity,
per `Specs/domain-knowledge.md`'s gyro-truck-dedup rule) so re-running is safe.
**Not yet updated:** `Specs/domain-knowledge.md:89,102` still documents the old
live URL as current — `Specs/` isn't touched without explicit instruction
(`CLAUDE.md:11`), so this is flagged here rather than silently fixed. Worth an
explicit spec-update pass at some point.

---

## 2026-08-18 — 22 of the 69 seeded venues were published via direct SQL, not `publishVenue()`

Before the admin cutover existed, 22 KML-seeded draft venues were flipped to
`status: 'published'` with a raw SQL `UPDATE`, at the site owner's explicit choice,
specifically to see real data on the site without first building full real admin
auth (which needed a `@temple.edu` email that wasn't confirmed available yet).
Superseded later the same session once the real admin cutover shipped — the
remaining 47 (from the fuller local KML re-seed) were also published this way
before the cutover finished landing.

**Why noting this:** none of these 69 venues have ever been through
`src/actions/admin.ts`'s `upsertVenue`/`publishVenue` path — they exist in the DB
exactly as the seed script inserted them (plus the direct status flip), with no
`revalidateTag` history and no admin-reviewed content. They're real rows, not
placeholders, but they haven't been "published" in the sense the write-path
implies (validated, reviewed, enrichable).

**How to apply:** no action needed structurally — the real admin UI now works and
any future publish/edit goes through the proper path. Just don't assume these 69
rows were ever admin-reviewed; treat them as raw seed data pending enrichment
(tracked in `Context/backlog.md`).
