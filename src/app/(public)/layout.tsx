import { PostHogAnalyticsProvider } from "@/components/analytics/posthog-provider";

/**
 * The *only* place PostHog gets mounted. `/admin` (its own nested layout,
 * `src/app/admin/layout.tsx`) and `/auth/callback` (a route handler, no UI)
 * both fall outside this route group, so `posthog.init()` is simply never
 * called in their component trees — no script load, no listeners, no
 * cookies, structurally, not by a runtime pathname check. See
 * `Context/decisions.md` (2026-09-04) for why that's deliberate: a
 * client-side opt-out would still race the SDK's synchronous initial
 * pageview and wouldn't detach already-attached autocapture listeners on an
 * in-app nav into `/admin`.
 */
export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <PostHogAnalyticsProvider>{children}</PostHogAnalyticsProvider>;
}
