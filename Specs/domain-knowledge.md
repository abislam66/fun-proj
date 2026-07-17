# Domain Knowledge

> **OpenOwls SDD** — Read primarily by the AI coding assistant.
> Captures domain-specific concepts, terminology, business rules, and constraints
> that are not obvious from the code itself. Faculty seeds this file; students expand it.

---

## Domain Overview

TuEats operates in **campus food discovery** at Temple University's main campus in North Philadelphia. The domain covers every way to eat *off the meal plan*: food trucks (v1), local restaurants, cafes, and building vending machines (later phases). Food trucks are the culturally distinctive anchor — 40+ trucks have defined Temple's food culture since the 1960s, clustering along designated streets under Philadelphia's vending regulations. On top of the venue directory sits a community layer: ratings and reviews from verified campus users, displayed alongside (never merged with) manually captured Google rating snapshots where listings exist.

---

## Key Concepts & Terminology

| Term | Definition |
|------|------------|
| **Venue** | The core entity: any non-meal-plan food source. Never called "truck" in schema, routes, or components — `truck` is one value of `venue.type`. |
| **Venue type** | Discriminator: `truck` (v1), `restaurant`, `cafe`, `vending` (later). Each type has a small set of type-specific fields on top of the shared core. |
| **Food truck** | A stationary vendor — Temple trucks park in a fixed spot all day (they are *not* roaming; this is confirmed by the university itself). Identity = the business, not the parking spot: a truck that moves is the same venue with an updated location. |
| **Vending District** | Philadelphia's *Street and Sidewalk Vending District* (with the Dept. of Licenses & Inspections) constrains where trucks may park — e.g., carts were consolidated to 13th & Norris and 13th & Montgomery. Why truck locations are stable and zone-shaped. |
| **Campus zone** | A curated, human-named cluster used for filtering and orientation. Observed in the July 2026 seed data: **Norris St corridor** (12th–13th, ~lat 39.983), **Montgomery Ave corridor** (12th–13th, ~lat 39.980), **12th St spur** (between the two), plus outliers near 11th St. Zones are curated data, not computed clusters. |
| **Meal plan / dining plan** | Temple's dining program. The scope boundary: anything covered by it (dining halls, meal-swipe venues) is permanently out of scope. |
| **Verified campus user** | An account with a verified `@temple.edu` email (students, faculty, and staff all qualify — "campus community," not strictly students). Required for all writes; never for browsing. |
| **Student rating** | TuEats' own 1–5 star aggregate from verified campus users. Always displayed as distinct from the Google rating. |
| **Google rating snapshot** | A manually captured, point-in-time record of a venue's public Google star rating + review count — numbers only, stored with its capture date, always displayed as "on Google · as of {date}", auto-hidden after 12 months. Many trucks have no listing; vending machines never do. |
| **Venue proposal** | A user-submitted new venue. Lives in the approval queue, invisible to the public until an admin approves it. |
| **Approval queue** | Admin moderation inbox for venue proposals and reported reviews. |
| **Indoor location** | Building + floor (e.g., "Anderson Hall, 2nd floor") for vending machines, where a map pin alone is useless. Optional field on the shared venue model. |
| **Open now** | Best-effort status computed from posted hours + the semester calendar. Never a guarantee — trucks sell out and leave early, skip bad-weather days. |
| **Semester rhythm** | The campus pulse that governs truck presence: full roster during fall/spring semesters, sharply reduced during winter/summer breaks and finals. |
| **Last-verified date** | Per-venue timestamp of the most recent human confirmation of its data. Drives staleness display and curation priorities. |
| **LUNCHIES** | The Temple News' annual student-voted lunch/food-truck awards. Cultural touchstone; a future "award badge" data point for venues. |
| **Slug** | Stable, human-readable URL identifier for a venue (`/eat/richies-lunch-box`). Never changes once published; never derived solely from the name (see pitfalls). |

---

## Business Rules

- **Scope rule:** a venue belongs on TuEats iff it sells food/drink near main campus *and* is not part of Temple's meal plan.
- **Browsing is always public.** No content is login-walled. Auth (verified `@temple.edu`) gates writes only: ratings, reviews, venue proposals.
- **One rating per user per venue** — editable and deletable, never duplicable. A review always carries a star rating; a rating may exist without review text.
- **Every mutation goes through the server write path** (validate → rate-limit → write). No client-direct DB access, ever — even if the DB host (e.g., Supabase) would allow it.
- **Student ratings and Google ratings are never merged, averaged, or visually conflated.** Two separately labeled numbers.
- **Venue proposals are never public before admin approval.** Admin edits to live venues take effect immediately.
- **Venues are retired, not deleted.** Retirement hides a venue from map/list but preserves its reviews, ratings, and URL (shown as "closed"). Hard deletion is reserved for spam/mistakes with no community content.
- **Review content policy:** reviews address food, service, price, and experience. No personal attacks on individuals, no doxxing, no discrimination. Report → admin review → removal; repeat offenders lose write access.
- **Minimal PII:** store verified email + chosen display name, nothing more. Emails are never displayed or exposed via any API response.
- **Google snapshot integrity:** snapshots are captured by a human in the admin UI (never automated), contain numbers only (no copied review text — reviews belong to their authors), always render with source label and capture date, and auto-hide after 12 months without re-verification.
- **Rate limits on all user writes** (per-user, per-day caps on reviews, ratings changes, and proposals) to keep drive-by abuse out.

---

## Domain Constraints

