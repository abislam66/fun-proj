# Progress Log

> Newest entries first. One dated entry per meaningful unit of work.
> Keep the **Current status / Next up** block accurate — it's the session-start orientation point.

---

## Current status

- **Phase:** Phase 1 implementation. The mock-functional public/admin UI **and the interactive MapLibre campus map** are complete and verified; production data/auth wiring remains.
- **Next up:**
  1. Connect public venue reads, anonymous reports, admin authentication, and admin mutations to the existing Drizzle/Supabase server boundary (needs live Supabase credentials).
  2. Run the KML seed workflow against dev and replace mock fixtures with reviewed development data (needs a live DB).

---

## 2026-07-18 — Coordinate-bounds reconciliation + seed hardening

Closed the two mapping-correctness follow-ups surfaced by the audit. Split the campus geometry into two config values: `CAMPUS_BOUNDS` stays the tight map viewport box, and a new `CAMPUS_COORDINATE_BOUNDS` (mirrors the `venues` lat/lng DB CHECK: lat 39.96–40.02, lng −75.18–−75.13) is now the single source of truth for coordinate validation. Zod `venueInputSchema` and the mock-admin validator point at it, so a legit truck near Broad St / Cecil B. Moore no longer passes the seed yet fails an admin edit.

Extracted the KML parse/dedup/bounds logic into pure `src/lib/seed/kml.ts` (unit-tested): parsing now skips off-campus and malformed points instead of inserting garbage drafts, and dedup tightened its coordinate epsilon to ~5m so distinct-but-close trucks (the five gyro carts) stay separate while re-run idempotency holds via exact-name match; a ~25m review radius logs distinct neighbours for a manual glance. `scripts/seed-kml.ts` is now a thin wrapper over the tested module.

Verification: TypeScript, ESLint, Prettier, 41 Vitest tests (+9), production build.

---

## 2026-07-18 — MapLibre campus map + cuisine pins

Implemented the deferred explorer map slot per `DESIGN.md` / `docs/design/map-and-pins.md`. Added `src/components/map/` (`VenueMap`, `VenuePinLayer`, `CuisinePill`, `LocateControl`, `MapAttribution`); MapLibre GL 5 is dynamically imported (`ssr:false`) so it stays out of the initial bundle and the list works if tiles fail. Cuisine-pill pins carry the primary cuisine label only (open status stays off the pin), Framer Motion springs the selected pill, and a deferred one-shot GSAP stagger runs after load (skipped under `prefers-reduced-motion`). List↔pin hover sync, pin→mini-card→detail (second tap opens), custom zoom + client-only locate (blue dot never leaves the browser), quiet OSM/OpenFreeMap attribution, and campus-locked `maxBounds`.

Also fixed two audit defects this unblocked: the basemap style URL was `liberty` in `site.ts` / `.env.example` / CI — corrected to **Positron** (the mandated muted basemap); and `lat`/`lng` were missing from the client `Venue` payload — added to the type, all fixtures, and the detail-page row mapper so map and list share one payload.

Verification: TypeScript, ESLint, Prettier, 32 Vitest tests, production build (map code-split out of first load), and 4 Chromium Playwright flows (now asserting the live map renders). Deps added: `maplibre-gl@^5`, `framer-motion`, `gsap`.

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
