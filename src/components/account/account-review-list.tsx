"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteRating } from "@/actions/ratings";
import { StarRating } from "@/components/reviews/star-rating";
import { Button } from "@/components/ui/primitives";
import { formatRelativeDate } from "@/lib/relative-time";

export type AccountReview = {
  id: string;
  venueId: string;
  venueSlug: string;
  venueName: string;
  stars: number;
  reviewText: string | null;
  status: "active" | "removed";
  removedReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export function AccountReviewList({ reviews }: { reviews: AccountReview[] }) {
  if (reviews.length === 0) {
    return (
      <p className="reviews-empty">
        You haven&apos;t rated a place yet.{" "}
        <Link className="text-link" href="/">
          Find somewhere to eat
        </Link>
        .
      </p>
    );
  }

  return (
    <ul className="review-list account-review-list">
      {reviews.map((review) => (
        <AccountReviewItem key={review.id} review={review} />
      ))}
    </ul>
  );
}

function AccountReviewItem({ review }: { review: AccountReview }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const removed = review.status === "removed";

  async function remove() {
    setPending(true);
    setError(null);
    const result = await deleteRating({ venueId: review.venueId });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <li className={removed ? "review-item is-removed" : "review-item"}>
      <div className="review-item-head">
        <Link className="text-link" href={`/eat/${review.venueSlug}`}>
          <strong>{review.venueName}</strong>
        </Link>
        <StarRating readOnly value={review.stars} />
        <time dateTime={review.updatedAt}>
          {formatRelativeDate(review.updatedAt)}
        </time>
      </div>
      {review.reviewText ? <p>{review.reviewText}</p> : null}
      {removed ? (
        <p className="review-removed-note">
          Removed
          {review.removedReason ? ` — ${review.removedReason}` : ""}
        </p>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
      {removed ? null : (
        <div className="account-review-actions">
          <Link className="text-link" href={`/eat/${review.venueSlug}`}>
            Edit on venue page
          </Link>
          <Button
            disabled={pending}
            onClick={() => void remove()}
            variant="ghost"
          >
            Delete
          </Button>
        </div>
      )}
    </li>
  );
}