- **Truck data has no machine-readable source of truth.** The university's Google My Map is unofficial, sparse (name + point + one-line blurb — no hours, no payment info), and of unknown freshness. Everything else comes from walking the campus. Staleness is the natural state; design for it (last-verified dates, easy correction flow).
- **Hours are soft.** Trucks open/close around demand, weather, and sell-outs; many have no posted hours at all. "Open now" must degrade gracefully to "hours unknown."
- **Seasonality is structural.** A large fraction of trucks disappear during breaks. The semester calendar (changes every year — config, never hardcoded) modulates the whole dataset.
- **Payment is heterogeneous.** Cash-only trucks are common enough that the payment flag is core data, not metadata.
- **Sparse online presence is normal.** Assume a venue has no website, no phone, no Google listing unless proven otherwise. Only name, type, and location are required fields.
- **Vending machines invert the model:** no hours of their own (building access governs), no reviews expected, no Google presence possible, and indoor location (building/floor) matters more than the map pin.
- **Campus geography is compact.** Observed venue spread: lng −75.157…−75.150, lat 39.979…39.984 (~half a mile). Default map viewport is the campus bounding box, not Philadelphia. Everything is walkable; distance sorting is a convenience, not a necessity.
- **Timezone is America/New_York.** Store opening hours as local wall-clock times + weekday, never as UTC instants (DST would silently shift them twice a year).
- **Free-tier ceilings shape design:** no paid APIs anywhere; if a scheduled job is ever needed, Vercel Hobby cron fires at most daily.

---

## Common Pitfalls

- **Naming anything truck-specific.** The moment a table, route, or component says "truck," the restaurant/cafe/vending expansion becomes a migration. `truck` is data, not structure.
- **Near-duplicate names are distinct businesses.** The real seed data contains *Famous NY Gyro*, *New York Gyro*, *Halal Gyro Express*, *Philly Halal Gyro*, and *Philly Fellas Gyro Halal* — five different trucks. Also two fruit-salad trucks. Never dedupe by name similarity; never derive slugs from name alone without collision handling.
- **Merging student and Google ratings** into one number. They answer different questions from different populations and are contractually required to stay distinct.
- **Treating posted hours as ground truth.** "Open now" is an inference; present it with appropriate softness ("usually open until 3").
- **Assuming every venue has a Google listing** (or website, or phone). Most trucks don't; the UI and schema must treat all external data as optional.
- **Showing a Google snapshot without its age.** A hand-captured rating is honest only with its "as of" date attached — hiding the date turns accepted staleness into silent misinformation. And copying review *text* is never OK: the average is a fact, the words are the reviewers'.
- **Hardcoding semester dates** or inferring them; they change yearly and drive seasonality logic.
- **Storing hours in UTC.** DST breaks them. Local wall-clock + timezone.
- **Deleting venues.** Deletion destroys community content and URLs; retirement is the domain's lifecycle end-state.
- **Trusting the KML seed as complete or current.** It's a bootstrap (~40 trucks as of July 2026), not a census — every seeded venue starts unverified until confirmed on campus.
- **Designing desktop-first.** The defining user is on a phone, on a sidewalk, hungry, with one thumb.

---

## External Dependencies & Integrations

| Service | Purpose | Notes |
|---------|---------|-------|
| Temple's Google My Map (KML export) | One-time seed of truck names, coordinates, and cuisine blurbs | Viewer: `google.com/maps/d/viewer?mid=1kFf5IaeeXiFpn_UHIyd4UqwHj90` · KML: same host, `/maps/d/kml?mid=…&forcekml=1`. **Verified working July 2026, ~40 placemarks.** Unofficial; data starts unverified. |
| Google Maps listings (manual reference) | Human-read source for per-venue rating snapshots; later, a cross-check when seeding restaurants/cafes | No API, no key, no automation — the admin reads the public listing and records rating + count + capture date in the admin UI. Re-checked each semester sweep. |
| OpenFreeMap | Vector map tiles for MapLibre GL | No key, no billing, community-run (no SLA) — tile source must stay swappable behind one config value. |
| Supabase (Postgres + Auth) | System of record: venues, users, ratings, reviews, queues, manual Google rating snapshots; campus-restricted auth | Decided in `architecture-planning.md`. Data access is server-only via Drizzle; the PostgREST surface is denied by RLS. |
| Resend | SMTP for auth verification emails | Free tier. Configured inside Supabase (Auth → SMTP) — the app holds no email credentials. Needed because Supabase's built-in sender allows only a handful of emails/hour. |
| Vercel | Hosting, CI/CD, cron | Hobby tier: cron at most daily (no scheduled jobs currently required). |
| Temple academic calendar | Semester start/end dates driving truck seasonality | Public web page; maintained by hand as config each semester. |

---

## References

- [Temple Food Trucks — official page](https://www.temple.edu/life-temple/housing-dining/temple-food-trucks) — the page TuEats improves upon; source of the My Maps embed
- [Temple University Food Trucks — Google My Map](https://www.google.com/maps/d/viewer?mid=1kFf5IaeeXiFpn_UHIyd4UqwHj90) — seed data source (KML export verified)
- [Your guide to Temple's diverse and delicious food trucks — Temple Now](https://now.temple.edu/news/2016-08-31/your-guide-temples-diverse-delicious-food-trucks) — history + vending district relocation context (13th & Norris, 13th & Montgomery)
- [Lunch Trucks Map — The Temple News](https://temple-news.com/lunch-trucks-map/) — student-paper coverage of the truck landscape
- [LUNCHIES — The Temple News](https://temple-news.com/lunchies-2026/) — annual student-voted food truck awards (future badge data)
- [Where to Eat Around Temple's Campus — Philadelphia Magazine](https://www.phillymag.com/foobooz/restaurants-food-trucks-temple-university/) — seed candidate list for the restaurant/cafe expansion
- [MapLibre GL JS docs](https://maplibre.org/maplibre-gl-js/docs/) · [OpenFreeMap](https://openfreemap.org/) — map stack documentation
