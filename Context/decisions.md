# Decisions

> Append-only log of decisions too small for a `Specs/` change but important enough
> that silently reversing them would cause confusion. Newest first. Not a roadmap
> (`Context/backlog.md`) and not a changelog (`Context/progress.md`) — this is the
> **why**, for things that don't fit either.

---

## 2026-08-18 — Admin accounts bootstrapped via Supabase dashboard "Add User", not email

The custom-SMTP (Resend) password-recovery path built earlier the same day
proved unreliable in practice: Supabase's Auth Logs showed repeated
`535 "Invalid username"` SMTP authentication failures against Resend, with
exactly one confirmed `200` success sandwiched in between many failures —
never fully root-caused (the SMTP username field kept reverting or
mismatching between saves; possibly compounded by a browser extension
already known to interfere with form fields on this machine, per the
`fdprocessedid` hydration issue fixed earlier). Rather than keep debugging a
flaky third-party mail pipeline just to get a *first* admin password set,
switched to a strictly simpler bootstrap: Supabase Dashboard → Authentication
→ Users → **Add User** exposes a direct password field + "Auto Confirm User"
checkbox on user creation — no email involved at all.

The site owner's account was recreated this way, deliberately using a
personal Gmail (`abislam64@gmail.com`) instead of the original
`tur67594@temple.edu` — allowed, since admin identity in this app was never
domain-restricted (only the old, now-removed OTP flow was). The old
`auth.users` row was deleted; its `profiles` row (same id) became orphaned
and was deleted and replaced with a fresh row for the new `auth.users.id`,
same `display_name` ("TuEats Team"), `role: "admin"`.

**Why noting this:** the app also has a working self-service "Forgot
password?" flow (`/admin/reset-password`, `Context/decisions.md`'s earlier
entry the same day) that depends on this same SMTP config actually working.
That flow's code is correct and tested — the SMTP delivery layer underneath
it just isn't reliably configured yet. Don't assume "Forgot password?" works
in production without re-verifying the Resend/SMTP setup independently.

