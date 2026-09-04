# Authentication & Security

> **OpenOwls SDD** — Read by engineers and the AI coding assistant.
> Defines how users are authenticated and authorized, how sensitive data is protected,
> and what security rules apply across the project. Security is a design concern, not a
> last-minute checklist — document these decisions before writing auth code.

---

## User Model & Scale

> **2026-08-28 update:** V1 originally shipped with no student/member accounts
> at all. A `member` role now exists for real, created automatically on first
> Google sign-in (see Identity Strategy below) — but it's intentionally
> minimal: a profile row and nothing else. Ratings, reviews, venue proposals,
> and everything else the `member` row was originally speced for below are
> **still a planned post-V1 phase**, not implemented. See
> `Context/decisions.md` (2026-08-28) for why login-walling and Google OAuth,
> both previously ruled out below, were reversed, and (2026-08-18 entries)
> for why V1 originally shipped admin-only.

| Question | Decision |
|----------|----------|
| Expected number of users | Hundreds of active accounts during a semester; low-thousands ceiling. Anonymous readers are still the majority of map/list traffic — the account requirement only sits in front of individual venue pages. |
| Growth expectation | Bounded by campus population — no viral growth expected or designed for. Free tiers hold at 10× the target. |
| User model | Anonymous public (map/list/search) + `member` (any Google-authenticated visitor, created automatically) + `admin`(s) (no fixed cap, each provisioned individually via direct DB access). Identity for a member = a Google account (held by Supabase Auth) + a unique display name and unique username (held in `profiles`); class year is optional. Public reviews show display name only. The private `/account` page is the only place username and class year appear. |
| Do users belong to groups? | No. No orgs, teams, or groups — just the role enum. |
| Anonymous / guest access? | The map, search, filters, and venue names/cards are anonymous-accessible by design. Opening an individual venue's detail page (`/eat/[slug]`) requires a signed-in session — a deliberate reversal of the original "no login-walling" non-goal, made 2026-08-28 (see `Context/decisions.md`). The problem-report form still lives on that page and is still identity-agnostic (IP-hash rate-limited, honeypot-protected, no `requireUser()` check) — it just now only ever gets reached by someone who has already signed in, since the page around it is gated. |

---

## Identity Strategy

Two independent identity provider paths exist, never conflated: **admin**
(email + password, self-provisioned by nobody but the maintainer) and
**member** (Google OAuth, self-service, open to anyone with a Google
account). A successful sign-in on either path proves identity only —
`profiles.role` is the only source of authorization, and nothing about the
member path can ever produce an `admin` role (see Authorization & Roles).

| Setting | Decision |
|---------|----------|
| Approach | **Delegate identity to Supabase Auth.** We never store or verify credentials ourselves, for either path. |
| Why this approach | A solo nights-and-weekends project should not own password storage, verification-email plumbing, or an OAuth handshake. Supabase Auth is already in the stack (one vendor), free at this scale, and SSR/cookie-ready for Next.js. |
| Identity provider — **admin** | Supabase Auth, **email + password**. Each admin account is provisioned individually, directly in the Supabase dashboard by the maintainer — there is no in-app signup or admin self-registration, for the first admin or any added later. |
| Identity provider — **member** | Supabase Auth, **Google OAuth**, self-service — anyone with a Google account can create one by signing in. No `@temple.edu` restriction (a plain consumer Google account works). First sign-in auto-creates a `profiles` row (`role: "member"`, an auto-generated unique display name and unique username — see `src/lib/member-profile.ts`) via `/auth/callback`, the one route handler in the app (see Authentication Method below for why OAuth needs it). |
| Why admin uses a password, not OTP | V1 originally used OTP/magic-link for admin too. It never completed a session in practice: Supabase's PKCE flow requires the *same browser* that requested the link to also click it, which silently breaks when the email is opened on a different device, and is separately vulnerable to corporate link-scanners (e.g. Office 365 Safe Links) pre-fetching and consuming the single-use code. A single, low-volume admin account doesn't need passwordless — password auth removes both failure modes entirely. |
| Why member uses Google OAuth, not email OTP | Reversed 2026-08-28 from the original OTP-gated `@temple.edu` plan — see `Context/decisions.md`. Google sign-in is one click, has no cross-device link-click failure mode, and doesn't depend on Supabase's SMTP pipeline (which had its own reliability problems for the admin OTP flow it replaced, `Context/decisions.md` 2026-08-18). The tradeoff: it's no longer verified-student-only, since any Google account works. |
| Fallback / alternative | Admin: none beyond the password-recovery flow below. Member: none — Google is the only provider; don't add another (Apple, email OTP, etc.) without a deliberate decision, not as an incremental "why not both." |

