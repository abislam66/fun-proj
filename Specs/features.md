# Features

> **OpenOwls SDD** — Read by end users and the product owner.
> Defines what the application does, written in plain language.
> Organized into three phases. Phase 1 is the MVP — it must be achievable in the first sprint.

---

## How to Read This File

- **Phase 1** — Must-have features. The app is not usable without these.
- **Phase 2** — Should-have features. Adds meaningful value once Phase 1 is stable.
- **Phase 3** — Nice-to-have features. Advanced capabilities, AI enhancements, or stretch goals.

Each feature includes a short description and a set of acceptance criteria written from the user's perspective.

**Phase mapping note.** These feature phases map onto `overview.md`'s milestones as: Phase 1 = milestone ① (truck directory), Phase 2 = milestone ② (accounts, ratings/reviews/proposals — plus Google rating snapshots, which are routine curation rather than an integration), Phase 3 = milestone ③ (new venue types) plus the project's AI candidates. Phase 1 is a *soft-launchable* slice for early feedback; the publicly promoted "v1 launch" includes Phase 2. Everything is venue-generic under the hood (`/eat/[slug]`, `venue.type`) even where these stories say "truck."

---

## Phase 1 — Core MVP

### Feature 1: Interactive campus map
**As a** hungry student on campus,
**I want to** see every food truck as a pin on a map of campus,
**So that** I can spot what's around me at a glance.

**Acceptance Criteria:**
- [ ] Given I open the site, when the map loads, then it is centered on the campus bounding box (not Philadelphia) and is interactive in under 2 seconds on a mid-range phone.
- [ ] Given active trucks exist, when I view the map, then each one appears as a pin, and pins in dense corridors (Norris St, Montgomery Ave) remain individually tappable at street-level zoom.
- [ ] Given I tap a pin, when the mini-card appears, then it shows name, cuisine tags, and open status, and tapping it navigates to the venue detail page.
- [ ] Given I allow browser location, when I tap the locate control, then my position appears on the map; given I decline, the map works identically without it.
- [ ] Given the map renders, then required OpenStreetMap/OpenFreeMap attribution is visible.

---

### Feature 2: List view with search and filters
**As a** student who prefers scanning to panning,
**I want to** browse all trucks as a searchable, filterable list,
**So that** I can decide where to eat without using the map.

**Acceptance Criteria:**
- [ ] Given the list view, when it renders, then each row shows name, cuisine tags, campus zone, open-status badge, and payment icons (cash / card).
- [ ] Given I type in the search box, when text matches a truck name or cuisine, then the list narrows as I type.
- [ ] Given filters for open-now, cuisine, zone, and payment, when I combine them, then results satisfy all selected filters, and an empty result shows a friendly empty state (not a blank page).
- [ ] Given I switch between map and list, when I toggle, then active filters and search persist across both views.
- [ ] Given I apply filters, when I share the URL, then the recipient sees the same filtered view.

---

### Feature 3: Venue detail page
**As a** student deciding whether a truck is worth the walk,
**I want to** open a page with everything known about it,
**So that** I can commit before I start walking.

**Acceptance Criteria:**
- [ ] Given any venue, when I open `/eat/[slug]`, then I see its name, cuisine tags, description, location, campus zone, hours, payment methods, and last-verified date.
- [ ] Given a field is unknown (no hours, no description), when the page renders, then that section degrades gracefully ("Hours unknown") — never fake or default data.
- [ ] Given the page URL, when shared, then it loads directly (server-rendered, link-preview friendly).
- [ ] Given I navigate back, when I return to map or list, then my previous view state (filters, position) is preserved.

---

### Feature 4: Open-now status
**As a** student with 15 minutes between classes,
**I want to** see which trucks are open right now,
**So that** I don't walk to a closed window.

