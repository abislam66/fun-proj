# Overview

> **OpenOwls SDD** — Read by the business sponsor and the full team.
> Describes the project at a high level: what it is, why it exists, who it is for, and what technology it uses.

---

## Project Name

**TuEats**

An unofficial, community-built guide to eating off the meal plan around Temple University's main campus — every food truck, and over time every local restaurant, cafe, and vending machine. Launches with food trucks. The name nods to "TU" without using the university's trademarked name or marks.

## One-Line Description

A fast, mobile-first website that puts every non-dining-plan food option around campus on an interactive map paired with a searchable, filterable list — enriched with student ratings and reviews — aiming to be the one-stop shop for answering "where should I eat?" **V1 launches with food trucks;** restaurants, cafes, and vending machines follow.

---

## Problem Statement

Deciding where to eat off the meal plan at Temple means stitching together scattered, incomplete sources. Food trucks — a defining part of campus food culture since the 1960s — are the worst served: the university's only directory is a prose page wrapping an embedded Google My Map that loads zoomed out to half of southeastern Pennsylvania, with no list view, no hours, no cuisine info, and no usable mobile experience. Local restaurants and cafes live on Google/Yelp with no campus-scoped view. Vending machines — the 11 p.m. option — aren't documented anywhere at all.

There is no single place where someone standing on campus can see everything nearby, what's open, what it serves, and what fellow students think of it. TuEats fills that gap with a purpose-built map + list experience backed by curated venue data and verified-student ratings and reviews — starting with food trucks, the most underserved and most campus-distinctive category.

---

## Goals

- **Coverage (v1: trucks)** — ≥90% of active main-campus food trucks listed at launch, each with a verified location, hours, and cuisine tags.
- **Platform-ready** — the data model, URLs, and UI are venue-generic from day one: adding a new venue type (restaurant, cafe, vending machine) requires no schema migration, no URL breakage, and no component rewrite.
- **Speed** — map and list are interactive in under 2 seconds on a mid-range phone over campus LTE; Lighthouse mobile performance score ≥90.
- **Findability** — a visitor can get from landing to a specific venue's details in ≤2 taps, via map pin or list search/filter.
- **Community from v1** — authenticated users can rate venues, write reviews, and propose new venues (pending admin approval); all user CRUD is implemented from the start. Target: ≥50% of listed trucks have at least 5 student ratings by the end of the Fall 2026 semester.
- **Freshness** — reported corrections (venue closed, hours changed, truck moved) are live within 48 hours through the admin flow.
- **Adoption** — 200+ unique weekly visitors by the end of the Fall 2026 semester.

## Non-Goals

- **No meal-plan dining.** Dining halls and anything covered by Temple's meal plan are out of scope permanently — that's the university's own dining site's job. "Off the meal plan" is the category definition.
- **No AI/LLM features in Phase 1.** Candidates (e.g., "what should I eat?" recommendations) are deferred to Phase 2 — see `llm-integration.md`.
- **No ordering, payments, or delivery.** TuEats tells you where to go; the transaction happens at the counter or window.
- **No login-walled content.** Anyone can browse venues, ratings, and reviews without an account; an account (verified `@temple.edu`) is required only to *write* — reviews, ratings, and new-venue proposals.
- **No social graph.** Accounts exist to rate, review, and submit: a display name and that's it — no public profiles, followers, DMs, or feeds. (Users get a private page to manage their own ratings and reviews; nobody else sees it.)
- **No unmoderated publishing of structural data.** User-proposed venues go to an admin approval queue, never straight to the map.
- **No scraping or unofficial APIs.** Nothing automated ever touches Google properties; the Google reference rating is a numbers-only snapshot captured by hand in the admin UI.
- **No real-time GPS tracking.** Truck locations are curated data, not live telemetry — the trucks are stationary throughout the day anyway.
- **Not a general Philadelphia food directory.** Scope is Temple's main campus and its immediate surroundings — the category grows over time, the geography doesn't.
- **No native mobile apps.** Responsive web only; the mobile web experience must be good enough that an app is unnecessary.

---

## Target Users

| User Type | Description |
|-----------|-------------|
| Primary User | Temple students on campus between classes, deciding where to eat right now — almost always on a phone, in a hurry. And also people who want to take their time to decide what to eat after a long day of classes. Anyone can browse without an account; signing up with a verified `@temple.edu` email unlocks rating, reviewing, and proposing new venues (pending admin approval). |
| Secondary User | Faculty, staff, and researchers on a break; campus visitors and prospective students on tours who don't know the food landscape at all. (Faculty/staff share the `@temple.edu` domain, so they can rate too — "verified campus community" is the real boundary.) |
| Administrator | Project maintainer(s) who curate venue data — adding venues, updating hours/locations, retiring closed ones — approve user-submitted venues, and moderate reviews (handling reports, removing abuse) through a lightweight admin interface. |

