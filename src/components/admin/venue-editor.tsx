"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  deleteVenuePhoto,
  publishVenue,
  reorderVenuePhotos,
  retireVenue,
  uploadVenuePhoto,
  upsertVenue,
  verifyVenue,
} from "@/actions/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { VenueLocationPicker } from "@/components/admin/venue-location-picker";
import { Button, Input } from "@/components/ui/primitives";
import { CUISINES, type CuisineKey } from "@/config/cuisines";
import { MAP_ZONE_KEYS_SORTED, MAP_ZONES } from "@/config/map-zones";
import { ALLOWED_VENUE_IMAGE_TYPES, MAX_VENUE_PHOTOS } from "@/config/site";
import { movePhoto, movePhotoToFront } from "@/lib/admin-photo-order";
import type { AdminVenuePhoto } from "@/lib/db/queries";
import type { VenueRow } from "@/lib/db/schema";
import { WEEKDAY_KEYS, type WeekdayKey } from "@/lib/hours";
import {
  EMPTY_VENUE_DRAFT,
  fromDraft,
  hasValidationErrors,
  toDraft,
  validateVenueDraft,
  zoneMismatchWarning,
  type PaymentTriState,
  type VenueDraft,
  type VenueDraftErrors,
} from "@/lib/admin-venue-form";
import { OTHER_MAP_ZONE, type VenueMapZone } from "@/lib/venues";

const dayLabels: Record<WeekdayKey, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export function VenueEditor({
  source,
  photos = [],
}: {
  source?: VenueRow;
  photos?: AdminVenuePhoto[];
}) {
  return (
    <VenueEditorForm
      key={source ? `${source.id}:${source.updatedAt.toISOString()}` : "new"}
      initialPhotos={photos}
      source={source ? toDraft(source) : EMPTY_VENUE_DRAFT}
    />
  );
}