**How to apply:** bootstrap every future admin account (starting with the
site owner's friend, pending as of this entry) the same no-email way — Add
User with a password, then a direct DB insert into `profiles` with
`role: "admin"` for that user's id. This is the standard mechanism now, not
a one-off workaround; keep using it unless the SMTP/Resend setup is
confirmed reliable end-to-end first.

---

## 2026-08-18 — Password recovery: client-side token exchange, no callback route restored

The first real-world password reset (dashboard-triggered "Send Password
Recovery") landed on the homepage with no way to set a new password. Root
cause: Supabase puts recovery tokens in the URL **fragment**
(`#access_token=...&type=recovery`) for dashboard-triggered resets, and a
server (route handler, middleware, Server Component) never receives the
fragment at all — it's stripped by the browser before the request is sent.
Nothing in the app was reading it, so the tokens were just sitting unused in
the URL bar.

Fixed without restoring the old `/auth/callback` route: `/admin/reset-password`
(`reset-password-form.tsx`) is a client component that reads the fragment (or
a `?token_hash=` query param, defensively, in case the email template is ever
customized to the newer style) and calls `supabase.auth.setSession()` /
`verifyOtp()` **client-side** — there's no way around this being client-side
for the fragment case, since the server structurally cannot see it. The
actual password write still goes through a server action
(`updateAdminPassword`), keeping the mutation itself server-side per the
single-write-path rule; only the session bootstrap is client-side, and only
because Supabase's own token delivery mechanism leaves no alternative.

Also added: a "Forgot password?" self-service trigger on `/admin/sign-in`
(`requestPasswordReset` → `resetPasswordForEmail`, redirect target
`/admin/reset-password`), and `src/components/auth/recovery-redirect.tsx` — a
tiny client component mounted in the root layout that forwards stray recovery
tokens found on *any* page to `/admin/reset-password`. This exists because
Supabase's dashboard-triggered reset has no field to specify a redirect
target — it always uses the project's Site URL (this app's homepage) — so
without this safety net, a maintainer using the dashboard's own "Reset
Password" button (rather than the in-app link) would hit the exact bug just
fixed, again.

**Why noting this:** the fragment-vs-query token distinction is easy to
re-break — if anyone in the future decides `/auth/confirm` or a similar
route handler is needed, remember it will only ever catch the query-param
case; the fragment case is not fixable server-side, full stop.

**How to apply:** don't move the token-reading logic into a route handler
expecting it to catch every case. Don't remove `recovery-redirect.tsx`
without confirming the Supabase project's Site URL and dashboard-reset
behavior no longer route recovery tokens to a non-recovery page.

---

## 2026-08-18 — Admin auth switched from OTP/magic-link to email + password

Replaced the admin sign-in flow entirely: `signInAdmin(email, password)` via
`supabase.auth.signInWithPassword()`, no more `requestSignup`/OTP, no more
`/auth/callback` route handler (deleted — it existed solely for OTP code
exchange). Added `signOutAdmin()` and a "Sign out" control in the admin header
(previously missing entirely). Dropped the now-unused `otp_requests` table via
a proper migration (`drizzle/0002_drop_otp_requests.sql`), not a hand-edit of
past migrations.

**Why:** the OTP flow never worked end-to-end this session — `auth.users.last_sign_in_at`
stayed `null` across every real attempt. Root cause: Supabase's default PKCE
flow requires the `code_verifier` cookie set when the link is *requested* to
still be present when it's *clicked* — which fails if the email is opened on a
different device/browser than the one used to sign in (common — people check
email on their phone), and separately is vulnerable to corporate link-scanners
(Office 365 Safe Links, common on `.edu` tenants) pre-fetching and consuming
the single-use code. Password auth has neither failure mode: the whole
exchange happens in one request, no second device, no clickable link to
pre-fetch.

This was a deliberate, explicit product-owner decision (not a quick fix) that,
at the time, contradicted `Specs/auth-security.md`'s text (email-OTP-only, no
password, for every user). The owner has since given explicit permission to
update that spec, and it now reflects this reality: public browsing stays
anonymous, a future phase may add verified `@temple.edu` **student** accounts
via OTP for ratings/reviews (not implemented — see `Context/backlog.md`), and
**admin** specifically is email/password.

**How to apply:** authorization is unchanged — `requireAdmin()` still requires
a `profiles` row with `role: "admin"`, granted only by direct DB access, and a
successful password sign-in never implies admin access on its own. Don't
reintroduce OTP/magic-link code without revisiting this decision. The admin
account's password is never known to or handled by app code — it's set via
the Supabase dashboard (see the account-bootstrap note in the same session's
progress entry).

---

## 2026-08-18 — Admin role grant stays manual DB-only, even post-cutover

`Specs/auth-security.md:57` says role escalation to `admin` happens only via direct
database access by the maintainer — no app surface may grant it. That's still true
after this session's admin cutover to real Supabase OTP auth: signing in for real
only creates a Supabase `auth.users` row and lets `requestSignup`/`/auth/callback`
issue a session. It does **not** create a `profiles` row, and without one
`getUser()` (`src/lib/auth.ts:60-68`) treats the session as unauthenticated for
authorization purposes. `requireAdmin()` will throw `AuthError` for a real,
successfully-signed-in user until a `profiles` row with `role: 'admin'` exists for
their `auth.users.id`.

**Why:** this is the specced mechanism, not a gap — "no app surface can grant admin"
is a deliberate security boundary (auth-security.md:57), not an oversight.

**How to apply:** after the site owner signs in once via `/admin/sign-in` with a
real `@temple.edu` address, look up their id (`select id from auth.users where
email = '...'`, reachable over the same `DATABASE_URL` connection Drizzle already
uses — no service-role key needed) and insert their `profiles` row directly via
SQL, `role: 'admin'`. Until that row exists, `/admin` shows a plain "your account
isn't an admin yet" message (`src/components/admin/access-denied.tsx`) instead of
crashing.

