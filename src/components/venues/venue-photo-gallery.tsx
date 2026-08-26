import Image from "next/image";

import { venuePhotos } from "@/config/venue-photos";

/**
 * Horizontal snap-scroll strip of venue photos, mounted directly under
 * the detail hero. Renders nothing at all for venues without photos —
 * no placeholder frame (DESIGN.md: cards only when they hold content).
 */
export function VenuePhotoGallery({
  slug,
  venueName,
}: {
  slug: string;
  venueName: string;
}) {
  const photos = venuePhotos(slug);
  if (photos.length === 0) return null;

  return (
    <section aria-label={`Photos of ${venueName}`} className="detail-photos">
      <ul className="photo-strip">
        {photos.map((photo, index) => (
          <li className="photo-frame" key={photo.src}>
            <Image
              alt={photo.alt}
              className="photo-image"
              fill
              priority={index === 0}
              sizes="(min-width: 64rem) 20rem, 70vw"
              src={photo.src}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
