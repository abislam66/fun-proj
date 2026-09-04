"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";

import {
  bulkSetVenueCuisine,
  bulkSetVenueHalal,
  bulkSetVenueVeganFriendly,
  resolveProblemReport,
  resolveVenuePhoto,
  type ActionResult,
} from "@/actions/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button, Chip, Input } from "@/components/ui/primitives";
import { CUISINE_KEYS, CUISINES, type CuisineKey } from "@/config/cuisines";
import { MAP_ZONE_KEYS_SORTED, MAP_ZONES } from "@/config/map-zones";
import {
  adminVenueZoneLabel,
  filterAndSortAdminVenues,
  type AdminVenueSort,
  type AdminVenueZoneFilter,
} from "@/lib/admin-venue-list";
import type { AdminVenueRow, PendingVenuePhoto } from "@/lib/db/queries";
import type { ProblemReportRow, VenueRow } from "@/lib/db/schema";
import { OTHER_MAP_ZONE } from "@/lib/venues";

type TriFilter = "all" | "yes" | "no";
type CompletenessFlag = "hours" | "description" | "photo";

type BulkBooleanField = {
  key: "isHalal" | "isVeganFriendly";
  label: string;
  run: (
    ids: string[],
    value: boolean,
  ) => Promise<ActionResult<{ updatedIds: string[] }>>;
};

/**
 * One row per bulk-editable boolean field. `applyBulkBoolean` (below) is
 * the single handler for all of them — add a sibling entry here (each
 * backed by its own narrow schema/query/action, matching
 * `bulkSetHalalSchema`) rather than a new bar or a generic "patch any
 * field" action.
 */
const BULK_BOOLEAN_FIELDS: BulkBooleanField[] = [
  {
    key: "isHalal",
    label: "Halal",
    run: (ids, isHalal) => bulkSetVenueHalal({ ids, isHalal }),
  },
  {
    key: "isVeganFriendly",
    label: "Vegan Friendly",
    run: (ids, isVeganFriendly) =>
      bulkSetVenueVeganFriendly({ ids, isVeganFriendly }),
  },
];

function venueMissingHours(venue: AdminVenueRow): boolean {
  const hours = venue.hours as Record<string, unknown> | null;
  return !hours || Object.keys(hours).length === 0;
}

function venueMissingDescription(venue: AdminVenueRow): boolean {
  return !venue.description || !venue.description.trim();
}

const reportLabels: Record<ProblemReportRow["kind"], string> = {
  closed: "Reported closed",
  moved: "Reported moved",
  wrong_hours: "Wrong hours",
  other: "Other",
};

type ResolvableStatus = Exclude<ProblemReportRow["status"], "open">;

