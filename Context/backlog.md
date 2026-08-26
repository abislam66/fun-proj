# Backlog

> Deliberately skipped or deferred items — each with the trigger that should bring it back.
> Not a roadmap: planned work lives in `Specs/features.md`. This is the "we said later" list.

| Item | Context / why deferred | Revisit when |
|------|------------------------|--------------|
| **Adoption measurement** | The overview's goal (200+ unique weekly visitors) has **no measurement mechanism specced** — v1 ships with no analytics, and the privacy disclosure promises none without updating it first. | Before public launch (end of features Phase 2) — pick a privacy-friendly, first-party option and update `auth-security.md` disclosure. |
| Venue content enrichment | 69 KML-seeded venues have name + coordinates only — no hours, cuisine, or zone (the source has no such data). Now fixable via the real `/admin` editor (see `Context/decisions.md`). | Whenever there's time to sit with `/admin` and enrich venues one at a time. |
| Chain-restaurant type reclassification | ~15-20 seeded entries (Chick-fil-A, 7-Eleven, etc.) are stored as `type: "truck"` because `seed-kml.ts` hardcodes it — harmless until `type` is surfaced in the UI. | Before Phase 3 (restaurants/cafes join) or whenever `type` starts mattering in the public UI. |
| Explorer map and cuisine pins | Shipped in Phase 1 frontend (MapLibre + cuisine pills + locate/attribution). | Revisit only if tile provider swaps or pin density needs a symbol-layer migration. |
| Maputnik Positron fork | Stock Positron still fine under curated buildings; a hosted style fork would align land/water/roads to Cherry Compass tokens and strip leftover clutter. | After building overlay settles, if the basemap still feels generically Philly. |
| Per-building hero tints / hover | User asked for uniform academic stone on every footprint (2026-08-23); category palettes are unused for paint. Individual landmark overrides and `feature-state` hover remain optional polish only if they ask. | Only if they explicitly want Charles / Student Center / Bell Tower to stand out again. |
| Custom domain | Running on `tueats.vercel.app`; a domain is the only potential new spend. | At public launch, if the project has traction worth branding. |
| Owner-claimed listings | Venue owners correcting data / replying to reviews — deferred to keep verification + moderation burden near zero. | A real venue owner actually asks. |
| Menu photos on venue pages | Full menu CMS rejected (stale-data trap); cuisine tags + description chosen instead. | Post-launch feedback shows "what do they serve?" is still unanswered. |
| Real price-range data for venues | Mini-card shows a hardcoded `$12` placeholder (`PLACEHOLDER_PRICE_RANGE`, venue-map.tsx) per user instruction (2026-08-25). No schema field, admin input, or per-venue values exist. | When actual price info should show — needs a schema column + admin editor field, or at minimum a frontend per-venue config like venue-photos. |
| Venue photo storage + upload backend | Photo display shipped frontend-only (2026-08-25): files in `public/photos/<slug>/` + `config/venue-photos.ts` registry, per user decision. A real backend (storage bucket, schema, admin upload action, RLS) is a spec change — `auth-security.md` bans the service-role key everywhere. | Photos need to come from admins (not repo commits), or more than a handful of venues have photos. |
| Push notifications / PWA install | Needs notification infra + installed-app retention to matter. | Evidence of repeat weekly users returning organically. |
| Distance-sorted "near me" list | Campus is ~half a mile wide; the map's locate control covers v1. Sorting the list by walking distance is extra geolocation plumbing. | User feedback asks for it (likely alongside Phase 3 venue growth). |
| Member/student accounts (ratings, reviews, proposals) | V1 ships with no student accounts at all — anonymous public + a single password-auth admin only. Verified `@temple.edu` email-OTP student accounts are speced as a future phase in `Specs/auth-security.md`, not implemented. | Phase 2 kickoff (see `Specs/features.md`). |
| OTP-friction auth fallback | If the future member email-OTP flow feels slow on campus Wi-Fi, a hosted-domain-restricted Google OAuth could supplement — **spec change required** (`auth-security.md` currently bans social logins). | Signup funnel shows real drop-off between OTP request and completion, once the member phase ships. |
| Denormalized rating aggregates | Aggregates computed at query time (AVG/COUNT) — fine at campus scale by design. | Measured query slowness, not speculation. |
| Supabase CLI local stack (Docker) | Cloud `tueats-dev` chosen for zero moving parts; CLI stack would allow offline dev. | Offline development becomes a real need. |
| AI features | Not really backlog — governed by the four-condition activation gate in `Specs/llm-integration.md` (includes a budget amendment). | All four gate conditions met. |
