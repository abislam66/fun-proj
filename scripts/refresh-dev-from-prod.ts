/**
 * One-way PROD -> DEV content refresh.
 *
 * Copies `venues` and `venue_photos` from tueats-prod into tueats-dev as a
 * full replace, so dev always mirrors a recent, realistic snapshot of what
 * users actually see. Never touches production.
 *
 * Explicitly NOT copied: `profiles` (identity/roles), `problem_reports`
 * (user-submitted content), `ratings` (reviews — NOT NULL FK to profiles,
 * can't be copied without copying identities), Supabase auth.users/
 * sessions. Dev keeps its own separate admin — see Context/progress.md.
 *
 * `venue_photos.uploaded_by` (FK to profiles, added by migration 0009) is
 * forced to null on copy for the same reason; `status` (pending/published/
 * rejected) is copied as-is since it's photo content, not identity, and
 * lets the admin moderation queue be tested against realistic data too.
 *
 * Safety:
 * - Source/target project refs are hardcoded below and asserted against the
 *   resolved connection strings before anything runs. No override flag.
 * - The source connection is only ever used for SELECT in this file — never
 *   pass it anywhere a write could happen.
 * - Copied `venue_photos` rows have `source` forced to "legacy" regardless
 *   of their original value, so the admin photo manager's delete path
 *   (src/actions/admin.ts) can never call Vercel Blob's `del()` on them —
 *   production photos stay read-only from dev. See Context/decisions.md.
 * - Without --confirm, this only resolves refs, counts rows, and exits —
 *   no connection is opened with write intent and no write is attempted.
 *
 * Run: pnpm refresh:dev-from-prod          (dry run — safety checks only)
 *      pnpm refresh:dev-from-prod --confirm (actually copies)
 */

import postgres from "postgres";

// Explicit `string` type (not inferred literal) so the redundant later
// checks below (targetRef !== PROD_REF, sourceRef !== targetRef) stay
// real runtime assertions instead of TS narrowing them to an
// always-true/false comparison and refusing to compile.
const PROD_REF: string = "ehuhoitlezcijbbfkzan";
const DEV_REF: string = "opzhasvvgjkfnddfleys";

function extractProjectRef(connectionString: string): string {
  const poolerMatch = connectionString.match(/postgres\.([a-z0-9]+):/);
  if (poolerMatch) return poolerMatch[1]!;
  const directMatch = connectionString.match(/db\.([a-z0-9]+)\.supabase\.co/);
  if (directMatch) return directMatch[1]!;
  throw new Error(
    `Could not extract a Supabase project ref from connection string: ${connectionString.replace(/:[^:@]+@/, ":***@")}`,
  );
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Safety check failed: ${message}`);
}

async function main() {
  const confirm = process.argv.includes("--confirm");

  const prodUrl = process.env.PROD_DIRECT_DATABASE_URL;
  const devUrl = process.env.DIRECT_DATABASE_URL;
  if (!prodUrl) {
    throw new Error(
      "PROD_DIRECT_DATABASE_URL is required (load via .env.prod-readonly.local)",
    );
  }
  if (!devUrl) {
    throw new Error("DIRECT_DATABASE_URL is required (load via .env.local)");
  }

  const sourceRef = extractProjectRef(prodUrl);
  const targetRef = extractProjectRef(devUrl);

  console.log(`Source (read-only): ${sourceRef}`);
  console.log(`Target (write):     ${targetRef}`);

  assert(sourceRef === PROD_REF, `source ref must be prod (${PROD_REF}), got ${sourceRef}`);
  assert(targetRef === DEV_REF, `target ref must be dev (${DEV_REF}), got ${targetRef}`);
  assert(targetRef !== PROD_REF, "target ref must never equal the production ref");
  assert(sourceRef !== targetRef, "source and target ref must not be the same project");
  assert(prodUrl !== devUrl, "source and target connection strings must not be identical");

  console.log("Safety checks passed.");

  // Source: read-only usage only. Never issue a write statement on `source`.
  const source = postgres(prodUrl, { prepare: false, max: 1 });
  const target = postgres(devUrl, { prepare: false, max: 1 });

  try {
    const venueRows = await source`select * from venues`;
    const photoRows = await source`select * from venue_photos`;

    assert(
      venueRows.length > 0,
      "production returned 0 venues — refusing to replace dev with an empty snapshot (check PROD_DIRECT_DATABASE_URL)",
    );

    // `uploaded_by` FKs to `profiles`, which is deliberately never copied —
    // keeping a prod profile id here would violate the FK constraint on
    // insert (or silently dangle if it somehow didn't). `status` is kept
    // as-is (pending/published/rejected) since it's real venue-photo
    // content, not identity, and copying it lets the admin moderation
    // queue be tested against realistic data too.
    const legacyPhotoRows: Record<string, unknown>[] = photoRows.map(
      (row) => ({
        ...row,
        source: "legacy",
        uploaded_by: null,
      }),
    );

    const [existingVenuesRow] = await target`select count(*)::int from venues`;
    const [existingPhotosRow] =
      await target`select count(*)::int from venue_photos`;
    const existingVenues = existingVenuesRow?.count ?? 0;
    const existingPhotos = existingPhotosRow?.count ?? 0;

    console.log(
      `\nProduction has ${venueRows.length} venue(s), ${photoRows.length} photo(s).`,
    );
    console.log(
      `Dev currently has ${existingVenues} venue(s), ${existingPhotos} photo(s) — will be fully replaced.`,
    );
    const relabeled = photoRows.filter((r) => r.source !== "legacy").length;
    console.log(
      `${relabeled} photo(s) will have source rewritten admin -> legacy for safety.`,
    );

    if (!confirm) {
      console.log(
        "\nDry run only — no write attempted. Re-run with --confirm to apply.",
      );
      return;
    }

    await target.begin(async (tx) => {
      await tx`delete from venue_photos`;
      await tx`delete from venues`;

      await tx`insert into venues ${tx(
        venueRows,
        "id",
        "slug",
        "type",
        "name",
        "description",
        "status",
        "lat",
        "lng",
        "map_zone",
        "building",
        "floor",
        "accepts_cash",
        "accepts_card",
        "is_halal",
        "is_vegan_friendly",
        "cuisines",
        "hours",
        "last_verified_at",
        "retired_at",
        "created_at",
        "updated_at",
      )}`;

      if (legacyPhotoRows.length > 0) {
        await tx`insert into venue_photos ${tx(
          legacyPhotoRows,
          "id",
          "venue_id",
          "url",
          "alt",
          "source",
          "status",
          "uploaded_by",
          "sort_order",
          "created_at",
        )}`;
      }
    });

    console.log(
      `\nDone. Copied ${venueRows.length} venue(s), ${legacyPhotoRows.length} photo(s) into tueats-dev.`,
    );
  } finally {
    await source.end();
    await target.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
