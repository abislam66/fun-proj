# LLM Integration

> **OpenOwls SDD** — Read by engineers and the AI coding assistant.
> Every OpenOwls project has an LLM layer. This file defines what the LLM is responsible for,
> how it is integrated, how prompts are designed, and how the results are evaluated.

---

## Status

**Deferred — no LLM layer exists yet, by explicit decision.** Phase 1 and 2 of `features.md` ship with **zero** LLM code, dependencies, prompts, or API keys anywhere in the codebase (see the non-goal in `overview.md` and the LLM conventions in `conventions.md`).

Activation is gated on **all four** of:

1. Feature Phases 1–2 are shipped and stable in production.
2. The sponsor (Rafiat) explicitly approves turning AI features on.
3. A budget decision: LLM API usage is **new spend**, which the "existing subscriptions only" constraint currently forbids — activating AI means consciously amending that constraint in `overview.md`.
4. This file's deferred sections are filled in and merged via PR *before* implementation starts.

**Until then, Claude Code must not:** add AI dependencies (`ai`, `@ai-sdk/*`, provider SDKs), create `src/lib/ai/`, add AI-related env vars, or build UI affordances that assume a future AI feature.

Everything below is the **pre-agreed shape** the feature takes *if* activated — recorded now so activation is a decision, not a design scramble.

---

## What the LLM Does

**Does (candidate features — Feature 17 in `features.md`):**
- **"What should I eat?"** — given the user's typed craving, recommend from venues that are *currently open*, using only site data (cuisines, student rating aggregates, zone). Output: a pick + one-sentence reason.
- **"Students say…"** — a short per-venue digest of student reviews (only where ≥ ~10 reviews exist), regenerated lazily when the review set changes, cached in the DB, always labeled as AI-generated from student reviews.

**Does not:**
- Never authors or edits site content — venues, reviews, ratings, and hours are human-written data; the LLM only summarizes or selects from them.
- Never moderates autonomously — it may someday *flag* for the queue, but a human makes every removal decision.
- Never receives PII — no emails, no display names (reviews are anonymized before sending), no IPs, no session data, no geolocation.
- Never runs client-side, and never exposes a general-purpose chat — it is a scoped tool with two jobs.
- Never blocks a core flow — every AI feature sits behind a flag, and the site is fully functional with it off.

---

## Model

| Setting | Value |
|---------|-------|
| Provider | Deferred to activation — abstracted behind the Vercel AI SDK, so this is config, not architecture. |
| Model | Small/fast tier (e.g., Claude Haiku class). Both tasks are short, structured, low-stakes generations — frontier reasoning is wasted here. Final ID chosen at activation against current offerings. |
| Why this model | Cost and latency dominate; the quality ceiling for "pick a lunch spot and say why" is low. |
| Swappable? | Yes — one provider/model config value via the AI SDK; prompts and Zod output schemas are provider-neutral. |

---

## Prompts

- **Location of prompts in code:** `src/lib/ai/prompts.ts` — the dedicated prompts module required by `conventions.md`; never inline.
- **System prompt summary:** "You are a concise campus food guide. Use only the venue data provided. If the request is unrelated to choosing food, decline briefly." Recommendations must reference only provided venues; digests must only restate what reviews actually say.
- **User/data payload:** for recommendations — the user's craving text (length-capped, plain text) + a JSON array of currently-open published venues (slug, name, cuisines, zone, student rating aggregate). For digests — the venue's active review texts with display names stripped.
- **Expected output format:** strict JSON validated with Zod (`{ venueSlug, reason }` for recommendations; `{ digest }` with a hard length cap for summaries). Non-conforming output is rejected, never rendered.

---

## Architecture

- **Where it lives:** `src/lib/ai/` behind a single route handler — nothing outside that directory imports it (pre-committed in `architecture-planning.md`).
- **Trigger / flow:** user-initiated only. Recommendation: user asks → route handler → open-venue query → LLM → Zod-validate → respond. Digest: first page view after the review set changes → generate → cache in DB → serve cached thereafter.
- **Provider abstraction:** Vercel AI SDK.

---

## Context & Token Management

| Setting | Value |
|---------|-------|
| Max input | Capped payload: top ~30 candidate venues (recommendations) / ~50 most recent reviews (digests) — roughly 2–4k tokens |
| Max output tokens | ~300 |
| Est. cost per call | Estimated at activation against then-current pricing; per-user daily caps (Postgres rate limiting, same mechanism as writes) bound total spend regardless. |

---

## Error Handling & Fallbacks

- Hard timeout (~10 s); one retry on malformed output, then fall back to the deterministic answer: top-rated currently-open venues (recommendations) / no digest section (summaries). The fallback is *good* — it must never feel like an error page.
- Zod-validate every response; reject anything that references a venue not in the payload (hallucination guard).
- Provider outage or rate limit → the AI affordance hides itself; nothing else on the page changes.
- Model output is rendered as plain text under the same XSS rules as user content — never as HTML.
- Every AI surface is labeled as AI-generated (disclosure is a Feature 17 acceptance criterion).

---

## Privacy & Safety

| Sent to LLM | Never sent |
|-------------|------------|
| Published venue data: names, cuisines, zones, student rating aggregates | Emails, display names, IP addresses/hashes, session identifiers |
| Review text with author identities stripped | User geolocation (never leaves the browser anyway — `auth-security.md`) |
| The user's typed craving (length-capped; UI notes not to include personal info) | Drafts, proposals, queues, or any admin/unpublished data |

---

## Evaluation

- **Success metric:** recommendation click-through (user opens the suggested venue's page) and a thumbs-up/down on digests; digest faithfulness spot-checks (no dishes or claims absent from the underlying reviews).
- **How measured:** first-party event counts in Postgres — no third-party analytics (consistent with the privacy disclosure in `auth-security.md`).

---

## Prompt Iteration Log

*Starts at activation — every prompt change gets a row.*

| Date | Change | Why | Result |
|------|--------|-----|--------|
| — | — | — | — |
