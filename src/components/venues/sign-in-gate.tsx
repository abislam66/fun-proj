import { AnalyticsBeacon } from "@/components/analytics/analytics-beacon";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { SiteHeader } from "@/components/layout/site-header";
import { AnalyticsEvent } from "@/lib/analytics";

/**
 * Shown instead of a venue's details (or the account page) when nobody is
 * signed in. `next` is this exact page's path, so a successful sign-in
 * returns here rather than to the homepage — never pass anything but an
 * internal path.
 */
export function SignInGate({
  next,
  venueName,
  title,
  message,
}: {
  next: string;
  venueName?: string;
  title?: string;
  message?: string;
}) {
  const heading = title ?? "Sign in to explore this spot";
  const body =
    message ??
    `Create a free account to see hours, menu, and location for ${venueName}.`;

  return (
    <div className="public-page">
      <AnalyticsBeacon
        event={AnalyticsEvent.SignInGateShown}
        properties={venueName ? { next, venue_name: venueName } : { next }}
      />
      <SiteHeader />
      <main className="detail-page">
        <section className="sign-in-gate">
          <h1>{heading}</h1>
          <p>{body}</p>
          <GoogleSignInButton next={next} />
        </section>
      </main>
    </div>
  );
}
