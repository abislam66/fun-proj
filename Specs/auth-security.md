# Authentication & Security

> **OpenOwls SDD** — Read by engineers and the AI coding assistant.
> Defines how users are authenticated and authorized, how sensitive data is protected,
> and what security rules apply across the project. Security is a design concern, not a
> last-minute checklist — document these decisions before writing auth code.

---

## User Model & Scale

> **V1 note:** V1 ships with no student/member accounts at all — only anonymous
> public browsing plus a single admin. The `member` role, ratings, reviews, and
> venue proposals below describe a **planned post-V1 phase**, not the current
> implementation. Don't build member-facing auth against this table until that
> phase is explicitly scoped. See `Context/decisions.md` (2026-08-18 entries)
> for why V1 shipped this way.

| Question | Decision |
|----------|----------|
| Expected number of users | Hundreds of active accounts during a semester; low-thousands ceiling. Anonymous readers are the majority of traffic. |
| Growth expectation | Bounded by campus population — no viral growth expected or designed for. Free tiers hold at 10× the target. |
| User model | **V1 (current):** anonymous public + admin(s) — no fixed cap on how many people hold the admin role, each provisioned individually. **Post-V1 (planned):** adds a verified-campus `member` role. Identity for a future member = verified `@temple.edu` email (held by Supabase Auth) + unique public display name (held in `profiles`). |
| Do users belong to groups? | No. No orgs, teams, or groups — just the role enum. |
| Anonymous / guest access? | Yes, first-class: **all reads are anonymous-accessible** (a non-goal forbids login-walling), and anonymous users may submit venue problem reports (IP-hash rate-limited, honeypot-protected). |

---

## Identity Strategy

V1 has exactly one identity provider path — **admin only**. There is no public
signup of any kind in V1.

| Setting | Decision |
|---------|----------|
| Approach | **Delegate identity to Supabase Auth.** We never store or verify credentials ourselves. |
| Why this approach | A solo nights-and-weekends project should not own password storage or verification-email plumbing. Supabase Auth is already in the stack (one vendor), free at this scale, and SSR/cookie-ready for Next.js. |
| Identity provider(s) — **admin (V1)** | Supabase Auth, **email + password**. Each admin account is provisioned individually, directly in the Supabase dashboard by the maintainer — there is no in-app signup or admin self-registration, for the first admin or any added later. No social logins — Google/Apple sign-in is never used anywhere in this project. |
| Identity provider(s) — **member (post-V1, not implemented)** | Planned: Supabase Auth email OTP (code / magic link) to the campus address, gating a verified-student `member` role for ratings/reviews. Explicitly deferred — see `Context/backlog.md`. Do not implement until that phase is scoped. |
| Why admin uses a password, not OTP | V1 originally used OTP/magic-link for admin too. It never completed a session in practice: Supabase's PKCE flow requires the *same browser* that requested the link to also click it, which silently breaks when the email is opened on a different device, and is separately vulnerable to corporate link-scanners (e.g. Office 365 Safe Links) pre-fetching and consuming the single-use code. A single, low-volume admin account doesn't need passwordless — password auth removes both failure modes entirely. |
| Fallback / alternative | None beyond the password-recovery flow below. If a future member-facing OTP flow proves too much friction, revisit as a spec change — never as a quick fix. |

---

## Authentication Method