**Acceptance Criteria:**
- [ ] Given a venue with posted hours, when the current campus time (America/New_York) falls inside them, then it shows "Open · usually until {close}"; outside them, "Closed · opens {next open}".
- [ ] Given a venue without posted hours, when its status renders, then it shows "Hours unknown" — never "Closed".
- [ ] Given the soft nature of truck hours, when status is displayed anywhere, then the phrasing stays hedged ("usually") — the UI never promises a truck is open.
- [ ] Given the open-now filter, when applied, then "Hours unknown" venues are excluded from "open" but visibly counted ("+6 with unknown hours").

---

### Feature 5: Admin venue management
**As the** administrator,
**I want to** sign in and create, edit, verify, and retire venues,
**So that** the data stays accurate without code changes or redeploys.

**Acceptance Criteria:**
- [ ] Given I am the admin, when I sign in, then I can create/edit any venue field, set its location by dragging a pin, and manage hours, zone, cuisine, and payment flags.
- [ ] Given I am not an admin, when I try any admin route or mutation, then I am denied (this is the only authentication in Phase 1 — no public signup yet).
- [ ] Given I edit a venue, when I save, then the public site reflects it within one minute.
- [ ] Given I retire a venue, when saved, then it disappears from map/list but its URL stays live marked "Closed", preserving future reviews/ratings.
- [ ] Given I verify a venue's details on campus, when I mark it verified, then its last-verified date updates and is publicly visible.

---