---

## Authentication Method

| Setting | Value |
|---------|-------|
| Method | Admin: email + password via `supabase.auth.signInWithPassword()`. Member: Google OAuth via `supabase.auth.signInWithOAuth({ provider: "google" })`, redirect-based. |
| Why these methods | Password: proven, well-understood, no cross-device or link-scanner failure modes. OAuth: one click, no password to manage, no email deliverability dependency. Neither implies authorization on its own — the admin/member role is a separate, second check in both cases, see Authorization & Roles. |
| Token storage (client) | HTTP-only, `Secure`, `SameSite=Lax` cookies via `@supabase/ssr`, for both paths. **Never** localStorage/sessionStorage. |
| Token lifetime | Supabase defaults: ~1 h access JWT + rotating refresh token (~30 d sliding session), for both paths. |
| Token verification (server) | `supabase.auth.getUser()` on every protected request (server-side verification against the Auth server — never a bare client-side JWT decode). Wrapped in `lib/auth.ts` as `getUser()` / `requireUser()` / `requireAdmin()`. `getUser()` is now called from every public page (not just `/admin`) to render the sign-in gate on `/eat/[slug]` and the account control in the header. |

### The OAuth callback route — the one deliberate route handler

Google's redirect-based flow has no server-action equivalent: Supabase's
hosted callback exchanges the code with Google, then redirects the browser to
our own `redirectTo` URL with a `?code=` param that a **server** must
exchange for a session (`exchangeCodeForSession`) before it can set the
session cookies — a Server Component can't do this (see the `setAll` comment
in `src/lib/auth.ts`), so it has to be a route handler:
`src/app/auth/callback/route.ts`. This is the one exception to "no custom
route handlers" elsewhere in this project — admin's password flow and
password recovery both still avoid one entirely.

The callback also carries a `next` query param — the exact path the user was
on when they hit the sign-in gate (e.g. `/eat/richies-cafe`) — so a
successful sign-in returns them there instead of the homepage. `next` is
validated server-side by `safeInternalPath()` (`src/lib/safe-path.ts`), also
used for the venue detail page's `back` link (`query.from` in
`src/app/(public)/eat/[slug]/page.tsx`). An earlier version of this check
only tested that the string started with `/` and didn't start with `//` —
that's insufficient: `URL` parsing (and every browser) normalizes values like
`/\evil.com` or a leading tab before a host past that check, collapsing them
into a protocol-relative `//evil.com` that resolves off-site. `safeInternalPath()`
instead parses the value against a fixed placeholder origin with the `URL`
constructor and checks the **resulting** origin, catching any input that
resolves off-site regardless of how it's spelled — this is the app's standard
defense against an open-redirect via this param.

On first sign-in, the callback also calls `ensureMemberProfile()`
(`src/lib/member-profile.ts`), which inserts a `profiles` row with
`role: "member"`, an auto-generated display name (from the Google
account's name, falling back to the email's local part, then a generic
default, with `uniqueSlug()`-style numeric-suffix collision handling — see
`pickDisplayName()`), and an auto-generated unique username (slug of that
display name via `pickUsername()`). This is the **only** code path that creates a
`profiles` row outside of the maintainer's direct DB access for admins, and
it can never set `role: "admin"` — the insert is hardcoded to `"member"`.

