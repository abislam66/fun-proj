"use client";

import { useEffect, useRef } from "react";
import { usePostHog } from "posthog-js/react";

/**
 * Fires a PostHog event once when this component mounts, then renders
 * nothing. For the handful of Server Components that need an
 * impression-style event (e.g. "sign in gate shown") without converting
 * the whole component to a Client Component just to call `usePostHog()`.
 */
export function AnalyticsBeacon({
  event,
  properties,
}: {
  event: string;
  properties?: Record<string, unknown>;
}) {
  const posthog = usePostHog();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    posthog.capture(event, properties);
  }, [event, properties, posthog]);

  return null;
}
