import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { SiteHeader } from "@/components/layout/site-header";

/**
 * Shown instead of a venue's details when nobody is signed in. `next` is
 * this exact page's path, so a successful sign-in returns here rather than
 * to the homepage — never pass anything but an internal `/eat/...` path.
 */
export function SignInGate({
  next,
  venueName,
}: {
  next: string;
  venueName: string;
}) {
  return (
    <div className="public-page">
      <SiteHeader user={null} />
      <main className="detail-page">
        <section className="sign-in-gate">
          <h1>Sign in to explore this spot</h1>
          <p>
            Create a free account to see hours, menu, and location for{" "}
            {venueName}.
          </p>
          <GoogleSignInButton next={next} />
        </section>
      </main>
    </div>
  );
}
