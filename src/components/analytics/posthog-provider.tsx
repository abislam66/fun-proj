"use client";

import { PostHogProvider } from "posthog-js/react";
import type { ReactNode } from "react";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

/**
 * Product analytics (PostHog), alongside the existing pageview-only Vercel
 * Web Analytics in layout.tsx. Only ever mounted from
 * `src/app/(public)/layout.tsx` — never the root layout — so `/admin` and
 * `/auth/callback` get zero PostHog footprint by construction, not a
 * pathname check. Configured to match /about's privacy disclosure exactly;
 * see Context/decisions.md (2026-09-03, then widened 2026-09-04) for the
 * full rationale:
 *
 * - `api_host: "/ingest"` — proxied same-origin (next.config.ts rewrites),
 *   not PostHog's public host directly. Keeps every request first-party, so
 *   no CSP changes were needed. `ui_host` stays the real PostHog app URL —
 *   it's only used to build dashboard/toolbar links, never for requests.
 * - `persistence: "localStorage"` — PostHog's default sets a cookie
 *   (`localStorage+cookie`); this drops it so "a cookie only to keep you
 *   signed in" stays literally true.
 * - `autocapture: true` — clicks/changes/submits with element tag, class,
 *   and safe label text (e.g. "clicked button 'Halal'"). PostHog's
 *   autocapture never sends the typed *value* of an input/textarea/select,
 *   and always ignores `type="password"` — so this can't leak review text,
 *   search text, or report notes. It's also structurally blind to the map:
 *   venue pins are MapLibre canvas symbols, not DOM elements, which is why
 *   src/lib/analytics.ts adds an explicit `venue selected` event.
 * - `capture_pageview: "history_change"` — fires on every App Router route
 *   change (pathname-based), not just the initial full load; no manual
 *   usePathname effect needed, PostHog handles SPA navigation natively.
 * - `session_recording: { maskAllInputs: true }` — masks the typed value
 *   of every input/textarea keystroke-for-keystroke in replay (shown as
 *   `***`); ordinary page text (venue names, buttons) stays visible. Set
 *   explicitly even though it's already rrweb's default: an SDK-level
 *   `session_recording` option always wins over the dashboard's "Privacy
 *   and masking" project setting, so this stays true even if that setting
 *   ever drifts. `disable_session_recording: false` additionally requires
 *   the PostHog project's own "record user sessions" toggle to be on
 *   before anything actually gets recorded — a manual dashboard step, see
 *   decisions.md.
 *
 * No `posthog.identify()` is ever called anywhere in this app — every
 * visitor, signed in or not, stays an anonymous PostHog distinct_id. No
 * Supabase user id, display name, or email is ever passed to PostHog.
 *
 * Renders `children` untouched (PostHog never initializes) when
 * NEXT_PUBLIC_POSTHOG_KEY is unset — true for local dev and Preview, since
 * the key is only ever set in Vercel's Production environment. Zero
 * analytics footprint, zero network activity, outside Production.
 */
export function PostHogAnalyticsProvider({
  children,
}: {
  children: ReactNode;
}) {
  if (!POSTHOG_KEY) {
    return children;
  }

  return (
    <PostHogProvider
      apiKey={POSTHOG_KEY}
      options={{
        api_host: "/ingest",
        ui_host: POSTHOG_HOST,
        persistence: "localStorage",
        capture_pageview: "history_change",
        autocapture: true,
        disable_session_recording: false,
        session_recording: {
          maskAllInputs: true,
        },
      }}
    >
      {children}
    </PostHogProvider>
  );
}
