# Progress Log

> Newest entries first. One dated entry per meaningful unit of work.
> Keep the **Current status / Next up** block accurate — it's the session-start orientation point.

---

## Current status

- **Phase:** Phase 1 implementation. Public reads, anonymous reports, admin auth, and admin venue CRUD are all wired to real Drizzle/Supabase (`tueats-dev`) — no mock data paths remain anywhere in the app. 65 published venues remain after retiring four Student Center meal-plan food-court chains (Saladworks, Zen, Chick-fil-A, BurgerFi) — the white Student Center Food Court info pin stays. Campus MapLibre map (venue-name pills — see 2026-08-20 entry for the DESIGN.md conflict flag — locate, attribution, curated 2D building footprints) is in place, with a 2026-08-20 accessibility/UX pass over the map surface. Listing pins are single-line cherry pills; TuEats overlays always paint above Positron so OSM road names never cover pins or zone plates.
- **Map zones are locked to street-line + building fills.** Overview shows `MAP_ZONE_MARK.streetLine` corridors (Student Center, W Montgomery along Klein Law with a gap before 13th, SERC trucks, Tyler trucks on Norris from Tomlinson to just before Tyler’s east edge) and `MAP_ZONE_MARK.buildingFill` washes (Vantage & The View buildings; The Wall plaza immediately west of Anderson Hall — not Anderson itself; Richie's Cafe footprint only, not Facilities; Liacouras Walk 1926–1938 building only, not 1940 Residence Hall). Click a zone to fly in. The rounded-hull A/B and the Streets/Shapes toggle are gone. DESIGN.md and `docs/design/map-and-pins.md` document this. Specs Feature 1 still says every truck appears as a pin — flagged, spec not edited.
- **Admin auth is email/password**, not OTP/magic-link — the OTP flow never completed a real session end-to-end (see `Context/decisions.md`'s 2026-08-18 entries) and was replaced outright. Authorization is unchanged: `requireAdmin()` still requires a `profiles` row with `role: "admin"`, granted only via direct DB access. `Specs/auth-security.md` now documents this V1 model (anonymous public / password admin(s) / future OTP student accounts) and explicitly allows for more than one admin account — no more spec/implementation mismatch.
- **Live admin login:** `abislam64@gmail.com` (not `@temple.edu` — admin isn't domain-restricted, see spec). Password was set directly via Supabase Dashboard → Authentication → Users → Add User (password field right in that dialog, "Auto Confirm User" checked) — deliberately bypassing email/SMTP entirely after the custom-SMTP password-recovery path proved unreliable (intermittent `535 "Invalid username"` SMTP auth failures against Resend, one confirmed success sandwiched between many failures — never fully root-caused, see `Context/decisions.md`). The original `tur67594@temple.edu` account was deleted; its orphaned `profiles` row was deleted and replaced with one for the new account's `auth.users.id`.
- **Pending:** a second admin account for a friend — email not yet provided by the user ("will look later"). Same no-email bootstrap process once it's available: Supabase Dashboard → Add User (with password) → tell me the email + desired display name → I grant `role: "admin"` via direct DB insert. No code changes needed for any number of admins — `profiles.role` is a per-row flag, not a singleton.
- **Password recovery** (`/admin/reset-password`, "Forgot password?" on the sign-in page) is fully implemented and spec-documented, but **not confirmed working end-to-end** — the custom SMTP (Resend) setup behind it is still flaky. Not currently blocking anything since admin bootstrap no longer depends on it; worth finishing later if self-service reset is wanted.
- **Known gaps:** every seeded venue is missing `hours`/`cuisines`/`zoneKey` (the KML source only carries name + coordinates) — pins show the "Food" fallback and the UI shows "Hours unknown" until an admin enriches each one via `/admin`. ~12-15 seeded entries are national chains (Chick-fil-A, 7-Eleven, etc.) stored with `type: "truck"` since the seed script hardcodes it — needs a reclassification pass. See `Context/decisions.md` for why the KML seed source, the admin-publish path, and the auth mechanism changed this session, and `Context/backlog.md` for deferred items.
- **Next up:**
  1. Confirm `abislam64@gmail.com` can sign in at `/admin/sign-in` and reach the real dashboard.
  2. When the friend's email is available: repeat the Add-User + DB-grant bootstrap for their account.
  3. Use the real `/admin` to enrich hours/cuisine/zone for remaining published venues and reclassify mis-typed chain entries.
  4. Fix `tests/e2e/home.spec.ts` — still asserts against pre-migration mock venue names; deferred by explicit scope choice.

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

- **Phase:** Phase 1 implementation. Public reads, anonymous reports, admin auth, and admin venue CRUD are all wired to real Drizzle/Supabase (`tueats-dev`) — no mock data paths remain anywhere in the app. 65 published venues remain after retiring four Student Center meal-plan food-court chains (Saladworks, Zen, Chick-fil-A, BurgerFi) — the white Student Center Food Court info pin stays. Campus MapLibre map (venue-name pills — see 2026-08-20 entry for the DESIGN.md conflict flag — locate, attribution, curated 2D building footprints) is in place, with a 2026-08-20 accessibility/UX pass over the map surface.
- **Admin auth is email/password**, not OTP/magic-link — the OTP flow never completed a real session end-to-end (see `Context/decisions.md`'s 2026-08-18 entries) and was replaced outright. Authorization is unchanged: `requireAdmin()` still requires a `profiles` row with `role: "admin"`, granted only via direct DB access. `Specs/auth-security.md` now documents this V1 model (anonymous public / password admin(s) / future OTP student accounts) and explicitly allows for more than one admin account — no more spec/implementation mismatch.
- **Live admin login:** `abislam64@gmail.com` (not `@temple.edu` — admin isn't domain-restricted, see spec). Password was set directly via Supabase Dashboard → Authentication → Users → Add User (password field right in that dialog, "Auto Confirm User" checked) — deliberately bypassing email/SMTP entirely after the custom-SMTP password-recovery path proved unreliable (intermittent `535 "Invalid username"` SMTP auth failures against Resend, one confirmed success sandwiched between many failures — never fully root-caused, see `Context/decisions.md`). The original `tur67594@temple.edu` account was deleted; its orphaned `profiles` row was deleted and replaced with one for the new account's `auth.users.id`.
- **Pending:** a second admin account for a friend — email not yet provided by the user ("will look later"). Same no-email bootstrap process once it's available: Supabase Dashboard → Add User (with password) → tell me the email + desired display name → I grant `role: "admin"` via direct DB insert. No code changes needed for any number of admins — `profiles.role` is a per-row flag, not a singleton.
- **Password recovery** (`/admin/reset-password`, "Forgot password?" on the sign-in page) is fully implemented and spec-documented, but **not confirmed working end-to-end** — the custom SMTP (Resend) setup behind it is still flaky. Not currently blocking anything since admin bootstrap no longer depends on it; worth finishing later if self-service reset is wanted.
- **Known gaps:** every seeded venue is missing `hours`/`cuisines`/`zoneKey` (the KML source only carries name + coordinates) — pins show the "Food" fallback and the UI shows "Hours unknown" until an admin enriches each one via `/admin`. ~12-15 seeded entries are national chains (Chick-fil-A, 7-Eleven, etc.) stored with `type: "truck"` since the seed script hardcodes it — needs a reclassification pass. See `Context/decisions.md` for why the KML seed source, the admin-publish path, and the auth mechanism changed this session, and `Context/backlog.md` for deferred items.
- **Next up:**
  1. Confirm `abislam64@gmail.com` can sign in at `/admin/sign-in` and reach the real dashboard.
  2. When the friend's email is available: repeat the Add-User + DB-grant bootstrap for their account.
  3. Use the real `/admin` to enrich hours/cuisine/zone for remaining published venues and reclassify mis-typed chain entries.
  4. Fix `tests/e2e/home.spec.ts` — still asserts against pre-migration mock venue names; deferred by explicit scope choice.
  5. Continue frontend polish against `DESIGN.md` where needed (optional Maputnik Positron fork; per-building hero tints).

---

## 2026-08-25 — Retire Student Center food-court chain venues

Retired Saladworks, Zen Japanese Food Fast at Temple University, Chick-fil-A (Student Center), and BurgerFi (`status: retired`). They were meal-plan food-court tenants stacked on the Student Center; the white "Student Center Food Court" pin in `campus-dining.ts` is the only marker that should remain there. Morgan Hall Chick-fil-A draft left untouched. Cache busted via `.next/cache` after the SQL retire (no admin `revalidateTag` path from the script).

---

## 2026-08-25 — Meal-plan dining info pins (SC food court, J&H, Morgan)

Meal-plan dining is out of scope, but the three big dining buildings shouldn't read as empty. Added `CampusDiningLayer`: one neutral, non-interactive pill per building (Student Center Food Court, J&H Dining Hall, Morgan Hall Food Court) from static config `src/config/campus-dining.ts` — white fill, stone border, ink-secondary regular text, same pill+stem silhouette drawn by a now-parameterized `venue-pill-icon.ts`. Pins sit on footprint centroids (Morgan between the towers) and always lose label collisions to venue pills via mount/insertion order in `VenueMap`. Not venues, never in the DB. Documented in `DESIGN.md` (pins section + decisions log), `docs/design/map-and-pins.md`, and `Context/decisions.md`.

---

## 2026-08-23 — Athletics overlay + wider campus viewport

Added OSM footprints for STAR, IBC Rec, Pearson Hall, Liacouras Center, Geasey Field, the Girard sports complex (building + fields), and the new Klein/Kimmel construction (15th Street Lot stand-in until OSM has the pavilion). Uniform stone paint; fields slightly more transparent. Expanded `CAMPUS_BOUNDS` west to `-75.161` and south to `39.971` so the default fit includes them. Conflicts with `Specs/domain-knowledge.md` compact-campus numbers — flagged, spec not edited.

---

## 2026-08-23 — Add Morgan Hall, 1300, and Temple Towers to the campus overlay

Those three residence halls sit just south of Cecil B. Moore, outside the original OSM extract bbox (`south: 39.979`), so they never made the curated GeoJSON. Added OSM footprints for Morgan Hall North, Morgan Hall South, 1300 Residence Hall, and Temple Towers Residence Hall (56 named buildings now), same academic-stone paint as the rest. Cache-busted the overlay URL.

---

## 2026-08-23 — Uniform campus-building stone (incl. Charles + Student Center)

User asked that **every** curated footprint match the academic stone — not just TECH / Tomlinson / TPAC. All 52 GeoJSON features now share fill `#E4E2DC` / stroke `#B8B4AA` / label `#3D3A35`, including Charles Library (was the library water-tint) and Howard Gittis Student Center (was student-life cherry). Category fields stay for label sort order. Conflicts with `docs/design/campus-buildings.md`'s category palettes; user override, logged in `Context/decisions.md`.

---

## 2026-08-23 — TECH Center / Tomlinson / TPAC match campus stone

TECH Center, Tomlinson Theater, and TPAC were classified as `student-life`, which paints the cherry wash (`#E8D4D8`). Recategorized them as `academic` so they use the same cool-stone fill/stroke/label as neighboring campus buildings. Student Center and Owl's Nest stay on the student-life cherry wash; Bell Tower stays landmark.

---

## 2026-08-20 — Map accessibility / IA / UX pass

Focused improvement pass over the explorer map (goals: accessibility,
information architecture, UX), verified end-to-end with Playwright +
SwiftShader WebGL screenshots at desktop and mobile sizes.

- **Pill states are now three-way** (`venue-pill-icon.ts` draws normal /
  hover / selected variants): selection adds a soft cherry halo ring outside
  the white border, so a selected pill is no longer visually identical to a
  hovered one. Canvas gained top/side padding so the halo isn't clipped; the
  stem tip stays at the bitmap bottom edge (anchor unchanged).
- **Pill label floor raised** from 6/7px to 7/8.5px at zoom 14/15.5 (unchanged
  13px at max zoom) — sub-7px labels were unreadable for everyone and hostile
  to low vision.
- **Mini-card completes the IA decision split** from
  `docs/design/map-and-pins.md` (name, zone, payment, open status): added
  `VenueLocation` + cash-only `PaymentTag`, an explicit "View details ↗" CTA,
  and a visible close button (dismissal used to be click-empty-map only,
  mouse-only and undiscoverable). Close returns focus to the map canvas.
  Card is a `div` wrapping a Link + sibling close button — no more nested
  interactive content risk; focus ring via `:focus-within`.
- **Keyboard + SR:** Escape clears pin selection (explorer-level listener);
  the map region has an sr-only usage hint (`aria-describedby`: arrows pan,
  +/- zoom, list parity); an sr-only `aria-live` region announces the
  selected venue's name + hedged open status; the MapLibre canvas got a
  cherry `:focus-visible` ring (was `outline: none` — a WCAG violation).
- **New "Reset view to campus" control** (frame-corners SVG) — after
  panning/zooming/locating there was no way back to the default framing.
- **Locate failures are now visible**: a `role="status"` bubble beside the
  control ("Location permission denied — map still works"), auto-clearing
  after 6s back to a retryable idle state; locate's `easeTo` now honors
  `prefers-reduced-motion`.
- **Overlap fixes:** mobile mini-card no longer covers the zoom/locate
  column (right inset clears it; verified via bounding boxes); desktop
  mini-card now sits above the attribution line instead of covering it
  (attribution visibility is a Feature 1 AC).
- **Touch targets:** map control buttons 40→44px; sheet drag handle 32→44px
  (peek detent bumped equally so the same content shows).
- **Robustness:** MapLibre's constructor throws synchronously when WebGL is
  unavailable; that rejection was swallowed (`void init()`) leaving an
  eternal "Loading campus map…". Now caught → the existing "Map tiles
  unavailable — browse the list" fallback renders (reproduced + verified in
  a no-WebGL headless browser).
- Housekeeping: removed dead HTML-marker pin CSS (`.venue-pin`,
  `.cuisine-pill*` — superseded by the native symbol layer); `.pnpm-store/`
  added to `.prettierignore` (a local artifact was failing `format:check`);
  installed the project-pinned Playwright headless shell (needed for
  `test:e2e` anyway).
- **Flagged, not changed:** `DESIGN.md` and `docs/design/map-and-pins.md`
  still specify _cuisine-label_ pills ("Halal", "Mex", …), but the
  implementation deliberately moved to venue-_name_ pills (commit `68fd925`
  "native map venue-name pills"). This pass improved within the venue-name
  direction; the docs/implementation conflict needs an explicit
  decision + doc update pass.

All checks green: `typecheck`, `lint`, `format:check`, 32 unit tests.

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