---

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | Next.js (App Router) + React + Tailwind CSS | Public pages are static/ISR for speed; deployed from GitHub. Routes and components are venue-generic (e.g., `/eat/[slug]`), never truck-specific. |
| Maps | MapLibre GL JS + OpenFreeMap vector tiles | Smooth, modern map UX. Open source, no API key, no billing — $0 at any traffic level. Category layers/filters become the UX backbone as venue types grow. |
| Backend | Next.js API routes / server actions | The **single write path**: every mutation (admin CRUD, ratings, reviews, venue proposals) goes browser → server → validate → rate-limit → DB. No separate backend service; no client-direct DB access. |
| Database | PostgreSQL on Supabase (free tier) | Source of truth for **venues** (type discriminator: `truck` now; `restaurant`, `cafe`, `vending` later, with an optional indoor building/floor location for vending), users, ratings, reviews, the submission/approval queue, and manual Google rating snapshots. **Decided in `architecture-planning.md`** — Supabase bundles auth, keeping the vendor count at two (Vercel + Supabase). |
| Auth | Supabase Auth — student accounts, signup restricted to verified `@temple.edu`, plus admin roles | Browsing is always public; auth gates writes only. Domain restriction enforced in our own server action; verification emails sent via custom SMTP (Resend free tier). Details in `auth-security.md`. |
| External data | Google rating snapshots (manual) | The admin manually records each venue's Google star rating + review count from its public listing — numbers only, always labeled with source and an "as of" capture date, auto-hidden after 12 months unless re-verified during the semester data sweep. No API, no key, no billing, nothing automated. |
| AI / LLM | **None in Phase 1** | Phase 2 candidates only — see `llm-integration.md`. |
| Hosting | Vercel (free tier) | CI/CD from GitHub; preview deploys per PR. |

---

## Stakeholders

| Name / Role | Responsibility |
|-------------|----------------|
| Rafiat Amir — Sponsor & Lead Developer | Product vision, all engineering, data curation, content moderation, final say on scope. |
| Venue owners (informal) — truck operators now; restaurants/cafes later | Source of truth for hours, menus, and locations; can request corrections and flag unfair reviews. |
| Temple campus community (informal) | The users — and contributors: ratings, reviews, and new-venue proposals via the site; feedback, bug reports, and data corrections via a form. |

---

## Key Constraints

- **Venue-generic from day one.** Schema, URLs, and component names never say "truck" except as a `type` value. This is the one architectural decision that is nearly free now and a breaking migration later.
- **Budget = existing subscriptions only, no new spend.** The already-paid Supabase Pro plan ($25/mo) hosts production (daily backups, no idle-pausing); everything else runs free: Vercel, OpenFreeMap, Resend (verification email), and a free-org Supabase project for dev. No new card-on-file dependencies — the manual Google snapshot approach exists partly to keep it that way.
- **User content carries real stakes.** Reviews target real small businesses run by real people. Ship with a content policy, a report/remove flow, per-user rate limits, verified-email signup, and the admin approval queue from day one. Store minimal PII (email + display name, nothing more).
- **Google snapshots trade freshness for independence.** The hand-captured Google rating is accepted as point-in-time data: it must always display its source and capture date, contain numbers only (never copied review text — that belongs to its authors), auto-hide after 12 months, and be re-checked each semester sweep. Not every venue has a Google listing (trucks often don't, vending machines never will), so it renders only where one exists.
- **Team of one, nights and weekends.** Scope is phased and each milestone must be independently shippable: (1) truck directory with map + list, (2) accounts + ratings/reviews/venue proposals, (3+) new venue types — restaurants, then cafes, then vending machines. (Google snapshots are routine curation, not a milestone.)
- **No official data source exists.** Truck data is seeded by exporting the KML from Temple's public Google My Map (names + coordinates), then enriched and verified manually on campus. Later venue types will seed from published guides and campus walks (restaurants/cafes) and building walk-throughs (vending). Accuracy depends on manual curation — hence the admin flow and the 48-hour freshness goal.
- **Unofficial and unaffiliated.** The site must carry a clear "not affiliated with Temple University" disclaimer and must not use the university's trademarked name, "T" logo, or other marks beyond the "TU" nod in the project name.
- **Phase 1 ships zero AI/LLM functionality.** Any such feature waits for Phase 2.
- **Mobile-first is non-negotiable.** The primary scenario is a student standing on a campus sidewalk with 15 minutes between classes.
