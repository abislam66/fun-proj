# Architecture Planning

> **OpenOwls SDD** — Read by the system architect and software engineers.
> Defines the folder structure, key design decisions, and implementation details.
> Claude Code uses this file to understand how the codebase is organized.

---

## System Architecture Overview

TuEats is a **single Next.js (App Router) application on Vercel** backed by **Supabase (Postgres + Auth)**. There is no separate backend service. The app has three surfaces:

1. **Public surface** (`/`, `/eat/[slug]`, `/about`) — statically generated with ISR and **tag-based revalidation**. Venue data is fetched in React Server Components and passed to client components; the map (MapLibre GL) and list consume the *same* payload so filters stay in sync. Pages carry hours data and compute **"open now" in the browser** — the status is never baked into cached HTML, so a page cached at 9 a.m. is still correct at 9 p.m.
2. **Account surface** (`/account`) — dynamic, cookie-authenticated. Private profile (display name, username, class year) and "my ratings & reviews." Account deletion is still later.
3. **Admin surface** (`/admin/*`) — dynamic, role-gated. Venue CRUD, draft/publish/retire/verify, Google snapshot capture, and the three queues (proposals, review reports, problem reports).

**The single write path** is the load-bearing rule: every mutation — admin or user, authenticated or anonymous — is a **server action** that runs *validate (Zod) → authorize → rate-limit → write (Drizzle) → revalidateTag*. The browser never talks to the database. Supabase's auto-generated REST surface (PostgREST) is neutralized with deny-all RLS policies; the app reaches Postgres only server-side through the connection pooler.

Reads flow: RSC → Drizzle → Postgres, cached under two tags — `venues` (map/list payload) and `venue:{slug}` (detail page). Any write that changes public data invalidates exactly the tags it touches, which is how "admin edit live within one minute" (Feature 5) is met with room to spare.

### Component Diagram
```
                     ┌────────────────────────────────────────────────┐
                     │                    Vercel                      │
                     │  ┌──────────────────────────────────────────┐  │
  Browser ──────────▶│  │           Next.js (App Router)           │  │
  (MapLibre GL       │  │                                          │  │
   map + list UI)    │  │  RSC pages — ISR, tag-revalidated        │  │
     ▲               │  │  Server Actions — THE single write path  │  │
     │ vector tiles  │  │   Zod validate → authorize → rate-limit  │  │
     │               │  │   → Drizzle write → revalidateTag        │  │
  OpenFreeMap        │  └──────────┬──────────────────┬────────────┘  │
  (no key, no $)     └─────────────┼──────────────────┼───────────────┘
                                   │ pooled Postgres  │ cookie sessions
                                   ▼                  ▼
                     ┌──────────────────────┐  ┌────────────────┐   ┌──────────┐
                     │  Supabase Postgres   │  │ Supabase Auth  │──▶│  Resend  │
                     │  venues, profiles,   │  │ @temple.edu    │   │  (SMTP,  │
                     │  ratings, proposals, │  │ email OTP      │   │  config- │
                     │  reports             │  │ (PostgREST:    │   │  ured in │
                     └──────────────────────┘  │  RLS deny-all) │   │ Supabase)│
                                               └────────────────┘   └──────────┘
```

---

## Folder Structure

