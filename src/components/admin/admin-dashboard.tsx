"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { Button, Input } from "@/components/ui/primitives";
import {
  resetMockAdminState,
  updateMockAdminState,
  useMockAdminState,
} from "@/lib/admin-mock-store";
import {
  setMockReportStatus,
  type MockReportStatus,
  type MockVenueStatus,
} from "@/lib/admin-mock";

const reportLabels = {
  closed: "Reported closed",
  moved: "Reported moved",
  wrong_hours: "Wrong hours",
  other: "Other",
} as const;

export function AdminDashboard() {
  const state = useMockAdminState();
  const [search, setSearch] = useState("");
  const [venueFilter, setVenueFilter] = useState<"all" | MockVenueStatus>(
    "all",
  );
  const [reportFilter, setReportFilter] = useState<"all" | MockReportStatus>(
    "open",
  );

  const venues = useMemo(
    () =>
      state.venues.filter(
        (venue) =>
          (venueFilter === "all" || venue.status === venueFilter) &&
          `${venue.name} ${venue.slug}`
            .toLowerCase()
            .includes(search.trim().toLowerCase()),
      ),
    [search, state.venues, venueFilter],
  );
  const reports = state.reports.filter(
    (report) => reportFilter === "all" || report.status === reportFilter,
  );
  const published = state.venues.filter(
    (venue) => venue.status === "published",
  ).length;
  const drafts = state.venues.filter(
    (venue) => venue.status === "draft",
  ).length;
  const openReports = state.reports.filter(
    (report) => report.status === "open",
  ).length;
  const stale = state.venues.filter(
    (venue) => !venue.lastVerifiedAt && venue.status !== "retired",
  ).length;

  function updateReport(id: string, status: MockReportStatus) {
    updateMockAdminState((current) => setMockReportStatus(current, id, status));
  }

  return (
    <AdminShell>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">Operations snapshot</p>
          <h1>Venue management</h1>
          <p>
            Local mock data only. Changes persist in this browser and do not
            call production actions.
          </p>
        </div>
        <div className="admin-heading-actions">
          <Button variant="ghost" onClick={resetMockAdminState}>
            Reset mock data
          </Button>
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
            <p>{venues.length} records shown</p>
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
              {venues.map((venue) => (
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
                      ? new Date(venue.lastVerifiedAt).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td>{venue.updatedAt}</td>
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
          {venues.length === 0 ? (
            <p className="admin-empty">No venues match these filters.</p>
          ) : null}
        </div>
      </section>

      <section className="admin-panel" id="reports">
        <div className="admin-panel-header">
          <div>
            <h2>Problem-report queue</h2>
            <p>Review public corrections and record a mock outcome.</p>
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
          {reports.map((report) => (
            <article className="report-row" key={report.id}>
              <div className="report-kind">
                <span>{reportLabels[report.kind]}</span>
                <small>{report.createdAt}</small>
              </div>
              <div className="report-copy">
                <Link href={`/admin/venues/${report.venueId}`}>
                  {report.venueName}
                </Link>
                <p>{report.note || "No note provided."}</p>
              </div>
              <span className={`admin-status report-${report.status}`}>
                {report.status}
              </span>
              <div className="report-row-actions">
                <Button
                  disabled={report.status === "actioned"}
                  onClick={() => updateReport(report.id, "actioned")}
                  variant="secondary"
                >
                  Mark actioned
                </Button>
                <Button
                  disabled={report.status === "dismissed"}
                  onClick={() => updateReport(report.id, "dismissed")}
                  variant="ghost"
                >
                  Dismiss
                </Button>
                {report.status !== "open" ? (
                  <Button
                    onClick={() => updateReport(report.id, "open")}
                    variant="ghost"
                  >
                    Reopen
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
          {reports.length === 0 ? (
            <p className="admin-empty">No reports in this queue.</p>
          ) : null}
        </div>
      </section>
    </AdminShell>
  );
}
