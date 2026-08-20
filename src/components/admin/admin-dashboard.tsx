"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { resolveProblemReport } from "@/actions/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button, Input } from "@/components/ui/primitives";
import type { ProblemReportRow, VenueRow } from "@/lib/db/schema";

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
}: {
  initialReports: ProblemReportRow[];
  initialVenues: VenueRow[];
}) {
  const [venues] = useState(initialVenues);
  const [reports, setReports] = useState(initialReports);
  const [pendingReportId, setPendingReportId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [venueFilter, setVenueFilter] = useState<"all" | VenueRow["status"]>(
    "all",
  );
  const [reportFilter, setReportFilter] = useState<
    "all" | ProblemReportRow["status"]
  >("open");

  const venueNameById = useMemo(
    () => new Map(venues.map((venue) => [venue.id, venue.name])),
    [venues],
  );

  const visibleVenues = useMemo(
    () =>
      venues.filter(
        (venue) =>
          (venueFilter === "all" || venue.status === venueFilter) &&
          `${venue.name} ${venue.slug}`
            .toLowerCase()
            .includes(search.trim().toLowerCase()),
      ),
    [search, venues, venueFilter],
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
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Venue</th>
                <th>Status</th>
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
                  <td>{venue.zoneKey || "Not set"}</td>
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
    </AdminShell>
  );
}
