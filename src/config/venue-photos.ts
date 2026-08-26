/**
 * Frontend-only photo registry for venue detail pages. There is no photo
 * backend by explicit decision (no DB column, no storage bucket, no
 * upload path — see Context/decisions.md): image files are committed
 * under `public/photos/<slug>/` and listed here, keyed by the venue's
 * immutable published slug.
 *
 * Every entry needs real alt text — photos are content, not decoration.
 */

export type VenuePhoto = {
  /** App-relative path under public/, e.g. "/photos/sunny-halal-food/cart.jpg". */
  src: string;
  /** What the photo shows, for screen readers and failed loads. */
  alt: string;
};

export const VENUE_PHOTOS: Record<string, VenuePhoto[]> = {
  // TEMP: labeled placeholders so the gallery can be previewed before any
  // real photos exist. Remove this entry (and public/photos/_placeholders/)
  // once real photos land.
  "7-eleven": [
    {
      src: "/photos/_placeholders/placeholder-1.png",
      alt: "Placeholder image 1",
    },
    {
      src: "/photos/_placeholders/placeholder-2.png",
      alt: "Placeholder image 2",
    },
    {
      src: "/photos/_placeholders/placeholder-3.png",
      alt: "Placeholder image 3",
    },
  ],
};

export function venuePhotos(slug: string): VenuePhoto[] {
  return VENUE_PHOTOS[slug] ?? [];
}
