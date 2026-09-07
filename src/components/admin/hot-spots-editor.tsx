"use client";

import { useMemo, useState } from "react";

import { updateHotSpots } from "@/actions/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { HOT_SPOTS_MAX } from "@/config/site";

type VenueOption = { id: string; name: string };

/**
 * Admin editor for the "Hot Spots This Week" voting ballot — the set of
 * venues students can upvote/downvote on the home Hot Spots tab. Up to
 * `HOT_SPOTS_MAX` slots, each a published-venue picker; save replaces the
 * whole `hot_spots` table via the `updateHotSpots` action. The slot order
 * is only the tie-breaker — live votes decide the actual ranking. Leaving
 * every slot empty falls back to the `HOT_SPOTS_THIS_WEEK` config list.
 */
export function HotSpotsEditor({
  initialVenueIds,
  venues,
}: {
  initialVenueIds: string[];
  venues: VenueOption[];
}) {
  const [slots, setSlots] = useState<string[]>(() =>
    Array.from(
      { length: HOT_SPOTS_MAX },
      (_, index) => initialVenueIds[index] ?? "",
    ),
  );
  const [notice, setNotice] = useState("");
  const [noticeIsError, setNoticeIsError] = useState(false);
  const [pending, setPending] = useState(false);

  const nameById = useMemo(
    () => new Map(venues.map((venue) => [venue.id, venue.name])),
    [venues],
  );

  const picks = slots.filter(Boolean);
  const duplicate = new Set(picks).size !== picks.length;
  const dirty = picks.join(",") !== initialVenueIds.join(",");

  function setSlot(index: number, value: string) {
    setSlots((current) =>
      current.map((slot, slotIndex) => (slotIndex === index ? value : slot)),
    );
    setNotice("");
  }

  async function save() {
    setNotice("");
    if (duplicate) {
      setNoticeIsError(true);
      setNotice("Remove the duplicate pick before saving.");
      return;
    }
    setPending(true);
    const result = await updateHotSpots({ venueIds: picks });
    setPending(false);
    if (!result.ok) {
      setNoticeIsError(true);
      setNotice(result.error);
      return;
    }
    setNoticeIsError(false);
    setNotice(
      picks.length > 0
        ? `Saved — ${picks.length} venue${picks.length === 1 ? "" : "s"} on the board.`
        : "Board cleared — the home page now shows the built-in list.",
    );
  }

  return (
    <AdminShell>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">Home page</p>
          <h1>Hot Spots This Week</h1>
          <p>
            Choose up to {HOT_SPOTS_MAX} published venues for this week&rsquo;s
            voting ballot. Students upvote/downvote them on the home Hot Spots
            tab and the list re-ranks by score; slot order here is just the
            tie-breaker. Leave every slot empty to fall back to the built-in
            list.
          </p>
        </div>
        <div className="admin-heading-actions">
          <a
            className="admin-public-link"
            href="/?view=hotspots"
            rel="noreferrer"
            target="_blank"
          >
            Preview on site ↗
          </a>
        </div>
      </div>

      {notice ? (
        <p
          className={
            noticeIsError ? "admin-notice admin-notice-error" : "admin-notice"
          }
          role="status"
        >
          {notice}
        </p>
      ) : null}

      <section className="admin-panel">
        <ol className="hot-spots-editor-list">
          {slots.map((value, index) => {
            const takenElsewhere = new Set(
              slots.filter((slot, slotIndex) => slot && slotIndex !== index),
            );
            return (
              <li className="hot-spots-editor-row" key={index}>
                <span aria-hidden="true" className="hot-spots-editor-rank">
                  #{index + 1}
                </span>
                <label className="hot-spots-editor-field">
                  <span className="sr-only">Hot spot #{index + 1}</span>
                  <select
                    className="admin-select"
                    onChange={(event) => setSlot(index, event.target.value)}
                    value={value}
                  >
                    <option value="">&mdash; empty &mdash;</option>
                    {venues.map((venue) => (
                      <option
                        disabled={takenElsewhere.has(venue.id)}
                        key={venue.id}
                        value={venue.id}
                      >
                        {venue.name}
                        {takenElsewhere.has(venue.id)
                          ? " (already picked)"
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
                {value ? (
                  <button
                    className="admin-row-action"
                    onClick={() => setSlot(index, "")}
                    type="button"
                  >
                    Clear
                  </button>
                ) : null}
              </li>
            );
          })}
        </ol>

        {duplicate ? (
          <p className="admin-field-error">
            {`"${nameById.get(picks.find((id, i) => picks.indexOf(id) !== i) ?? "") ?? "A venue"}" is picked twice — each venue can appear only once.`}
          </p>
        ) : null}

        <div className="editor-actions">
          <button
            className="button button-primary"
            disabled={pending || duplicate || !dirty}
            onClick={() => void save()}
            type="button"
          >
            {pending ? "Saving…" : "Save board"}
          </button>
          {slots.some(Boolean) ? (
            <button
              className="button button-secondary"
              disabled={pending}
              onClick={() => {
                setSlots(Array.from({ length: HOT_SPOTS_MAX }, () => ""));
                setNotice("");
              }}
              type="button"
            >
              Clear all
            </button>
          ) : null}
        </div>
      </section>
    </AdminShell>
  );
}