```
tueats/
├── Specs/                          # this SDD
├── public/                         # static assets (icons, og image)
├── scripts/
│   └── seed-kml.ts                 # one-time KML → draft venues importer (run locally, idempotent)
├── drizzle/                        # generated SQL migrations (checked in)
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── page.tsx            # home: map + list
│   │   │   ├── eat/[slug]/page.tsx # venue detail
│   │   │   ├── about/page.tsx      # disclaimer, content policy, credits
│   │   │   └── account/page.tsx    # private profile + my ratings (dynamic)
│   │   ├── admin/                  # venue CRUD + queues (role-gated, dynamic)
│   │   ├── auth/callback/route.ts  # Supabase OTP code exchange (only route handler)
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── map/                    # MapLibre wrapper — lazy client component (dynamic import)
│   │   ├── venues/                 # cards, list rows, filter bar, status badge
│   │   ├── reviews/                # composer, review list, report dialog, star input
│   │   ├── account/                # private profile form + own review list
│   │   └── ui/                     # shared primitives
│   ├── actions/                    # server actions by domain:
│   │   ├── ratings.ts              #   submit/delete rating+review
│   │   ├── proposals.ts            #   submit venue proposal
│   │   ├── reports.ts              #   report review (authed) / report problem (anon)
│   │   ├── account.ts              #   update own profile
│   │   └── admin.ts                #   venue CRUD, queues, snapshots, strikes
│   ├── lib/
│   │   ├── db/                     # drizzle client (pooled), schema.ts, queries/
│   │   ├── auth.ts                 # session helpers: getUser / requireUser / requireAdmin
│   │   ├── hours.ts                # open-now computation — client-safe, America/New_York aware
│   │   ├── ratelimit.ts            # Postgres-backed limits (no Redis)
│   │   ├── slug.ts                 # slug generation + collision suffixing
│   │   └── validation/             # Zod schemas shared by forms and server actions
│   └── config/
│       ├── zones.ts                # curated campus zones (key, label, sort)
│       ├── cuisines.ts             # cuisine tag vocabulary
│       ├── semester.ts             # academic calendar dates (updated yearly by hand)
│       └── site.ts                 # campus bounding box, default viewport, map style URL, rate-limit numbers
├── drizzle.config.ts
├── next.config.ts
└── package.json
```