| Setting | Value |
|---------|-------|
| Method | Admin: email + password via `supabase.auth.signInWithPassword()`. No other authentication method exists in V1. |
| Why this method | Proven, well-understood, no cross-device or link-scanner failure modes (see above). The admin role is a separate, second check — see Authorization & Roles. |
| Token storage (client) | HTTP-only, `Secure`, `SameSite=Lax` cookies via `@supabase/ssr`. **Never** localStorage/sessionStorage. |
| Token lifetime | Supabase defaults: ~1 h access JWT + rotating refresh token (~30 d sliding session). |
| Token verification (server) | `supabase.auth.getUser()` on every protected request (server-side verification against the Auth server — never a bare client-side JWT decode). Wrapped in `lib/auth.ts` as `getUser()` / `requireUser()` / `requireAdmin()`. |

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
| Anonymous | Read everything public (map, list, venues). Submit venue problem reports (rate-limited by salted IP hash). Nothing else. |
| Admin (V1's only privileged role) | Venue CRUD (draft/publish/retire/verify), Google snapshot capture, resolve problem reports. |
| Member (**post-V1, not implemented**) | Planned: everything anonymous can do, plus create/edit/delete **own** rating & review (one per venue), submit venue proposals, report reviews, manage own account. Do not build against this row until the phase is scoped. |

- **Enforcement point:** the top of every server action — `requireAdmin()` before any logic runs. Route middleware guards `/admin` for UX only; it is **not** the security boundary (server actions re-check, always).
- **Default posture:** deny by default. Deny-all RLS on every table neutralizes the PostgREST surface; a new server action starts from "who may call this?" not "who shouldn't?".
- **Role escalation:** `role = admin` is set only by direct database access by the maintainer. No app surface — UI, action, or API — can grant or change roles. Signing in (including via password recovery) never grants it.
- **Ownership checks:** N/A in V1 (no member-owned content exists yet). Applies once the member phase ships — mutations on ratings/reviews must filter by `user_id = session user` in the query itself, not just an if-check before it.

---

## User Lifecycle & Management

V1 has no public signup — every account is an admin account, and each one is
provisioned individually by the maintainer. There's no fixed cap on how many
admin accounts exist; each is bootstrapped the same way.

| Stage | Decision |
|-------|----------|
| Account creation | Each admin account is created directly in the Supabase dashboard by the maintainer, not through the app. Its `profiles` row (`role: "admin"`) is likewise inserted only via direct DB access, one at a time, per person. |
| Password reset | Self-service via `/admin/sign-in` → "Forgot password?", or maintainer-triggered from the Supabase dashboard. See the Password recovery subsection above. |
| Account recovery | Same as password reset — recovery *is* the password-reset flow, per account. |
| Profile updates | Not exposed in V1 — no UI to change the admin's own email or display name. |
| Deactivation / deletion | Manual, dashboard-only (delete the Supabase Auth user and/or the `profiles` row). No self-service deletion exists because there's no member-facing account system yet. |
| Who administers users | The admin(s) (project maintainer, plus any trusted co-maintainer granted the role), via the Supabase dashboard. Role changes only via direct DB. |

*(The member lifecycle — signup, onboarding, profile changes, self-service
deletion — is planned for the post-V1 phase and intentionally not detailed
here until that phase is scoped.)*

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
- The strike system (`struck_at`) removes write access without destroying the account or its content — reversible, auditable moderation. Applies once the member phase ships; N/A in V1.
- Display-name changes are rate-limited to keep identities stable (anti-impersonation). Applies once the member phase ships; N/A in V1 (no display names exist).
- Admin sign-in and password-reset requests rely on Supabase Auth's own built-in rate limiting; there is no additional app-level limiter (single low-volume admin account, low abuse surface). Revisit if real abuse is ever observed — the pattern to copy is `assertProblemReportAllowed` in `lib/ratelimit.ts`.
- Admin accounts are the highest-value target in V1 — there are no other privileged accounts. The admin role grant lives only in the DB (never settable via sign-in or password reset, never self-service), and every admin action is attributable to a specific `auth.users.id`/`profiles` row even when more than one person holds the role.

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
- Never expose a user's email in any table, payload, page, or log — it lives in `auth.users` alone.
- Never add a social login — no social login is used anywhere in this project.
- Never let a successful sign-in (including password recovery) imply admin access — `requireAdmin()`'s `profiles.role = "admin"` check is the only source of authorization, always.
- Never log or persist a password, recovery token, or `token_hash`/`access_token` beyond what's needed to complete a single recovery request in the browser.
