# Authentication & Security

> **OpenOwls SDD** — Read by engineers and the AI coding assistant.
> Defines how users are authenticated and authorized, how sensitive data is protected,
> and what security rules apply across the project. Security is a design concern, not a
> last-minute checklist — document these decisions before writing auth code.

---

## User Model & Scale

| Question | Decision |
|----------|----------|
| Expected number of users | Hundreds of active accounts during a semester; low-thousands ceiling. Anonymous readers are the majority of traffic. |
| Growth expectation | Bounded by campus population — no viral growth expected or designed for. Free tiers hold at 10× the target. |
| User model | One flat user type (`member`) plus an `admin` role flag. Identity = verified `@temple.edu` email (held by Supabase Auth) + unique public display name (held in `profiles`). |
| Do users belong to groups? | No. No orgs, teams, or groups — just the role enum. |
| Anonymous / guest access? | Yes, first-class: **all reads are anonymous-accessible** (a non-goal forbids login-walling), and anonymous users may submit venue problem reports (IP-hash rate-limited, honeypot-protected). |

---

## Identity Strategy

| Setting | Decision |
|---------|----------|
| Approach | **Delegate identity to Supabase Auth.** We never store or verify credentials ourselves. |
| Why this approach | A solo nights-and-weekends project should not own password storage or verification-email plumbing. Supabase Auth is already in the stack (one vendor), free at this scale, and SSR/cookie-ready for Next.js. |
| Identity provider(s) | Supabase Auth, **email OTP only** (code / magic link to the campus address). No social logins — Google/Apple sign-in would bypass the `@temple.edu` ownership proof that the entire trust model rests on. |
| Fallback / alternative | None in v1. If OTP friction proves real, revisit (e.g., Google OAuth restricted to the temple.edu hosted domain) as a spec change — never as a quick fix. |

---

## Authentication Method

| Setting | Value |
|---------|-------|
| Method | Passwordless email OTP to a `@temple.edu` address. Signup and sign-in are the same flow. |
| Why this method | Proving control of the campus mailbox **is** the authorization model ("verified campus community"). Passwordless means nothing to breach, reset, or reuse across sites. |
| Token storage (client) | HTTP-only, `Secure`, `SameSite=Lax` cookies via `@supabase/ssr`. **Never** localStorage/sessionStorage. |
| Token lifetime | Supabase defaults: ~1 h access JWT + rotating refresh token (~30 d sliding session). |
| Token verification (server) | `supabase.auth.getUser()` on every protected request (server-side verification against the Auth server — never a bare client-side JWT decode). Wrapped in `lib/auth.ts` as `getUser()` / `requireUser()` / `requireAdmin()`. |

The domain restriction is enforced **in our `requestSignup` server action** — exact, case-insensitive match on `@temple.edu` (no subdomains, no plus-trick bypasses of the domain itself) — *before* Supabase Auth is ever invoked. The rule lives in one testable function, not a vendor dashboard.

---

## Authorization & Roles

| Role | Permissions |
|------|-------------|
| Anonymous | Read everything public (map, list, venues, ratings, reviews). Submit venue problem reports (rate-limited by salted IP hash). Nothing else. |
| Member (verified campus user) | Everything anonymous can do, plus: create/edit/delete **own** rating & review (one per venue), submit venue proposals, report reviews, manage own account (display name, deletion). A member with `struck_at` set loses all writes; reads unaffected. |
| Admin | Everything a member can do, plus: venue CRUD (draft/publish/retire/verify), Google snapshot capture, resolve proposals/reports, strike users. |

- **Enforcement point:** the top of every server action — `requireUser()` / `requireAdmin()` before any logic runs. Route middleware guards `/admin` and `/account` for UX only; it is **not** the security boundary (server actions re-check, always).
- **Default posture:** deny by default. Deny-all RLS on every table neutralizes the PostgREST surface; a new server action starts from "who may call this?" not "who shouldn't?".
- **Role escalation:** `role = admin` is set only by direct database access by the maintainer. No app surface — UI, action, or API — can grant or change roles.
- **Ownership checks:** mutations on ratings/reviews always filter by `user_id = session user` in the query itself (not just an if-check before it), so a forged ID updates zero rows.

---

## User Lifecycle & Management

| Stage | Decision |
|-------|----------|
| Account creation | `requestSignup(email)` → domain check → Supabase sends OTP (via Resend SMTP) → `/auth/callback` exchanges code for a session. |
| Onboarding | One step: choose a unique display name (3–30 chars, restricted charset, blocklist-checked, uniqueness-enforced). Until the profile is complete, the account cannot write. |
| Password reset | N/A — passwordless. "Reset" is just requesting a new OTP. |
| Account recovery | Possession of the campus mailbox *is* recovery. Note: graduates eventually lose `@temple.edu` access — their content persists under the display name; the orphaned account can be deleted by the admin on verified request. Accepted as a known limitation. |
| Profile updates | Display name changeable, rate-limited (e.g., twice per 30 days) to prevent impersonation churn. Email is not changeable — the account *is* the campus address. |
| Deactivation / deletion | Self-service deletion with the Feature 8 choice: delete my reviews with me, or anonymize them (content stays, attribution becomes "former student"). Deletion removes the Supabase Auth user (email gone) and the `profiles` row (or anonymizes it). |
| Who administers users | The sole admin (project maintainer). Strikes and report resolution happen in `/admin`; role changes only via direct DB. |

---

## Sensitive Data

| Data | Classification | Protection |
|------|---------------|------------|
| Campus email | PII — the only real PII in the system | Lives **only** in Supabase `auth.users`. Never copied into app tables, never in any query result, page payload, or log line. |
| Display name | Public by design | The only identity ever rendered or serialized. |
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
- Concretely: every server action parses its input with a **strict Zod schema** from `lib/validation/` before anything else — unknown keys rejected, enums exact, lengths capped (review ≤ 1000, report note ≤ 500, display name 3–30), numbers bounded (stars 1–5 integer, lat/lng inside the campus bounding box for proposals).
- IDs from the client select *which* row **only in combination with** the session user's ID — never alone.

---

## Session & Account Safety

- Sessions rotate (refresh token rotation); sign-out revokes server-side, not just cookie deletion.
- The strike system (`struck_at`) removes write access without destroying the account or its content — reversible, auditable moderation.
- Display-name changes are rate-limited to keep identities stable (anti-impersonation).
- OTP request flows are rate-limited at both layers (Supabase built-in + our action-level cap) so the signup form can't be used to email-bomb a mailbox.
- The admin account is the highest-value target: same OTP flow, but the admin role grant lives only in the DB, and every admin action is attributable (single admin, full history in the data).

---

## Privacy Policy & Disclosure

The `/about` page must plainly disclose:

- What we collect: campus email (verification only, never displayed), chosen display name, and the content you post; salted IP hashes for anonymous reports (no raw IPs).
- What is public: display name, ratings, reviews — permanently attached to venue pages unless you delete/anonymize them.
- Cookies: authentication session only. No advertising trackers, no third-party analytics in v1 (if privacy-friendly analytics are ever added, this disclosure updates first).
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
- [ ] Signup rejects non-`@temple.edu` addresses (including lookalike domains) — test exists
- [ ] A member session cannot reach any `/admin` route or admin action — test exists
- [ ] Rate limits actually trigger (exercised in tests, not assumed)
- [ ] Every serialized payload audited: display name is the only user field present

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
- Never expose a user's email in any table, payload, page, or log — it lives in `auth.users` alone.
- Never add a social login or alternative signup path — it would silently break the `@temple.edu` trust model.