Two structural rules: **nothing outside `src/lib/db` imports the Drizzle client** (queries live in `lib/db/queries/`, actions and pages call those), and **nothing in `components/` is venue-type-specific** — a card renders any `venue.type` (Common Pitfall #1 in `domain-knowledge.md`).

---

## Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Database + auth platform | **Supabase** (Postgres + Auth) | One vendor covers both; the existing Pro plan hosts prod (backups, no pausing) while a free-org project hosts dev; SSR cookie auth integrates cleanly. With the Google API dropped, total vendor count stays at two (Vercel + Supabase). |
| DB access | **Drizzle ORM**, server-only, via Supavisor pooled connection | Type-safe SQL that survives serverless (pooler handles connection churn). `supabase-js` is used for *auth only*, never data. |
| PostgREST exposure | **RLS deny-all** on every table | We don't use Supabase's client SDK for data, so its auto-API is pure attack surface — deny-by-default makes a leaked anon key worthless. Defense-in-depth behind the single write path. |
| Signup domain restriction | Enforced **in our server action** before Supabase Auth is invoked (email OTP flow) | The `@temple.edu` rule lives in our code (testable, one place), not in a vendor dashboard setting. |
| Verification email delivery | **Custom SMTP (Resend free tier) configured inside Supabase** | Supabase's built-in sender is rate-limited to a handful of emails/hour — unusable even at soft launch. Configured in the Supabase dashboard; the app itself holds no email credentials. |
| Ratings + reviews | **One `ratings` table with nullable `review_text`** | The domain rule "a review always carries a rating; a rating may exist without text" *is* this schema. One unique constraint `(venue_id, user_id)` enforces one-per-user-per-venue for both; editing a review edits the row. |
| Rating aggregates | Computed at query time (AVG/COUNT), no denormalized counters | At ≤ a few hundred venues and campus-scale traffic, a GROUP BY is free. Revisit only with evidence. |
| Opening hours | **JSONB column**, Zod-validated shape, local wall-clock times | Hours are display data — never joined or queried relationally. Weekday → `[{open, close}]` ranges in America/New_York (never UTC — DST, see domain pitfalls). |
| "Open now" | **Computed client-side** from shipped hours + client clock | Keeps public pages fully static/ISR — no per-minute revalidation, no stale badge. `lib/hours.ts` is shared so server code (e.g., future features) computes identically. |
| Cuisine tags | `text[]` validated against `config/cuisines.ts` (GIN index) | A join table buys nothing at this scale; a curated vocabulary in config keeps tags consistent and filterable. |
| Campus zones | Config file (`config/zones.ts`), venues store `zone_key` | Zones are shaped by the vending district and change ~never; config keeps the admin UI and schema smaller. |
| Caching | ISR + `revalidateTag` (`venues`, `venue:{slug}`) | Event-driven invalidation from the write path; no cron, no TTL guessing; satisfies the one-minute admin-edit SLA. |
| Rate limiting | **Postgres-backed** — count recent rows in the domain tables themselves (per `user_id`; salted `ip_hash` for anonymous problem reports) | Zero extra infrastructure ($0 constraint); the write volume that needs limiting is precisely the write volume being counted. |
| Filter state | Encoded in the **URL** (searchParams) | Shareable filtered views (Feature 2 AC) fall out for free; back/forward works. |
| Map loading | MapLibre GL in a **dynamically imported client component** | MapLibre is the heaviest dependency; lazy-loading it protects the <2s interactive budget, and the list renders even if tiles fail. |
| Venue lifecycle | `status: draft → published → retired` (+ `retired_at`) | Encodes "retired, not deleted" and "drafts never public" as data, not convention. |
| Slugs | Generated once at publish, **immutable**, collision-suffixed | Stable URLs are a stated goal; the five gyro trucks prove collision handling must exist on day one. |
| Validation | **Zod schemas in `lib/validation/`**, shared client + server | One source of truth for every payload; forms get instant feedback, the server trusts nothing. |

---

## Data Models

Postgres enums: `venue_type` (`truck | restaurant | cafe | vending`), `venue_status` (`draft | published | retired`), `user_role` (`member | admin`), `rating_status` (`active | removed`), `proposal_status` (`pending | approved | rejected`), `report_status` (`open | dismissed | actioned`), `problem_kind` (`closed | moved | wrong_hours | other`).

### venues
| Field | Type | Description |
|-------|------|-------------|
| id | uuid PK | |
| slug | text UNIQUE | Immutable after publish; collision-suffixed (`new-york-gyro`, `new-york-gyro-2`) |
| type | venue_type | The discriminator — the only place "truck" exists |
| name | text NOT NULL | |
| description | text | Short blurb (seeded from KML, editable) |
| status | venue_status | `draft` (seeded/unpublished) → `published` → `retired` |
| lat, lng | double precision NOT NULL | Map pin |
| zone_key | text | References `config/zones.ts`; app-validated |
| building, floor | text | Indoor location — primarily for `vending` |
| accepts_cash, accepts_card | boolean **NULLABLE** | `null` = unknown (unknown ≠ no — payment truth is hard-won on foot) |
| cuisines | text[] | Values from `config/cuisines.ts`; GIN-indexed |
| hours | jsonb | `{mon: [{open:"08:00", close:"15:00"}], …}` local wall-clock; `null` = unknown |
| semester_only | boolean | Drives "Away for break" status (Feature 14) |
| google_rating | numeric(2,1) | Manual snapshot — see `domain-knowledge.md` |
| google_review_count | integer | Set/cleared together with rating (CHECK constraint) |
| google_captured_at | date | Drives "as of" display and the 12-month auto-hide |
| last_verified_at | timestamptz | Public "last verified" date |
| retired_at | timestamptz | Set when status → retired |
| created_at, updated_at | timestamptz | |

### profiles  *(1:1 with Supabase `auth.users`)*
| Field | Type | Description |
|-------|------|-------------|
| id | uuid PK → auth.users | Supabase Auth owns email + verification |
| display_name | text UNIQUE NOT NULL | Public identity on reviews; email never leaves Supabase Auth |
| username | text UNIQUE NOT NULL | Private handle on `/account` (`^[a-z][a-z0-9_]{2,19}$`); not a public profile URL |
| graduation_year | smallint NULL | Class year (graduated or will graduate); CHECK 1990–2040 |
| identity_changed_at | timestamptz | Last display-name or username change; 24h cooldown |
| role | user_role | `member` / `admin` |
| struck_at | timestamptz | Non-null = write access revoked (reads unaffected) |
| created_at | timestamptz | |

### ratings  *(a review is a rating with text)*
| Field | Type | Description |
|-------|------|-------------|
| id | uuid PK | |
| venue_id | uuid → venues | |
| user_id | uuid → profiles | UNIQUE `(venue_id, user_id)` — one per user per venue |
| stars | smallint | CHECK 1–5 |
| review_text | text | Nullable; CHECK length ≤ 1000. Non-null ⇒ it's a review |
| status | rating_status | `removed` hides it everywhere but preserves the record |
| removed_reason | text | Shown to the author (Feature 11) |
| created_at, updated_at | timestamptz | |

### venue_proposals
| Field | Type | Description |
|-------|------|-------------|
| id | uuid PK | |
| proposer_id | uuid → profiles | |
| payload | jsonb | Venue-shaped draft, Zod-validated on submit |
| status | proposal_status | Proposer can see it (Feature 12) |
| admin_note | text | Optional rejection/approval note |
| approved_venue_id | uuid → venues | Set when approval creates the venue |
| created_at, decided_at | timestamptz | |

### review_reports
| Field | Type | Description |
|-------|------|-------------|
| id | uuid PK | |
| rating_id | uuid → ratings | Queue groups by this — multiple reports, one entry |
| reporter_id | uuid → profiles | UNIQUE `(rating_id, reporter_id)` |
| reason | text | From a fixed list + optional note |
| status | report_status | |
| created_at, resolved_at | timestamptz | |

### problem_reports  *(anonymous — Feature 7)*
| Field | Type | Description |
|-------|------|-------------|
| id | uuid PK | |
| venue_id | uuid → venues | |
| kind | problem_kind | closed / moved / wrong_hours / other |
| note | text | Optional, length-capped |
| ip_hash | text | Salted hash for rate limiting — raw IP never stored |
| status | report_status | Feeds the 48-hour freshness goal |
| created_at, resolved_at | timestamptz | |

---

## API Endpoints

The HTTP surface is deliberately tiny — mutations are server actions, not routes.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/callback` | Supabase email-OTP code exchange → session cookie (the only route handler) |

**Server actions** (all follow validate → authorize → rate-limit → write → revalidate):

| Action | Who | Purpose |
|--------|-----|---------|
| `submitRating` / `deleteRating` | member | Upsert/remove own rating + optional review text |
| `submitProposal` | member | New-venue proposal → approval queue |
| `reportReview` | member | Flag a review → moderation queue |
| `reportProblem` | **anonymous** | Venue data problem (IP-hash rate-limited, honeypot) |
| `requestSignup` / `completeProfile` / `deleteAccount` | anon → member | `@temple.edu` enforcement lives in `requestSignup`; deletion offers delete-vs-anonymize |
| `upsertVenue` / `publishVenue` / `retireVenue` / `verifyVenue` | admin | Venue lifecycle + `revalidateTag` |
| `captureGoogleSnapshot` | admin | Record rating + count + capture date (manual, numbers-only) |
| `resolveProposal` / `resolveReport` / `strikeUser` | admin | Queue resolution and moderation |

---

## LLM Integration

- **Where the LLM layer lives:** Nowhere in Phase 1 — zero LLM code, dependencies, or keys exist in the codebase (a stated non-goal).
- **Trigger:** If approved later: user-initiated only, isolated in `src/lib/ai/` behind a single route handler — nothing elsewhere imports it.
- **Provider abstraction:** Vercel AI SDK, so the provider is a config choice, not an architecture change.
- **Full details:** see `llm-integration.md`.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Pooled (Supavisor, transaction mode) Postgres connection — app runtime |
| `DIRECT_DATABASE_URL` | Direct connection — Drizzle migrations only, never the app |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (auth client) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key — auth flows only; harmless for data because RLS denies all |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for auth redirects and OG tags |
| `NEXT_PUBLIC_MAP_STYLE_URL` | OpenFreeMap style URL — the one-config-value tile-provider swap |
| `IP_HASH_SALT` | Salt for anonymous report IP hashing (PII minimalism) |

Note: Resend SMTP credentials live in the **Supabase dashboard** (Auth → SMTP), not in this app's environment.

---

## Deployment

- Full details in `deployment.md`.
