"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePostHog } from "posthog-js/react";

import { submitVenuePhoto } from "@/actions/photos";
import { Button } from "@/components/ui/primitives";
import {
  ALLOWED_VENUE_IMAGE_TYPES,
  MAX_VENUE_IMAGE_BYTES,
} from "@/config/site";
import { AnalyticsEvent } from "@/lib/analytics";

export function AddVenuePhotoForm({ venueId }: { venueId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const router = useRouter();
  const posthog = usePostHog();

  if (notice) {
    return (
      <p className="form-notice" role="status">
        {notice}
      </p>
    );
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="secondary">
        Add a photo
      </Button>
    );
  }

  return (
    <form
      className="add-photo-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const fileInput = form.elements.namedItem("file");
        if (!(fileInput instanceof HTMLInputElement) || !fileInput.files?.[0]) {
          setError("Choose a JPEG, PNG, or WebP image.");
          return;
        }
        const file = fileInput.files[0];
        if (file.size > MAX_VENUE_IMAGE_BYTES) {
          setError("Image must be under 5 MB.");
          return;
        }
        setPending(true);
        setError(null);
        const formData = new FormData();
        formData.set("venueId", venueId);
        formData.set("file", file);
        void submitVenuePhoto(formData).then((result) => {
          setPending(false);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          posthog.capture(AnalyticsEvent.PhotoSubmitted, { venue_id: venueId });
          setNotice("Thanks — we’ll review this photo before it goes live.");
          router.refresh();
        });
      }}
    >
      <label>
        <span>Menu board or storefront photo</span>
        <input
          accept={ALLOWED_VENUE_IMAGE_TYPES.join(",")}
          name="file"
          type="file"
        />
      </label>
      <p className="review-policy">
        JPEG, PNG, or WebP, under 5 MB. Photos are reviewed before they appear
        in the gallery.
      </p>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="review-composer-actions">
        <Button disabled={pending} type="submit">
          Submit photo
        </Button>
        <Button
          disabled={pending}
          onClick={() => setOpen(false)}
          variant="ghost"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