function VenueEditorForm({
  source,
  initialPhotos,
}: {
  source: VenueDraft;
  initialPhotos: AdminVenuePhoto[];
}) {
  const router = useRouter();
  const isNew = !source.id;
  const [draft, setDraft] = useState(source);
  const [errors, setErrors] = useState<VenueDraftErrors>({});
  const [notice, setNotice] = useState("");
  const [noticeIsError, setNoticeIsError] = useState(false);
  const [pending, setPending] = useState(false);
  const [photos, setPhotos] = useState<AdminVenuePhoto[]>(initialPhotos);
  const [photoPending, setPhotoPending] = useState(false);
  const zoneWarning = zoneMismatchWarning(draft);
  const atPhotoLimit = photos.length >= MAX_VENUE_PHOTOS;

  function setField<K extends keyof VenueDraft>(
    field: K,
    value: VenueDraft[K],
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setNotice("");
  }

  async function persist(forPublish = false): Promise<VenueDraft | null> {
    const nextErrors = validateVenueDraft(draft, forPublish);
    setErrors(nextErrors);
    if (hasValidationErrors(nextErrors)) {
      setNotice("Fix the highlighted fields before continuing.");
      setNoticeIsError(true);
      return null;
    }

    setPending(true);
    const result = await upsertVenue(fromDraft(draft));
    setPending(false);

    if (!result.ok) {
      setNotice(result.error);
      setNoticeIsError(true);
      return null;
    }

    const saved: VenueDraft = {
      ...draft,
      id: result.data.id,
      slug: result.data.slug,
    };
    setDraft(saved);
    return saved;
  }

  async function save() {
    const saved = await persist();
    if (!saved) return;
    setNotice("Saved.");
    setNoticeIsError(false);
    if (isNew) router.replace(`/admin/venues/${saved.id}`);
  }

  async function publish() {
    const saved = await persist(true);
    if (!saved) return;

    setPending(true);
    const result = await publishVenue({ id: saved.id });
    setPending(false);

    if (!result.ok) {
      setNotice(result.error);
      setNoticeIsError(true);
      return;
    }

    setDraft((current) => ({ ...current, status: "published" }));
    setNotice("Venue published.");
    setNoticeIsError(false);
    if (isNew) router.replace(`/admin/venues/${saved.id}`);
  }

  async function retire() {
    const saved = await persist();
    if (!saved) return;

    setPending(true);
    const result = await retireVenue({ id: saved.id });
    setPending(false);

    if (!result.ok) {
      setNotice(result.error);
      setNoticeIsError(true);
      return;
    }

    setDraft((current) => ({ ...current, status: "retired" }));
    setNotice("Venue retired.");
    setNoticeIsError(false);
  }

  async function verify() {
    const saved = await persist();
    if (!saved) return;

    setPending(true);
    const result = await verifyVenue({ id: saved.id });
    setPending(false);

    if (!result.ok) {
      setNotice(result.error);
      setNoticeIsError(true);
      return;
    }

    setDraft((current) => ({
      ...current,
      lastVerifiedAt: result.data.lastVerifiedAt,
    }));
    setNotice("Venue marked verified just now.");
    setNoticeIsError(false);
  }

  async function uploadPhoto(file: File) {
    if (!draft.id || atPhotoLimit) return;
    setPhotoPending(true);
    const formData = new FormData();
    formData.set("id", draft.id);
    formData.set("file", file);
    const result = await uploadVenuePhoto(formData);
    setPhotoPending(false);

    if (!result.ok) {
      setNotice(result.error);
      setNoticeIsError(true);
      return;
    }
    setPhotos((current) => [...current, result.data.photo]);
    setNotice("Photo uploaded.");
    setNoticeIsError(false);
  }

  async function removePhoto(photoId: string) {
    if (!draft.id) return;
    setPhotoPending(true);
    const result = await deleteVenuePhoto({ venueId: draft.id, photoId });
    setPhotoPending(false);

    if (!result.ok) {
      setNotice(result.error);
      setNoticeIsError(true);
      return;
    }
    setPhotos((current) => current.filter((photo) => photo.id !== photoId));
    setNotice("Photo removed.");
    setNoticeIsError(false);
  }

  async function applyPhotoOrder(nextOrder: string[]) {
    if (!draft.id) return;
    setPhotoPending(true);
    const result = await reorderVenuePhotos({
      venueId: draft.id,
      photoIds: nextOrder,
    });
    setPhotoPending(false);

    if (!result.ok) {
      setNotice(result.error);
      setNoticeIsError(true);
      return;
    }
    setPhotos(result.data.photos);
  }

  function movePhotoUpDown(photoId: string, direction: "up" | "down") {
    void applyPhotoOrder(
      movePhoto(
        photos.map((photo) => photo.id),
        photoId,
        direction,
      ),
    );
  }

  function makeCoverPhoto(photoId: string) {
    void applyPhotoOrder(
      movePhotoToFront(
        photos.map((photo) => photo.id),
        photoId,
      ),
    );
  }

  function toggleCuisine(cuisine: CuisineKey) {
    const selected = draft.cuisines.includes(cuisine);
    setField(
      "cuisines",
      selected
        ? draft.cuisines.filter((item) => item !== cuisine)
        : [...draft.cuisines, cuisine],
    );
  }

  function updateHours(
    day: WeekdayKey,
    field: "open" | "close",
    value: string,
  ) {
    const current = draft.hours[day]?.[0] ?? { open: "10:30", close: "18:00" };
    setField("hours", {
      ...draft.hours,
      [day]: [{ ...current, [field]: value }],
    });
  }

  function toggleDay(day: WeekdayKey, open: boolean) {
    const next = { ...draft.hours };
    if (open) {
      next[day] = [{ open: "10:30", close: "18:00" }];
    } else {
      delete next[day];
    }
    setField("hours", next);
  }

  return (
    <AdminShell>
      <div className="editor-heading">
        <div>
          <Link className="back-link" href="/admin">
            ← Back to venues
          </Link>
          <p className="eyebrow">{isNew ? "New venue" : draft.slug}</p>
          <h1>{isNew ? "Add venue" : draft.name}</h1>
          <div className="editor-meta">
            <span className={`admin-status status-${draft.status}`}>
              {draft.status}
            </span>
            <span>
              {draft.lastVerifiedAt
                ? `Verified ${new Date(draft.lastVerifiedAt).toLocaleDateString()}`
                : "Never verified"}
            </span>
          </div>
        </div>
        <div className="editor-actions">
          {!isNew ? (
            <Button disabled={pending} onClick={verify} variant="secondary">
              Mark verified
            </Button>
          ) : null}
          <Button disabled={pending} onClick={save} variant="secondary">
            {pending ? "Saving…" : "Save draft"}
          </Button>
          {draft.status !== "published" ? (
            <Button disabled={pending} onClick={publish}>
              {pending ? "Saving…" : "Publish"}
            </Button>
          ) : null}
          {draft.status === "published" ? (
            <Button disabled={pending} onClick={retire} variant="ghost">
              Retire venue
            </Button>
          ) : null}
        </div>
      </div>

      {notice ? (
        <div
          className={
            noticeIsError ? "admin-notice admin-notice-error" : "admin-notice"
          }
          role="status"
        >
          {notice}
        </div>
      ) : null}

      <form
        className="venue-editor"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="editor-column">
          <EditorSection
            description="Core public-facing details."
            title="Venue details"
          >
            <div className="admin-field-grid">
              <Field error={errors.name} label="Venue name" required>
                <Input
                  aria-invalid={Boolean(errors.name)}
                  onChange={(event) => setField("name", event.target.value)}
                  value={draft.name}
                />
              </Field>
              <Field label="Venue type">
                <select
                  className="admin-select"
                  onChange={(event) =>
                    setField("type", event.target.value as VenueDraft["type"])
                  }
                  value={draft.type}
                >
                  <option value="truck">Food truck</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="cafe">Cafe</option>
                  <option value="vending">Vending</option>
                  <option value="convenience">Convenience store</option>
                </select>
              </Field>
            </div>
            <Field label="Description">
              <textarea
                className="admin-textarea"
                maxLength={500}
                onChange={(event) =>
                  setField("description", event.target.value)
                }
                rows={4}
                value={draft.description}
              />
            </Field>
          </EditorSection>

          <EditorSection
            description="Shown at the top of the venue's public page. The cover photo (first) is used as the priority image."
            title={`Photos (${photos.length} / ${MAX_VENUE_PHOTOS})`}
          >
            {isNew ? (
              <p className="admin-inline-note">
                Save the venue once before adding photos.
              </p>
            ) : (
              <div className="admin-photo-field">
                {photos.length === 0 ? (
                  <p className="admin-inline-note">No photos yet.</p>
                ) : (
                  <ul className="admin-photo-grid">
                    {photos.map((photo, index) => (
                      <li className="admin-photo-item" key={photo.id}>
                        <div className="admin-photo-thumb-wrap">
                          {/* eslint-disable-next-line @next/next/no-img-element -- admin-only preview, not the public page */}
                          <img
                            alt={photo.alt}
                            className="admin-photo-thumb"
                            src={photo.url}
                          />
                          {index === 0 ? (
                            <span className="admin-photo-cover-badge">
                              Cover
                            </span>
                          ) : null}
                        </div>
                        <div className="admin-photo-item-actions">
                          <Button
                            aria-label="Move photo earlier"
                            disabled={photoPending || index === 0}
                            onClick={() => movePhotoUpDown(photo.id, "up")}
                            type="button"
                            variant="ghost"
                          >
                            ↑
                          </Button>
                          <Button
                            aria-label="Move photo later"
                            disabled={
                              photoPending || index === photos.length - 1
                            }
                            onClick={() => movePhotoUpDown(photo.id, "down")}
                            type="button"
                            variant="ghost"
                          >
                            ↓
                          </Button>
                          {index !== 0 ? (
                            <Button
                              disabled={photoPending}
                              onClick={() => makeCoverPhoto(photo.id)}
                              type="button"
                              variant="ghost"
                            >
                              Make cover
                            </Button>
                          ) : null}
                          <Button
                            disabled={photoPending}
                            onClick={() => removePhoto(photo.id)}
                            type="button"
                            variant="ghost"
                          >
                            Remove
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="admin-image-actions">
                  <label
                    className={`button button-secondary admin-image-upload${
                      atPhotoLimit ? " is-disabled" : ""
                    }`}
                  >
                    {photoPending ? "Uploading…" : "Add photo"}
                    <input
                      accept={ALLOWED_VENUE_IMAGE_TYPES.join(",")}
                      className="sr-only"
                      disabled={photoPending || atPhotoLimit}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) void uploadPhoto(file);
                      }}
                      type="file"
                    />
                  </label>
                </div>
                <p className="admin-inline-note">
                  {atPhotoLimit
                    ? `Maximum of ${MAX_VENUE_PHOTOS} photos reached — remove one to add another.`
                    : "JPEG, PNG, or WebP — up to 5 MB each."}
                </p>
              </div>
            )}
          </EditorSection>

          <EditorSection
            description="Used for filters and the venue detail page."
            title="Classification"
          >
            <Field error={errors.mapZone} label="Map zone" required>
              <select
                aria-invalid={Boolean(errors.mapZone)}
                className="admin-select"
                onChange={(event) =>
                  setField("mapZone", event.target.value as VenueMapZone | "")
                }
                value={draft.mapZone}
              >
                <option value="">Choose a zone</option>
                {MAP_ZONE_KEYS_SORTED.map((key) => (
                  <option key={key} value={key}>
                    {MAP_ZONES[key].label}
                  </option>
                ))}
                <option value={OTHER_MAP_ZONE}>
                  Other / Outside mapped zones
                </option>
              </select>
            </Field>
            {zoneWarning ? (
              <p className="admin-zone-warning">{zoneWarning}</p>
            ) : null}
            <fieldset className="admin-fieldset">
              <legend>Cuisines</legend>
              <div className="admin-check-grid">
                {Object.values(CUISINES).map((cuisine) => (
                  <label key={cuisine.key}>
                    <input
                      checked={draft.cuisines.includes(cuisine.key)}
                      onChange={() => toggleCuisine(cuisine.key)}
                      type="checkbox"
                    />
                    {cuisine.label}
                  </label>
                ))}
              </div>
              {errors.cuisines ? (
                <span className="admin-field-error">{errors.cuisines}</span>
              ) : null}
            </fieldset>
            <fieldset className="admin-fieldset">
              <legend>Dietary</legend>
              <div className="admin-check-grid">
                <label>
                  <input
                    checked={draft.isHalal}
                    onChange={(event) =>
                      setField("isHalal", event.target.checked)
                    }
                    type="checkbox"
                  />
                  Halal
                </label>
                <label>
                  <input
                    checked={draft.isVeganFriendly}
                    onChange={(event) =>
                      setField("isVeganFriendly", event.target.checked)
                    }
                    type="checkbox"
                  />
                  Vegan Friendly
                </label>
              </div>
            </fieldset>
          </EditorSection>

          <EditorSection
            description="Unknown is different from no and remains visible to editors."
            title="Payments"
          >
            <div className="admin-field-grid">
              <PaymentField
                label="Accepts cash"
                onChange={(value) => setField("acceptsCash", value)}
                value={draft.acceptsCash}
              />
              <PaymentField
                label="Accepts card"
                onChange={(value) => setField("acceptsCard", value)}
                value={draft.acceptsCard}
              />
            </div>
          </EditorSection>
        </div>

        <div className="editor-column">
          <EditorSection
            description="Click the map or drag the pin, or type exact coordinates below."
            title="Location"
          >
            <VenueLocationPicker
              lat={
                Number.isFinite(Number(draft.lat)) ? Number(draft.lat) : null
              }
              lng={
                Number.isFinite(Number(draft.lng)) ? Number(draft.lng) : null
              }
              onChange={(lat, lng) => {
                setField("lat", lat.toFixed(6));
                setField("lng", lng.toFixed(6));
              }}
            />
            <div className="admin-field-grid">
              <Field error={errors.lat} label="Latitude" required>
                <Input
                  aria-invalid={Boolean(errors.lat)}
                  inputMode="decimal"
                  onChange={(event) => setField("lat", event.target.value)}
                  value={draft.lat}
                />
              </Field>
              <Field error={errors.lng} label="Longitude" required>
                <Input
                  aria-invalid={Boolean(errors.lng)}
                  inputMode="decimal"
                  onChange={(event) => setField("lng", event.target.value)}
                  value={draft.lng}
                />
              </Field>
              <Field label="Nearby building or landmark">
                <Input
                  onChange={(event) => setField("building", event.target.value)}
                  placeholder="Student Center"
                  value={draft.building}
                />
              </Field>
              <Field label="Floor">
                <Input
                  onChange={(event) => setField("floor", event.target.value)}
                  value={draft.floor}
                />
              </Field>
            </div>
          </EditorSection>

          <EditorSection
            description="Hours are local campus wall-clock times. One range per day here."
            title="Hours"
          >
            <label className="hours-known-toggle">
              <input
                checked={draft.hoursKnown}
                onChange={(event) =>
                  setField("hoursKnown", event.target.checked)
                }
                type="checkbox"
              />
              Posted hours are known
            </label>
            {draft.hoursKnown ? (
              <div className="admin-hours">
                {WEEKDAY_KEYS.map((day) => {
                  const range = draft.hours[day]?.[0];
                  return (
                    <div className="admin-hours-row" key={day}>
                      <label className="day-toggle">
                        <input
                          checked={Boolean(range)}
                          onChange={(event) =>
                            toggleDay(day, event.target.checked)
                          }
                          type="checkbox"
                        />
                        {dayLabels[day]}
                      </label>
                      {range ? (
                        <>
                          <input
                            aria-label={`${dayLabels[day]} opening time`}
                            onChange={(event) =>
                              updateHours(day, "open", event.target.value)
                            }
                            type="time"
                            value={range.open}
                          />
                          <span>to</span>
                          <input
                            aria-label={`${dayLabels[day]} closing time`}
                            onChange={(event) =>
                              updateHours(day, "close", event.target.value)
                            }
                            type="time"
                            value={range.close}
                          />
                        </>
                      ) : (
                        <span className="hours-closed">Closed</span>
                      )}
                    </div>
                  );
                })}
                {errors.hours ? (
                  <span className="admin-field-error">{errors.hours}</span>
                ) : null}
              </div>
            ) : (
              <p className="admin-inline-note">
                Public UI will display &ldquo;Hours unknown.&rdquo;
              </p>
            )}
          </EditorSection>
        </div>
      </form>
    </AdminShell>
  );
}

function EditorSection({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="editor-section">
      <div className="editor-section-heading">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="editor-section-body">{children}</div>
    </section>
  );
}

function Field({
  children,
  error,
  label,
  required = false,
}: {
  children: React.ReactNode;
  error?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="admin-field">
      <span>
        {label}
        {required ? <small>Required</small> : null}
      </span>
      {children}
      {error ? <em className="admin-field-error">{error}</em> : null}
    </label>
  );
}

function PaymentField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: PaymentTriState) => void;
  value: PaymentTriState;
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <select
        className="admin-select"
        onChange={(event) => onChange(event.target.value as PaymentTriState)}
        value={value}
      >
        <option value="unknown">Unknown</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </label>
  );
}