**Authentication and authorization are separate, always.** A successful
`signInAdmin()` proves *who* someone is (a real Supabase user) and nothing
more — it never implies *what* they may do. `requireAdmin()` independently
looks up the `profiles` row for that user and requires `role = "admin"`
before any privileged action runs. This also holds for password recovery
(below): completing a recovery flow re-authenticates the existing account: it
can never create a `profiles` row or change a role.

### Password recovery

`/admin/sign-in` has a self-service "Forgot password?" link
(`requestPasswordReset` → `supabase.auth.resetPasswordForEmail()`) that never
reveals whether an email address has an account (Supabase's own behavior).
The maintainer can also trigger a recovery email directly from the Supabase
dashboard (Authentication → Users → a user row → Reset Password) — useful for
the very first admin account, which has no password until one is set this way.

Supabase delivers recovery tokens to the browser in one of two places
depending on how the link was generated, and a server can only ever see one
of them:

- **URL fragment** (`#access_token=...&type=recovery`) — the current default
  for both the in-app request and dashboard-triggered resets. Fragments are
  never sent to a server, by browser design, so this must be read and
  exchanged client-side.
- **Query param** (`?token_hash=...&type=recovery`) — Supabase's newer email
  template style, only if the project's email template is customized to use
  it. Handled defensively even though it isn't configured today.

`/admin/reset-password` (`src/components/admin/reset-password-form.tsx`)
handles both: it establishes the recovery session client-side (`setSession`
or `verifyOtp`, whichever token shape is present), then submits the new
password through `updateAdminPassword()` — a server action that requires an
active session, calls `supabase.auth.updateUser({ password })`, and
immediately signs the session out so the user re-authenticates normally with
the new password. An invalid or expired link shows a plain "link expired,
request a new one" state rather than erroring.

Because Supabase's dashboard-triggered "Send Password Recovery" doesn't allow
specifying a redirect target — it always uses the project's Site URL, which
is the app's homepage — a small client-side check on every page
(`src/components/auth/recovery-redirect.tsx`) forwards any stray recovery
tokens found on a non-recovery page to `/admin/reset-password`, so a
dashboard-triggered reset works no matter where the tokens land.

No password is ever logged, put in a URL query string we control, stored in
an environment variable, or written to the database — Supabase Auth owns
password storage/hashing entirely; the app never sees a hash, only pass/fail
from `signInWithPassword`/`updateUser`.

---

## Authorization & Roles

| Role | Permissions |
|------|-------------|
| Anonymous | Read the map, list, search, filters, and venue cards/names. Cannot open an individual venue's detail page. Nothing else. |
| Member (any Google-authenticated visitor) | Everything anonymous can do, plus open venue detail pages (`/eat/[slug]`) and submit venue problem reports from them. That's it today — create/edit/delete **own** rating & review, venue proposals, report reviews, and account management are all still **planned, not implemented** (unchanged from the original post-V1 scope; only the identity mechanism and the detail-page gate are new). |
| Admin (the only privileged role) | Venue CRUD (draft/publish/retire/verify), Google snapshot capture, resolve problem reports. |

- **Enforcement point:** the top of every server action — `requireAdmin()` before any logic runs. Route middleware guards `/admin` for UX only; it is **not** the security boundary (server actions re-check, always). The `/eat/[slug]` sign-in gate is enforced in the page component itself (`getUser()` before any venue data renders) — server-side, not a client click-handler, so a shared/bookmarked/directly-typed URL is gated exactly the same as a click from the homepage.
- **Default posture:** deny by default. Deny-all RLS on every table neutralizes the PostgREST surface; a new server action starts from "who may call this?" not "who shouldn't?".
- **Role escalation:** `role = admin` is set only by direct database access by the maintainer. No app surface — UI, action, or API — can grant or change roles. Signing in via any method (Google OAuth, password, or password recovery) never grants it. `ensureMemberProfile()` (the only auto-provisioning code path in the app) is hardcoded to `role: "member"` — there is no code path from a Google account to `admin`, regardless of the account's email domain or name.
- **Ownership checks:** N/A still — no member-owned content exists yet (a `profiles` row and a session, nothing else). Applies once ratings/reviews/proposals actually ship — mutations must filter by `user_id = session user` in the query itself, not just an if-check before it.

---

## User Lifecycle & Management

Admin accounts and member accounts have entirely separate lifecycles.

**Admin** — no public signup; every admin account is provisioned individually
by the maintainer. There's no fixed cap on how many admin accounts exist;
each is bootstrapped the same way.

| Stage | Decision |
|-------|----------|
| Account creation | Each admin account is created directly in the Supabase dashboard by the maintainer, not through the app. Its `profiles` row (`role: "admin"`) is likewise inserted only via direct DB access, one at a time, per person. |
| Password reset | Self-service via `/admin/sign-in` → "Forgot password?", or maintainer-triggered from the Supabase dashboard. See the Password recovery subsection above. |
| Account recovery | Same as password reset — recovery *is* the password-reset flow, per account. |
| Profile updates | Not exposed — no UI to change the admin's own email or display name. |
| Deactivation / deletion | Manual, dashboard-only (delete the Supabase Auth user and/or the `profiles` row). |
| Who administers users | The admin(s) (project maintainer, plus any trusted co-maintainer granted the role), via the Supabase dashboard. Role changes only via direct DB. |

**Member** — fully self-service; anyone with a Google account can create one
by hitting the sign-in gate on any venue page. Everything below is genuinely
minimal on purpose — ratings, reviews, and proposals aren't built yet, so
there's no owned content to manage.

| Stage | Decision |
|-------|----------|
| Account creation | Automatic on first Google sign-in — `ensureMemberProfile()` inserts a `profiles` row (`role: "member"`, auto-generated display name and username) the moment `/auth/callback` sees a new `auth.users.id`. No admin involvement, no approval step. |
| Password reset | N/A — Google owns the credential; TuEats never sees or stores one. |
| Account recovery | Whatever Google's own account-recovery flow offers — outside this app entirely. |
| Profile updates | Private `/account` page — member can change display name, username, and class year. Display-name and username changes share a 24-hour cooldown (`identity_changed_at`). No profile photos. |
| Deactivation / deletion | Manual, dashboard-only today (delete the Supabase Auth user and/or the `profiles` row) — no self-service deletion UI exists yet. The `/about` disclosure promises a contact route for deletion requests; that's the mechanism until self-service ships. |
| Who administers users | The admin(s), via the Supabase dashboard — same as admin accounts. |

*(Ratings, reviews, venue proposals, and self-service profile/account
management are still planned for a later phase and intentionally not detailed
further here until that phase is scoped.)*

---

## Sensitive Data

| Data | Classification | Protection |
|------|---------------|------------|
| Account email (admin's, or a member's Google email) | PII — the only real PII in the system | Lives **only** in Supabase `auth.users`. Never copied into app tables (`ensureMemberProfile()` only ever writes `id`, `displayName`, `username`, `role` — never the Google account's email), never in any query result, page payload, or log line. |
| Display name | Public by design | The identity rendered on reviews. Unique. |
| Username | Private account handle | Unique; shown on `/account` only — not a public profile URL, not shown on reviews. |
| Class year | Private account field | Optional; shown on `/account` only. |
| User geolocation ("locate me" on the map) | Sensitive | **Never leaves the browser.** Used client-side by MapLibre only; no endpoint receives it, nothing stores it. |
| IP addresses (anonymous reports) | PII | Never stored raw — salted hash (`IP_HASH_SALT`) for rate limiting only. |
| Ratings & review text | Public UGC | Tied to display name; moderation via status flags, never hard-deleted out from under reports. |
| Session tokens | Secret | HTTP-only cookies; rotation handled by Supabase; never logged. |
| Payment / financial data | — | Does not exist in this system, by scope. |

---

## Secrets Management

- All secrets live in environment variables — never in committed code.
- `.env` files are git-ignored; a `.env.example` with dummy values is checked in.
- Each environment uses separate keys/secrets (separate Supabase dev/prod projects = separate keys by construction).
- Rotate any secret immediately if it is accidentally committed.
- **The Supabase service-role key is not used by the app at all.** It exists only inside the Supabase dashboard; it never appears in Vercel env vars, code, or CI. (Drizzle connects with the database password via the pooler; the deny-all RLS posture assumes the anon key is public anyway.)
- Resend SMTP credentials are configured inside Supabase (Auth → SMTP) — the app and repo never hold them.

---

## Common Web Vulnerabilities

| Threat | Mitigation |
|--------|------------|
| Broken access control | Single write path; `requireUser()`/`requireAdmin()` opens every server action; ownership enforced in the SQL predicate; deny-all RLS as the second, independent layer; role-boundary tests in CI. |
| SQL injection | Drizzle parameterized queries exclusively; no string-concatenated SQL anywhere, including the seed script. |
| Sensitive data exposure | Email confined to `auth.users`; queries select explicit columns (no `select *` of user-adjacent tables into payloads); error messages never include internals. |
| Token forgery / replay | Supabase-signed JWTs verified server-side via `getUser()`; rotating refresh tokens; HTTP-only cookies mean scripts can't exfiltrate sessions. |
| Insecure client storage | No tokens or PII in localStorage/sessionStorage/IndexedDB — the client stores nothing sensitive, full stop. |
| XSS via review text | Review text is stored and rendered as **plain text** (React escaping; `dangerouslySetInnerHTML` is banned project-wide). Length caps server-side. |
| CSRF | Server actions are POST-only with Next.js origin checking; `SameSite=Lax` cookies; no state-changing GET handlers exist. |
| Abuse / spam floods | Postgres-backed rate limits on every write (per-user; per-IP-hash for anonymous reports); honeypot field on the anonymous form; strikes for repeat content offenders. |

---

## Input Validation

- Validate every request body with schemas; reject unexpected fields.
- Enforce enum values and sensible bounds server-side.
- Never trust client-supplied identity for authorization decisions.
- Concretely: every server action parses its input with a **strict Zod schema** from `lib/validation/` before anything else — unknown keys rejected, enums exact, lengths capped (review ≤ 1000, report note ≤ 500, display name 3–30, username 3–20 `^[a-z][a-z0-9_]+$`), numbers bounded (stars 1–5 integer, class year 1990–2040, lat/lng inside the campus bounding box for proposals).
- IDs from the client select *which* row **only in combination with** the session user's ID — never alone.

---

## Session & Account Safety

- Sessions rotate (refresh token rotation); sign-out revokes server-side, not just cookie deletion.
- The strike system (`struck_at`) removes write access without destroying the account or its content — reversible, auditable moderation. Applies once the member phase ships; N/A in V1.
- Display-name and username changes are rate-limited (one identity change per 24 hours via `identity_changed_at`) to keep identities stable (anti-impersonation).
- Admin sign-in and password-reset requests rely on Supabase Auth's own built-in rate limiting; there is no additional app-level limiter (single low-volume admin account, low abuse surface). Revisit if real abuse is ever observed — the pattern to copy is `assertProblemReportAllowed` in `lib/ratelimit.ts`.
- Admin accounts are the highest-value target in V1 — there are no other privileged accounts. The admin role grant lives only in the DB (never settable via sign-in or password reset, never self-service), and every admin action is attributable to a specific `auth.users.id`/`profiles` row even when more than one person holds the role.

---

## Privacy Policy & Disclosure

The `/about` page must plainly disclose:

- What we collect: your Google account's name and email (identity only, email never displayed or stored outside Supabase Auth), an auto-generated display name, and the content you post; salted IP hashes for anonymous reports (no raw IPs).
- Signing in: browsing (map/search/filters) never requires an account; opening an individual venue's page does, via Google sign-in.
- What is public: display name, ratings, reviews — permanently attached to venue pages unless you delete/anonymize them.
- Cookies: authentication session only — neither analytics tool sets one. Vercel Web Analytics (added 2026-08-27) is privacy-friendly/cookieless page-view counting. PostHog (added 2026-09-03, widened 2026-09-04) is proxied through TuEats' own domain rather than loaded from PostHog directly and uses browser storage instead of a cookie. It records: page views; clicks and form interactions on public pages (never the text typed into a field — search, reviews, and report notes are never captured); and a handful of specific product actions (which filters you use, when you view or select a place, and if you rate a place, add a photo, or report a problem). A masked session replay may also be recorded — every typed value is replaced with `***` before it ever leaves your browser, so what you type is never visible even to us. None of this runs on `/admin` — TuEats' own internal tooling is structurally excluded, not just filtered. PostHog is configured to discard IP addresses and skip IP-based geolocation, and stays fully anonymous throughout: no account id, display name, or email is ever sent to it. No advertising trackers, no third-party ad analytics.
- Your location: the map's "locate me" runs entirely in your browser; TuEats servers never receive it.
- Google ratings shown are manual point-in-time snapshots with their capture date displayed.
- TuEats is not affiliated with Temple University.
- Contact route for corrections, review disputes (venue owners included), and account/data deletion.

---

## Security Checklist Before Deploy

- [ ] No secrets in the repository or client app
- [ ] Access control tested (a user cannot read another user's data)
- [ ] Server verifies auth tokens on every protected route
- [ ] HTTPS enforced
- [ ] Account deletion works and erases server-side data (if accounts exist)
- [ ] No PII sent to the LLM unless explicitly approved and documented (moot in Phase 1 — no LLM exists)
- [ ] Error messages don't leak stack traces or internal details
- [ ] Deny-all RLS verified on **every** table by attempting reads/writes with the bare anon key
- [ ] A non-admin authenticated session cannot reach any `/admin` route or admin action — test exists (`assertIsAdmin` role-boundary coverage in `lib/auth.test.ts`)
- [ ] Password recovery cannot grant admin access under any code path — `updateAdminPassword` never touches `profiles`
- [ ] Rate limits actually trigger (exercised in tests, not assumed)
- [ ] Every serialized payload audited: display name is the only user field present (once the member phase ships — N/A while no display names exist)

---

## What Claude Code Should Never Do

- Never put secrets (API keys, service-role keys, JWT secrets) in the client or the repository.
- Never disable or weaken access-control policies to make a feature work.
- Never derive user identity from client-supplied input — always from a verified token.
- Never send PII to the LLM unless the specs explicitly allow it.
- Never log tokens, secrets, or PII.
- Never trust client input without server-side validation.
- Never use the Supabase **service-role key** in application code, CI, or Vercel env — it is dashboard-only.
- Never read or write data through `supabase-js` — data access is Drizzle, server-side, period. (`supabase-js` is for auth flows only.)
- Never store a raw IP address, and never send the user's geolocation to the server.
- Never render user content as HTML (`dangerouslySetInnerHTML` is banned).
- Never expose a user's email in any table, payload, page, or log — it lives in `auth.users` alone, whether it's an admin's or a Google-authenticated member's.
- Never add a social login provider beyond Google for members (no Apple, Facebook, etc.) without a deliberate spec change — and never add one for admin at all, which stays password-only.
- Never let a successful sign-in (Google OAuth, password, or password recovery) imply admin access — `requireAdmin()`'s `profiles.role = "admin"` check is the only source of authorization, always. `ensureMemberProfile()` is hardcoded to `role: "member"`; there is no path from any Google account to `admin`.
- Never add a route handler for anything other than the OAuth callback (`src/app/auth/callback/route.ts`) — every other mutation is still a server action; the callback is a deliberate, narrow exception because OAuth's redirect handshake has no server-action equivalent.
- Never pass an unvalidated `next`/redirect param to `NextResponse.redirect` (or a `<Link href>`) — always run it through `safeInternalPath()` (`src/lib/safe-path.ts`) first. A plain string prefix check (`starts with "/", not "//"`) is not enough — it still lets through values like `/\evil.com` that `URL` parsing collapses into a protocol-relative, off-site redirect.
- Never log or persist a password, recovery token, OAuth `code`, or `token_hash`/`access_token` beyond what's needed to complete a single sign-in or recovery request.