### Feature 6: Seed data import
**As the** administrator,
**I want to** seed the truck database using all available sources (Temple's public My Map, Google Maps, and on-foot verification),
**So that** the site launches with the most accurate and complete initial roster.

**Acceptance Criteria:**
- [ ] Given Temple's My Map data is known to be stale, when seeding venues, then I also check and supplement details via Google Maps and manual on-campus walks.
- [ ] Given each candidate venue, when importing, then I create a draft venue (`type=truck`) with whatever name, coordinates, and description I can verify.
- [ ] Given drafts exist, when I review one in the admin, then I can enrich missing details (hours, payment, cuisine tags, zone), then publish it; drafts are never publicly visible.
- [ ] Given the importer runs more than once from any source, when duplicates would occur, then existing venues are matched (not duplicated) — including the five near-identical gyro truck names, which must remain distinct venues.
- [ ] Given name or location collisions, when slugs are generated, then each gets a unique and stable slug (`famous-ny-gyro`, `new-york-gyro`, …).

---

### Feature 7: Report a problem
**As a** visitor who spots wrong data,
**I want to** report it from the venue page without an account,
**So that** the site stays trustworthy.

**Acceptance Criteria:**
- [ ] Given any venue page, when I tap "Report a problem", then I can flag closed / moved / wrong hours / other with an optional note — no login required.
- [ ] Given a submitted report, when it arrives, then the admin sees it (queue or notification) supporting the 48-hour correction goal.
- [ ] Given the form, when abused, then basic protections apply (rate limit per IP, honeypot) without adding friction for honest reporters.

---

## Phase 2 — Enhanced Features

### Feature 8: Campus account signup
**As a** member of the Temple community,
**I want to** create an account with Google,
**So that** I can rate, review, and manage my profile.

**Acceptance Criteria:**
- [ ] Given signup, when I sign in with Google, then my account activates with an auto-generated unique display name and unique username.
- [ ] Given my account, when I open `/account`, then I can change my display name, username, and class year (the year I graduated or will graduate). Email is never shown.
- [ ] Given I am signed out or have no account, when I browse the map/search/filters, then those read surfaces work identically — auth gates venue detail pages and writing.
- [ ] Given my account, when I want out, then I can delete it, removing my PII while my reviews are either deleted with it or anonymized (my choice at deletion). *(Self-service deletion UI is still later; contact via `/about` until then.)*

---

### Feature 9: Rate a venue
**As a** signed-in student,
**I want to** leave a 1–5 star rating on a truck,
**So that** my experience guides other students.

**Acceptance Criteria:**
- [ ] Given a venue page, when I tap a star value, then my rating saves instantly and the aggregate ("4.6 ★ · 212 ratings") updates.
- [ ] Given I already rated a venue, when I rate again, then my rating is updated (one per user per venue), and I can remove it entirely.
- [ ] Given aggregates, when displayed on cards, lists, and detail pages, then the student rating is labeled as such and never merged with the Google rating.
- [ ] Given I am signed in, when I open `/account`, then I see every rating and review I have submitted (including star-only and ones later removed for policy) and can jump to the venue to edit or delete from this page — a private self-view, not a public profile.

---

### Feature 10: Write a review
**As a** signed-in student,
**I want to** write a short text review with my rating,
**So that** I can tell others what to order or avoid.

**Acceptance Criteria:**
- [ ] Given a venue page, when I write a review, then it requires a star rating, has a reasonable length cap, and shows the content policy at the composer.
- [ ] Given my review is posted, when others view the venue, then they see it newest-first with my display name and relative date.
- [ ] Given my own review, when I want to change it, then I can edit or delete it.
- [ ] Given rate limits (tunable: e.g., 5 reviews/day per user), when I exceed them, then I'm blocked with a clear message.

---

### Feature 11: Report content and moderate
**As a** user (and as the admin),
**I want to** report an inappropriate review, and have reports resolved,
**So that** reviews stay fair to real business owners.

**Acceptance Criteria:**
- [ ] Given any review, when I tap report, then I pick a reason and the review enters the moderation queue; multiple reports don't duplicate queue entries.
- [ ] Given the queue, when the admin resolves an item, then they can dismiss the report or remove the review, and the reporter's/author's histories are visible for context.
- [ ] Given repeat violations, when the admin applies a strike, then a struck user loses write access (reads unaffected).
- [ ] Given a removed review, when its author looks, then they see it was removed for a policy reason.

---

### Feature 12: Propose a new venue
**As a** signed-in student who found an unlisted truck,
**I want to** submit it with its location and details,
**So that** the directory stays complete without waiting for the admin to find it.

**Acceptance Criteria:**
- [ ] Given the proposal form, when I submit name, type, location (dropped pin), and optional details, then it enters the approval queue and is **never publicly visible before approval**.
- [ ] Given my proposal, when the admin approves (possibly after editing) or rejects it, then I can see its status.
- [ ] Given proposal volume, when I submit repeatedly, then per-user rate limits apply.

---

### Feature 13: Google rating snapshots alongside student ratings
**As a** student comparing options,
**I want to** see a venue's most recent known Google rating next to its student rating,
**So that** I get an outside reference point without leaving the site.

**Acceptance Criteria:**
- [ ] Given the admin has captured a snapshot (star rating + review count, read by a human from the venue's public Google listing), when the venue page renders, then it shows "4.3 ★ on Google · 212 reviews" with a visible "as of {Month Year}" capture date, clearly separated from and secondary to the student rating.
- [ ] Given a venue with no snapshot (most trucks, all vending machines), when the page renders, then the Google section is simply absent — never "0 stars".
- [ ] Given snapshots are numbers-only, when one is captured, then no Google review text is ever copied into the site — the average is a fact; the words belong to their authors.
- [ ] Given staleness, when a snapshot is older than 12 months, then it is hidden until re-captured; snapshots are re-checked as part of each semester's data-verification sweep.
- [ ] Given capture, when snapshots enter the system, then it is by a human through the admin UI — no automated collection from Google properties, ever.

---

### Feature 14: Semester-aware presence
**As a** student on campus during break,
**I want to** know that the truck roster shrinks outside semesters,
**So that** I don't trust in-semester data in July.

**Acceptance Criteria:**
- [ ] Given the semester calendar config, when the current date falls in a break, then a site-wide notice explains many trucks may be away.
- [ ] Given a venue marked "semester-only", when viewed during break, then its open-status shows "Away for break (usually)" instead of regular hours.
- [ ] Given a new academic year, when dates change, then updating one config file is the only change required.

---

## Phase 3 — Advanced / AI Features

### Feature 15: Restaurants and cafes join the directory
**As a** student tired of trucks today,
**I want to** see local restaurants and cafes on the same map and list,
**So that** TuEats becomes the one place to decide where to eat off the meal plan.

**Acceptance Criteria:**
- [ ] Given the venue-generic model, when restaurants/cafes are added, then no schema migration, URL change, or component rewrite is required (the "platform-ready" goal cashes out here).
- [ ] Given multiple venue types, when I browse, then type filters (trucks / restaurants / cafes) work on both map and list, and type is visually distinguishable on pins and cards.
- [ ] Given published guides (e.g., Philadelphia Magazine's campus dining list) and campus walks, when seeding restaurants/cafes, then candidates are entered as drafts and reviewed in the admin before publishing — same lifecycle as trucks.
- [ ] Given all community features, when applied to new types, then ratings, reviews, reports, and proposals work identically.

---

### Feature 16: Vending machine directory
**As a** student in a building at 11 p.m.,
**I want to** find vending machines by building and floor,
**So that** I know my options when everything else is closed.

**Acceptance Criteria:**
- [ ] Given vending venues, when listed, then they show building + floor (indoor location) as the primary locator, with the map pin secondary.
- [ ] Given a building, when I browse it, then I can see all machines in it grouped together.
- [ ] Given vending's nature, when a vending page renders, then hours and Google sections are absent by design, and open-status defers to building access.

---

### Feature 17: AI assistance (candidates — gated on `llm-integration.md`)
**As a** student who can't decide,
**I want to** ask "what should I eat?" and get a suggestion from what's open near me,
**So that** deciding takes seconds.

**Acceptance Criteria (indicative, not committed):**
- [ ] Given AI features are approved for the project's Phase 2, when a recommendation is requested, then it only draws on venue/ratings data from the site (open-now aware), with clear AI labeling.
- [ ] Given many reviews on a venue, when summarization ships, then a "students say…" digest appears with a disclosure that it's AI-generated from student reviews.
- [ ] Given no AI approval yet, when Phase 1–2 ship, then zero LLM calls exist anywhere in the product.

---

### Feature 18: Recognition badges
**As a** curious student,
**I want to** see badges like LUNCHIES awards on venue pages,
**So that** campus institutions get their flowers.

**Acceptance Criteria:**
- [ ] Given a venue with a recorded award (e.g., The Temple News LUNCHIES), when its page renders, then a badge shows the award and year, with a source link.
- [ ] Given badges, when displayed, then they are admin-curated data, not user-submittable.

---

## Out of Scope

- **Ordering, payments, or delivery** — TuEats points, it doesn't transact.
- **Meal-plan dining** (dining halls, meal-swipe venues) — permanently out; it defines the category boundary.
- **Social graph** — no public profiles, no followers, feeds, or DMs. (The private `/account` page in Features 8–9 is account management: name, username, class year, and the member's own ratings/reviews. Nobody else can open it. Profile photos are out of this slice.)
- **Real-time truck GPS tracking** — locations are curated; Temple trucks are stationary all day anyway.
- **Native iOS/Android apps** — responsive web only.
- **Automated scraping of any source** — the Google reference rating is a hand-captured, numbers-only snapshot; nothing automated ever touches Google.
- **Owner-claimed listings / venue-owner accounts** — considered for correcting data and replying to reviews; deferred indefinitely to keep moderation and verification burden near zero. Revisit only if owners actually ask.
- **Full menu management with prices** — a per-venue menu CMS is heavy and goes stale instantly; cuisine tags + description + (maybe someday) a menu photo cover the decision-making need.
- **Push notifications** ("your favorite truck is open") — requires PWA installation + notification infra; revisit after there's evidence of retention.
- **Geographic expansion beyond Temple's campus** — the category grows over time; the geography doesn't.