export function AdminDashboard({
  initialReports,
  initialVenues,
  initialPendingPhotos,
}: {
  initialReports: ProblemReportRow[];
  initialVenues: AdminVenueRow[];
  initialPendingPhotos: PendingVenuePhoto[];
}) {
  const [venues, setVenues] = useState(initialVenues);
  const [reports, setReports] = useState(initialReports);
  const [pendingPhotos, setPendingPhotos] = useState(initialPendingPhotos);
  const [pendingReportId, setPendingReportId] = useState<string | null>(null);
  const [pendingPhotoId, setPendingPhotoId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [venueFilter, setVenueFilter] = useState<"all" | VenueRow["status"]>(
    "all",
  );
  const [zoneFilter, setZoneFilter] = useState<AdminVenueZoneFilter>("all");
  const [venueSort, setVenueSort] = useState<AdminVenueSort>("updated");
  const [cuisineFilter, setCuisineFilter] = useState("all");
  const [halalFilter, setHalalFilter] = useState<TriFilter>("all");
  const [veganFilter, setVeganFilter] = useState<TriFilter>("all");
  const [completenessFlags, setCompletenessFlags] = useState<
    Set<CompletenessFlag>
  >(new Set());
  const [reportFilter, setReportFilter] = useState<
    "all" | ProblemReportRow["status"]
  >("open");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkNotice, setBulkNotice] = useState("");
  const [bulkNoticeIsError, setBulkNoticeIsError] = useState(false);
  const [bulkCuisine, setBulkCuisine] = useState<CuisineKey>(
    CUISINE_KEYS[0] ?? "other",
  );

  function toggleCompletenessFlag(flag: CompletenessFlag) {
    setCompletenessFlags((current) => {
      const next = new Set(current);
      if (next.has(flag)) next.delete(flag);
      else next.add(flag);
      return next;
    });
  }

  const anyExtraFilterActive =
    cuisineFilter !== "all" ||
    halalFilter !== "all" ||
    veganFilter !== "all" ||
    completenessFlags.size > 0;

  function clearExtraFilters() {
    setCuisineFilter("all");
    setHalalFilter("all");
    setVeganFilter("all");
    setCompletenessFlags(new Set());
  }

  const venueNameById = useMemo(
    () => new Map(venues.map((venue) => [venue.id, venue.name])),
    [venues],
  );

  // Zone/status/search/sort stay main's (`filterAndSortAdminVenues`) —
  // Cuisine/Halal/Vegan Friendly/completeness are additional narrowing on
  // top of that result, not a second competing filter pipeline.
  const zoneSortedVenues = useMemo(
    () =>
      filterAndSortAdminVenues(venues, {
        search,
        status: venueFilter,
        zone: zoneFilter,
        sort: venueSort,
      }),
    [search, venues, venueFilter, venueSort, zoneFilter],
  );

  const visibleVenues = useMemo(
    () =>
      zoneSortedVenues.filter((venue) => {
        if (cuisineFilter !== "all" && !venue.cuisines.includes(cuisineFilter))
          return false;
        if (halalFilter !== "all" && venue.isHalal !== (halalFilter === "yes"))
          return false;
        if (
          veganFilter !== "all" &&
          venue.isVeganFriendly !== (veganFilter === "yes")
        )
          return false;
        if (completenessFlags.has("hours") && !venueMissingHours(venue))
          return false;
        if (
          completenessFlags.has("description") &&
          !venueMissingDescription(venue)
        )
          return false;
        if (completenessFlags.has("photo") && venue.photoCount > 0)
          return false;
        return true;
      }),
    [
      zoneSortedVenues,
      cuisineFilter,
      halalFilter,
      veganFilter,
      completenessFlags,
    ],
  );

  const allVisibleSelected =
    visibleVenues.length > 0 &&
    visibleVenues.every((venue) => selectedIds.has(venue.id));
  const someVisibleSelected = visibleVenues.some((venue) =>
    selectedIds.has(venue.id),
  );

  const visibleReports = reports.filter(
    (report) => reportFilter === "all" || report.status === reportFilter,
  );
  const published = venues.filter(
    (venue) => venue.status === "published",
  ).length;
  const drafts = venues.filter((venue) => venue.status === "draft").length;
  const openReports = reports.filter(
    (report) => report.status === "open",
  ).length;
  const pendingPhotoCount = pendingPhotos.length;
  const stale = venues.filter(
    (venue) => !venue.lastVerifiedAt && venue.status !== "retired",
  ).length;

  async function updateReport(id: string, status: ResolvableStatus) {
    setPendingReportId(id);
    const result = await resolveProblemReport({ id, status });
    setPendingReportId(null);
    if (!result.ok) return;
    setReports((current) =>
      current.map((report) =>
        report.id === id
          ? { ...report, status, resolvedAt: new Date() }
          : report,
      ),
    );
  }

  async function resolvePhoto(photoId: string, action: "approve" | "reject") {
    setPendingPhotoId(photoId);
    const result = await resolveVenuePhoto({ photoId, action });
    setPendingPhotoId(null);
    if (!result.ok) return;
    setPendingPhotos((current) =>
      current.filter((photo) => photo.id !== photoId),
    );
  }

  function toggleVenueSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    setSelectedIds((current) => {
      if (allVisibleSelected) {
        const next = new Set(current);
        for (const venue of visibleVenues) next.delete(venue.id);
        return next;
      }
      const next = new Set(current);
      for (const venue of visibleVenues) next.add(venue.id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  /**
   * Bulk actions live in one small table (`BULK_BOOLEAN_FIELDS` below) so a
   * future field (zone, status, ...) is just another entry + server
   * action, not a new bar/confirmation/feedback plumbing. Every field
   * here shares this one handler — the confirm/pending/notice/local-state
   * update cycle is identical for each, only the label and the server
   * action differ.
   */
  async function applyBulkBoolean(field: BulkBooleanField, value: boolean) {
    const ids = [...selectedIds];
    const confirmed = window.confirm(
      `Mark ${ids.length} selected venue${ids.length === 1 ? "" : "s"} as ${field.label}${value ? "" : " (No)"}?`,
    );
    if (!confirmed) return;

    setBulkPending(true);
    setBulkNotice("");
    const result = await field.run(ids, value);
    setBulkPending(false);

    if (!result.ok) {
      setBulkNoticeIsError(true);
      setBulkNotice(result.error);
      return;
    }

    const updated = new Set(result.data.updatedIds);
    setVenues((current) =>
      current.map((venue) =>
        updated.has(venue.id) ? { ...venue, [field.key]: value } : venue,
      ),
    );
    setBulkNoticeIsError(false);
    setBulkNotice(
      `Updated ${result.data.updatedIds.length} venue${result.data.updatedIds.length === 1 ? "" : "s"}.`,
    );
    clearSelection();
  }

  /**
   * Bulk-add or bulk-remove one cuisine tag on the selected venues. Unlike
   * `applyBulkBoolean` this can't just set the picked field to a shared
   * value locally — each venue keeps its own other cuisines — so the
   * local state update adds/removes only the one tag per venue instead of
   * overwriting the array.
   */
  async function applyBulkCuisine(action: "add" | "remove") {
    const ids = [...selectedIds];
    const cuisine = bulkCuisine;
    const label = CUISINES[cuisine].label;
    const confirmed = window.confirm(
      action === "add"
        ? `Add "${label}" to ${ids.length} selected venue${ids.length === 1 ? "" : "s"}? Their other cuisines won't change.`
        : `Remove "${label}" from ${ids.length} selected venue${ids.length === 1 ? "" : "s"}? Their other cuisines won't change.`,
    );
    if (!confirmed) return;

    setBulkPending(true);
    setBulkNotice("");
    const result = await bulkSetVenueCuisine({ ids, cuisine, action });
    setBulkPending(false);

    if (!result.ok) {
      setBulkNoticeIsError(true);
      setBulkNotice(result.error);
      return;
    }

    const updated = new Set(result.data.updatedIds);
    setVenues((current) =>
      current.map((venue) => {
        if (!updated.has(venue.id)) return venue;
        const cuisines =
          action === "add"
            ? venue.cuisines.includes(cuisine)
              ? venue.cuisines
              : [...venue.cuisines, cuisine]
            : venue.cuisines.filter((item) => item !== cuisine);
        return { ...venue, cuisines };
      }),
    );
    setBulkNoticeIsError(false);
    setBulkNotice(
      `Updated ${result.data.updatedIds.length} venue${result.data.updatedIds.length === 1 ? "" : "s"}.`,
    );
    clearSelection();
  }

  return (
    <AdminShell>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">Operations snapshot</p>
          <h1>Venue management</h1>
        </div>
        <div className="admin-heading-actions">
          <Link className="button button-primary" href="/admin/venues/new">
            Add venue
          </Link>
        </div>
      </div>

      <section className="admin-metrics" aria-label="Venue summary">
        <article>
          <span>Published</span>
          <strong>{published}</strong>
        </article>
        <article>
          <span>Drafts</span>
          <strong>{drafts}</strong>
        </article>
        <article>
          <span>Open reports</span>
          <strong className={openReports ? "metric-alert" : undefined}>
            {openReports}
          </strong>
        </article>
        <article>
          <span>Pending photos</span>
          <strong className={pendingPhotoCount ? "metric-alert" : undefined}>
            {pendingPhotoCount}
          </strong>
        </article>
        <article>
          <span>Needs verification</span>
          <strong>{stale}</strong>
        </article>
      </section>

      <section className="admin-panel" id="venues">
        <div className="admin-panel-header">
          <div>
            <h2>Venues</h2>
            <p>{visibleVenues.length} records shown</p>
          </div>
          <div className="admin-table-tools">
            <label className="admin-search">
              <span className="sr-only">Search venues</span>
              <Input
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or slug"
                type="search"
                value={search}
              />
            </label>
            <label>
              <span className="sr-only">Filter venues by status</span>
              <select
                className="admin-select"
                onChange={(event) =>
                  setVenueFilter(event.target.value as typeof venueFilter)
                }
                value={venueFilter}
              >
                <option value="all">All statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="retired">Retired</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Filter venues by zone</span>
              <select
                className="admin-select"
                onChange={(event) =>
                  setZoneFilter(event.target.value as AdminVenueZoneFilter)
                }
                value={zoneFilter}
              >
                <option value="all">All zones</option>
                {MAP_ZONE_KEYS_SORTED.map((key) => (
                  <option key={key} value={key}>
                    {MAP_ZONES[key].label}
                  </option>
                ))}
                <option value={OTHER_MAP_ZONE}>
                  Other / Outside mapped zones
                </option>
                <option value="unset">Not set</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Sort venues</span>
              <select
                className="admin-select"
                onChange={(event) =>
                  setVenueSort(event.target.value as AdminVenueSort)
                }
                value={venueSort}
              >
                <option value="updated">Recently updated</option>
                <option value="name">Name A–Z</option>
                <option value="zone">Zone</option>
              </select>
            </label>
          </div>
        </div>

        <div className="admin-filter-row">
          <label>
            <span className="sr-only">Filter venues by cuisine</span>
            <select
              className="admin-select"
              onChange={(event) => setCuisineFilter(event.target.value)}
              value={cuisineFilter}
            >
              <option value="all">All cuisines</option>
              {CUISINE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {CUISINES[key].label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter venues by Halal status</span>
            <select
              className="admin-select"
              onChange={(event) =>
                setHalalFilter(event.target.value as TriFilter)
              }
              value={halalFilter}
            >
              <option value="all">Halal: all</option>
              <option value="yes">Halal: yes</option>
              <option value="no">Halal: no</option>
            </select>
          </label>
          <label>
            <span className="sr-only">
              Filter venues by Vegan Friendly status
            </span>
            <select
              className="admin-select"
              onChange={(event) =>
                setVeganFilter(event.target.value as TriFilter)
              }
              value={veganFilter}
            >
              <option value="all">Vegan Friendly: all</option>
              <option value="yes">Vegan Friendly: yes</option>
              <option value="no">Vegan Friendly: no</option>
            </select>
          </label>
        </div>

        <div className="admin-filter-row admin-filter-chips">
          <Chip
            active={completenessFlags.has("hours")}
            onClick={() => toggleCompletenessFlag("hours")}
          >
            Missing hours
          </Chip>
          <Chip
            active={completenessFlags.has("description")}
            onClick={() => toggleCompletenessFlag("description")}
          >
            Missing description
          </Chip>
          <Chip
            active={completenessFlags.has("photo")}
            onClick={() => toggleCompletenessFlag("photo")}
          >
            Missing photo
          </Chip>
          {anyExtraFilterActive ? (
            <button
              className="admin-bulk-clear"
              onClick={clearExtraFilters}
              type="button"
            >
              Clear extra filters
            </button>
          ) : null}
        </div>

        {selectedIds.size > 0 ? (
          <div className="admin-bulk-bar">
            <span className="admin-bulk-count">
              {selectedIds.size} selected
            </span>
            <button
              className="admin-bulk-clear"
              onClick={clearSelection}
              type="button"
            >
              Clear selection
            </button>
            {BULK_BOOLEAN_FIELDS.map((field) => (
              <Fragment key={field.key}>
                <span aria-hidden="true" className="admin-bulk-divider" />
                <span className="admin-bulk-action-label">{field.label}</span>
                <Button
                  disabled={bulkPending}
                  onClick={() => void applyBulkBoolean(field, true)}
                  variant="secondary"
                >
                  Yes
                </Button>
                <Button
                  disabled={bulkPending}
                  onClick={() => void applyBulkBoolean(field, false)}
                  variant="secondary"
                >
                  No
                </Button>
              </Fragment>
            ))}
            <span aria-hidden="true" className="admin-bulk-divider" />
            <label>
              <span className="sr-only">Cuisine to add or remove</span>
              <select
                className="admin-select"
                onChange={(event) =>
                  setBulkCuisine(event.target.value as CuisineKey)
                }
                value={bulkCuisine}
              >
                {CUISINE_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {CUISINES[key].label}
                  </option>
                ))}
              </select>
            </label>
            <Button
              disabled={bulkPending}
              onClick={() => void applyBulkCuisine("add")}
              variant="secondary"
            >
              Add cuisine
            </Button>
            <Button
              disabled={bulkPending}
              onClick={() => void applyBulkCuisine("remove")}
              variant="secondary"
            >
              Remove cuisine
            </Button>
          </div>
        ) : null}

        {bulkNotice ? (
          <div
            className={
              bulkNoticeIsError
                ? "admin-notice admin-notice-error"
                : "admin-notice"
            }
            role="status"
          >
            {bulkNotice}
          </div>
        ) : null}

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>
                  <input
                    aria-label="Select all visible venues"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    ref={(node) => {
                      if (node) {
                        node.indeterminate =
                          someVisibleSelected && !allVisibleSelected;
                      }
                    }}
                    type="checkbox"
                  />
                </th>
                <th>Venue</th>
                <th>Status</th>
                <th>Halal</th>
                <th>Vegan</th>
                <th>Zone</th>
                <th>Verified</th>
                <th>Updated</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleVenues.map((venue) => (
                <tr key={venue.id}>
                  <td>
                    <input
                      aria-label={`Select ${venue.name}`}
                      checked={selectedIds.has(venue.id)}
                      onChange={() => toggleVenueSelected(venue.id)}
                      type="checkbox"
                    />
                  </td>
                  <td>
                    <Link
                      className="admin-record-link"
                      href={`/admin/venues/${venue.id}`}
                    >
                      <strong>{venue.name}</strong>
                      <span>{venue.slug}</span>
                    </Link>
                  </td>
                  <td>
                    <span className={`admin-status status-${venue.status}`}>
                      {venue.status}
                    </span>
                  </td>
                  <td>
                    {venue.isHalal ? (
                      <span className="admin-status halal-tag">Halal</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {venue.isVeganFriendly ? (
                      <span className="admin-status halal-tag">Vegan</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{adminVenueZoneLabel(venue.mapZone)}</td>
                  <td>
                    {venue.lastVerifiedAt
                      ? venue.lastVerifiedAt.toLocaleDateString()
                      : "Never"}
                  </td>
                  <td>{venue.updatedAt.toLocaleDateString()}</td>
                  <td>
                    <Link
                      className="admin-row-action"
                      href={`/admin/venues/${venue.id}`}
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleVenues.length === 0 ? (
            <p className="admin-empty">No venues match these filters.</p>
          ) : null}
        </div>
      </section>

      <section className="admin-panel" id="reports">
        <div className="admin-panel-header">
          <div>
            <h2>Problem-report queue</h2>
            <p>Review public corrections and record an outcome.</p>
          </div>
          <label>
            <span className="sr-only">Filter reports by status</span>
            <select
              className="admin-select"
              onChange={(event) =>
                setReportFilter(event.target.value as typeof reportFilter)
              }
              value={reportFilter}
            >
              <option value="open">Open</option>
              <option value="actioned">Actioned</option>
              <option value="dismissed">Dismissed</option>
              <option value="all">All reports</option>
            </select>
          </label>
        </div>

        <div className="report-queue">
          {visibleReports.map((report) => (
            <article className="report-row" key={report.id}>
              <div className="report-kind">
                <span>{reportLabels[report.kind]}</span>
                <small>{report.createdAt.toLocaleString()}</small>
              </div>
              <div className="report-copy">
                <Link href={`/admin/venues/${report.venueId}`}>
                  {venueNameById.get(report.venueId) ?? "Unknown venue"}
                </Link>
                <p>{report.note || "No note provided."}</p>
              </div>
              <span className={`admin-status report-${report.status}`}>
                {report.status}
              </span>
              <div className="report-row-actions">
                <Button
                  disabled={
                    pendingReportId === report.id ||
                    report.status === "actioned"
                  }
                  onClick={() => updateReport(report.id, "actioned")}
                  variant="secondary"
                >
                  Mark actioned
                </Button>
                <Button
                  disabled={
                    pendingReportId === report.id ||
                    report.status === "dismissed"
                  }
                  onClick={() => updateReport(report.id, "dismissed")}
                  variant="ghost"
                >
                  Dismiss
                </Button>
              </div>
            </article>
          ))}
          {visibleReports.length === 0 ? (
            <p className="admin-empty">No reports in this queue.</p>
          ) : null}
        </div>
      </section>

      <section className="admin-panel" id="photos">
        <div className="admin-panel-header">
          <div>
            <h2>Photo queue</h2>
            <p>Member submissions go public only after you approve them.</p>
          </div>
        </div>

        <div className="report-queue">
          {pendingPhotos.map((photo) => (
            <article className="report-row photo-queue-row" key={photo.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={photo.alt}
                className="photo-queue-thumb"
                src={photo.url}
              />
              <div className="report-copy">
                <Link href={`/admin/venues/${photo.venueId}`}>
                  {photo.venueName}
                </Link>
                <p>
                  From {photo.uploaderDisplayName} ·{" "}
                  {new Date(photo.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="report-row-actions">
                <Button
                  disabled={pendingPhotoId === photo.id}
                  onClick={() => void resolvePhoto(photo.id, "approve")}
                  variant="secondary"
                >
                  Approve
                </Button>
                <Button
                  disabled={pendingPhotoId === photo.id}
                  onClick={() => void resolvePhoto(photo.id, "reject")}
                  variant="ghost"
                >
                  Reject
                </Button>
              </div>
            </article>
          ))}
          {pendingPhotos.length === 0 ? (
            <p className="admin-empty">No photos waiting for review.</p>
          ) : null}
        </div>
      </section>
    </AdminShell>
  );
}