---

## 2026-08-18 — `.next/cache` + `revalidateTag`: any out-of-band DB write needs a manual cache clear

Direct SQL writes to `venues` (bypassing `src/actions/admin.ts`) don't trigger
`revalidateTag("venues")`. Next's on-disk incremental cache (`.next/cache`) then
keeps serving whatever `getPublishedVenues()`/`getVenueBySlug()` returned on the
*first* call after the dev server started — even across dev-server restarts, since
the cache persists to disk, not just memory. Hit this directly this session: an
out-of-band `UPDATE venues SET status='published'` left the public homepage
showing stale (in one case, empty) results until `.next/cache` was deleted by hand.

**Why noting this at all:** the fix (`rm -rf .next` + restart) is trivial once you
know the cause, but the symptom looks exactly like a broken query or a wrong DB
connection, and cost real time to diagnose.

**How to apply:** any future write to `venues`/`profiles`/`problem_reports` that
doesn't go through a real server action (ad hoc SQL, a one-off script, a Supabase
dashboard edit) needs an explicit `.next/cache` clear before the public site will
reflect it. Writes through `src/actions/admin.ts` don't have this problem — they
already call `revalidateTag` correctly.

---

## 2026-08-18 — KML seed source: live Google My Maps URL → local `TuEats.kml` file

`scripts/seed-kml.ts` used to fetch Temple's public My Maps KML export live
(`Specs/domain-knowledge.md:89,102` — `mid=1kFf5IaeeXiFpn_UHIyd4UqwHj90`, documented
there as "~40 placemarks"). That map turned out to be a smaller, older snapshot (31
unique names on inspection) than the one actually being curated — a separate,
more complete Google My Maps export manually saved to `TuEats.kml` at the repo
root (75 placemarks, including chains like Chick-fil-A/BurgerFi/Saladworks/7-Eleven
that the live URL's map didn't have at all). The script now reads that local file
instead of fetching the live URL.

**Why:** completeness over automatic freshness — the live URL would keep silently
missing venues that were only ever added to the newer map.

**How to apply:** re-export from Google My Maps (File → Download → KML) and
overwrite `TuEats.kml` whenever the source map changes, then re-run `pnpm
seed:kml` — it's idempotent (dedupes by exact name or ~15m coordinate proximity,
per `Specs/domain-knowledge.md`'s gyro-truck-dedup rule) so re-running is safe.
**Not yet updated:** `Specs/domain-knowledge.md:89,102` still documents the old
live URL as current — `Specs/` isn't touched without explicit instruction
(`CLAUDE.md:11`), so this is flagged here rather than silently fixed. Worth an
explicit spec-update pass at some point.

---

## 2026-08-18 — 22 of the 69 seeded venues were published via direct SQL, not `publishVenue()`

Before the admin cutover existed, 22 KML-seeded draft venues were flipped to
`status: 'published'` with a raw SQL `UPDATE`, at the site owner's explicit choice,
specifically to see real data on the site without first building full real admin
auth (which needed a `@temple.edu` email that wasn't confirmed available yet).
Superseded later the same session once the real admin cutover shipped — the
remaining 47 (from the fuller local KML re-seed) were also published this way
before the cutover finished landing.

**Why noting this:** none of these 69 venues have ever been through
`src/actions/admin.ts`'s `upsertVenue`/`publishVenue` path — they exist in the DB
exactly as the seed script inserted them (plus the direct status flip), with no
`revalidateTag` history and no admin-reviewed content. They're real rows, not
placeholders, but they haven't been "published" in the sense the write-path
implies (validated, reviewed, enrichable).

**How to apply:** no action needed structurally — the real admin UI now works and
any future publish/edit goes through the proper path. Just don't assume these 69
rows were ever admin-reviewed; treat them as raw seed data pending enrichment
(tracked in `Context/backlog.md`).
