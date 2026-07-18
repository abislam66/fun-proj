# Backlog

> Deliberately skipped or deferred items — each with the trigger that should bring it back.
> Not a roadmap: planned work lives in `Specs/features.md`. This is the "we said later" list.

| Item | Context / why deferred | Revisit when |
|------|------------------------|--------------|
| **Adoption measurement** | The overview's goal (200+ unique weekly visitors) has **no measurement mechanism specced** — v1 ships with no analytics, and the privacy disclosure promises none without updating it first. | Before public launch (end of features Phase 2) — pick a privacy-friendly, first-party option and update `auth-security.md` disclosure. |
| Production UI wiring | Phase 1 public/admin screens currently use typed browser mocks so the complete frontend could be reviewed before Supabase setup; server-side Drizzle queries, actions, and auth boundaries already exist separately. | Before the Phase 1 soft launch — replace mock adapters with the real read/write/auth paths and remove mock-session/browser-storage behavior. |
| ~~Explorer map and cuisine pins~~ | **Done 2026-07-18** — MapLibre map, cuisine-pill pins, locate control, and attribution implemented in `src/components/map/`. | — |
| Campus bounds reconciliation | `CAMPUS_BOUNDS` (Zod validation) is ~10× tighter than the `venues` DB CHECK box, and `seed-kml.ts` inserts drafts without running Zod — a legit truck can pass the seed but fail an admin edit. | Before running the real KML seed / first admin edits of seeded venues. |
| Map coordinate dedup vs. gyro trucks | `seed-kml.ts` skips inserts within ~15m (`COORD_EPSILON`); two distinct trucks parked close could be wrongly merged, conflicting with "near-duplicate names stay distinct venues". | When seeding real placemarks (verify against the five gyro trucks). |
| Custom domain | Running on `tueats.vercel.app`; a domain is the only potential new spend. | At public launch, if the project has traction worth branding. |
| Owner-claimed listings | Venue owners correcting data / replying to reviews — deferred to keep verification + moderation burden near zero. | A real venue owner actually asks. |
| Menu photos on venue pages | Full menu CMS rejected (stale-data trap); cuisine tags + description chosen instead. | Post-launch feedback shows "what do they serve?" is still unanswered. |
| Push notifications / PWA install | Needs notification infra + installed-app retention to matter. | Evidence of repeat weekly users returning organically. |
| Distance-sorted "near me" list | Campus is ~half a mile wide; the map's locate control covers v1. Sorting the list by walking distance is extra geolocation plumbing. | User feedback asks for it (likely alongside Phase 3 venue growth). |
| OTP-friction auth fallback | If email OTP feels slow on campus Wi-Fi, a hosted-domain-restricted Google OAuth could supplement — **spec change required** (`auth-security.md` currently bans social logins). | Signup funnel shows real drop-off between OTP request and completion. |
| Denormalized rating aggregates | Aggregates computed at query time (AVG/COUNT) — fine at campus scale by design. | Measured query slowness, not speculation. |
| Supabase CLI local stack (Docker) | Cloud `tueats-dev` chosen for zero moving parts; CLI stack would allow offline dev. | Offline development becomes a real need. |
| AI features | Not really backlog — governed by the four-condition activation gate in `Specs/llm-integration.md` (includes a budget amendment). | All four gate conditions met. |
