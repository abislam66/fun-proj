import type { Metadata } from "next";

import { AccountProfileForm } from "@/components/account/account-profile-form";
import { AccountReviewList } from "@/components/account/account-review-list";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { SiteHeader } from "@/components/layout/site-header";
import { SignInGate } from "@/components/venues/sign-in-gate";
import { getUser } from "@/lib/auth";
import { listRatingsForUser } from "@/lib/db/queries";
import { formatClassYear } from "@/lib/profile";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const session = await getUser();
  if (!session) {
    return (
      <SignInGate
        message="Sign in to change your name, username, and class year, and to see every rating you've posted."
        next="/account"
        title="Sign in to open your account"
      />
    );
  }

  const reviews = await listRatingsForUser(session.id);
  const { displayName, username, graduationYear } = session.profile;
  const classYear = formatClassYear(graduationYear);

  return (
    <div className="public-page">
      <SiteHeader />
      <main className="about-page account-page">
        <p className="eyebrow">Your account</p>
        <h1>{displayName}</h1>
        <p className="account-meta">
          @{username}
          {classYear ? ` · ${classYear}` : " · Add your class year"}
        </p>

        <section>
          <h2>Profile</h2>
          <AccountProfileForm
            displayName={displayName}
            graduationYear={graduationYear}
            username={username}
          />
        </section>

        <section>
          <h2>Your ratings &amp; reviews</h2>
          <p>
            Everything you&apos;ve posted, including star-only ratings. Edit a
            review on its venue page, or delete it here.
          </p>
          <AccountReviewList
            reviews={reviews.map((review) => ({
              id: review.id,
              venueId: review.venueId,
              venueSlug: review.venueSlug,
              venueName: review.venueName,
              stars: review.stars,
              reviewText: review.reviewText,
              status: review.status,
              removedReason: review.removedReason,
              createdAt: review.createdAt.toISOString(),
              updatedAt: review.updatedAt.toISOString(),
            }))}
          />
        </section>

        <SignOutButton />
      </main>
    </div>
  );
}
