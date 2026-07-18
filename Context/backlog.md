# Backlog

> Deliberately skipped or deferred items — each with the trigger that should bring it back.
> Not a roadmap: planned work lives in `Specs/features.md`. This is the "we said later" list.

| Item | Context / why deferred | Revisit when |
|------|------------------------|--------------|
| **Adoption measurement** | The overview's goal (200+ unique weekly visitors) has **no measurement mechanism specced** — v1 ships with no analytics, and the privacy disclosure promises none without updating it first. | Before public launch (end of features Phase 2) — pick a privacy-friendly, first-party option and update `auth-security.md` disclosure. |
| Production UI wiring | Phase 1 public/admin screens currently use typed browser mocks so the complete frontend could be reviewed before Supabase setup; server-side Drizzle queries, actions, and auth boundaries already exist separately. | Before the Phase 1 soft launch — replace mock adapters with the real read/write/auth paths and remove mock-session/browser-storage behavior. |
| ~~Explorer map and cuisine pins~~ | **Done 2026-07-18** — MapLibre map, cuisine-pill pins, locate control, and attribution implemented in `src/components/map/`. | Revisit only if tile provider swaps or pin density needs a symbol-layer migration. |
| ~~Campus bounds reconciliation~~ | **Done 2026-07-18** — `CAMPUS_COORDINATE_BOUNDS` added (mirrors DB CHECK) and used by Zod + mock-admin validation; seed parses with the same guard. | — |
| ~~Map coordinate dedup vs. gyro trucks~~ | **Done 2026-07-18** — seed dedup epsilon tightened to ~5m with a ~25m review warning; logic extracted to `src/lib/seed/kml.ts` and unit-tested against the gyro scenario. | Confirm behaviour against the real export when the seed is first run. |
| Custom domain | Running on `tueats.vercel.app`; a domain is the only potential new spend. | At public launch, if the project has traction worth branding. |
| Owner-claimed listings | Venue owners correcting data / replying to reviews — deferred to keep verification + moderation burden near zero. | A real venue owner actually asks. |
| Menu photos on venue pages | Full menu CMS rejected (stale-data trap); cuisine tags + description chosen instead. | Post-launch feedback shows "what do they serve?" is still unanswered. |
| Push notifications / PWA install | Needs notification infra + installed-app retention to matter. | Evidence of repeat weekly users returning organically. |
| Distance-sorted "near me" list | Campus is ~half a mile wide; the map's locate control covers v1. Sorting the list by walking distance is extra geolocation plumbing. | User feedback asks for it (likely alongside Phase 3 venue growth). |
| OTP-friction auth fallback | If email OTP feels slow on campus Wi-Fi, a hosted-domain-restricted Google OAuth could supplement — **spec change required** (`auth-security.md` currently bans social logins). | Signup funnel shows real drop-off between OTP request and completion. |
| Denormalized rating aggregates | Aggregates computed at query time (AVG/COUNT) — fine at campus scale by design. | Measured query slowness, not speculation. |
| Supabase CLI local stack (Docker) | Cloud `tueats-dev` chosen for zero moving parts; CLI stack would allow offline dev. | Offline development becomes a real need. |
| AI features | Not really backlog — governed by the four-condition activation gate in `Specs/llm-integration.md` (includes a budget amendment). | All four gate conditions met. |
