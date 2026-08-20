"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  publishVenue,
  retireVenue,
  upsertVenue,
  verifyVenue,
} from "@/actions/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button, Input } from "@/components/ui/primitives";
import { CUISINES, type CuisineKey } from "@/config/cuisines";
import { ZONES, type ZoneKey } from "@/config/zones";
import type { VenueRow } from "@/lib/db/schema";
import { WEEKDAY_KEYS, type WeekdayKey } from "@/lib/hours";
import {
  EMPTY_VENUE_DRAFT,
  fromDraft,
  hasValidationErrors,
  toDraft,
  validateVenueDraft,
  type PaymentTriState,
  type VenueDraft,
  type VenueDraftErrors,
} from "@/lib/admin-venue-form";

const dayLabels: Record<WeekdayKey, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export function VenueEditor({ source }: { source?: VenueRow }) {
  return (
    <VenueEditorForm
      key={source ? `${source.id}:${source.updatedAt.toISOString()}` : "new"}
      source={source ? toDraft(source) : EMPTY_VENUE_DRAFT}
    />
  );
}

function VenueEditorForm({ source }: { source: VenueDraft }) {
  const router = useRouter();
  const isNew = !source.id;
  const [draft, setDraft] = useState(source);
  const [errors, setErrors] = useState<VenueDraftErrors>({});
  const [notice, setNotice] = useState("");
  const [noticeIsError, setNoticeIsError] = useState(false);
  const [pending, setPending] = useState(false);

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
            description="Used for filters and the venue detail page."
            title="Classification"
          >
            <Field error={errors.zoneKey} label="Campus zone" required>
              <select
                aria-invalid={Boolean(errors.zoneKey)}
                className="admin-select"
                onChange={(event) =>
                  setField("zoneKey", event.target.value as ZoneKey | "")
                }
                value={draft.zoneKey}
              >
                <option value="">Choose a zone</option>
                {Object.values(ZONES).map((zone) => (
                  <option key={zone.key} value={zone.key}>
                    {zone.label}
                  </option>
                ))}
              </select>
            </Field>
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
            description="Map editing is deferred. Phase 1 stores and reviews coordinates only."
            title="Location — deferred map field"
          >
            <div className="deferred-map-summary">
              <strong>No map controls yet</strong>
              <span>
                Coordinate summary: {draft.lat || "—"}, {draft.lng || "—"}
              </span>
            </div>
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
