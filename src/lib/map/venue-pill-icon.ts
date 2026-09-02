/**
 * Canvas-drawn name-plate icons for the map's symbol layers — generated at
 * runtime so no binary asset is checked in.
 *
 * Venue plates bake the venue name INTO the sprite (one image per venue ×
 * state). MapLibre draws every `icon-image` in a symbol layer first, then
 * every `text-field`, so a stretchable plate plus live text lets one name
 * bleed through an overlapping plate — baked sprites occlude cleanly
 * instead (same fix as zone-label-icon.ts).
 *
 * Chrome matches the zone labels: square plate, hard ink outline, flat
 * offset shadow, leader-line-and-dot stem. Dining pins share that
 * silhouette at 2/3 size with a white/stone palette.
 *
 * The neutral campus-dining variant keeps the label-free 9-slice path:
 * its three pins never overlap each other, and its text stays a GL
 * `text-field`.
 */

const SCALE = 3; // raster oversample for crisp rendering at typical zoom
const PILL_WIDTH = 64; // dining 9-slice base / venue-pill minimum width
const PILL_HEIGHT = 40;
const STEM_LINE_WIDTH = 2.5;
const STEM_LINE_HEIGHT = 9;
const STEM_DOT_RADIUS = 3;
const BORDER = 1.25;
const SHADOW_OFFSET = 2;
const SHADOW_COLOR = "rgba(23, 19, 16, 0.4)";
// Margin above/beside the plate so the selected halo and shadow aren't
// clipped. No margin below: the stem-dot tip must stay at the bitmap's
// bottom edge — it is the map coordinate (icon-anchor: bottom).
const PAD = 5;
const HALO_WIDTH = 2.5;
const HEIGHT =
  PAD + PILL_HEIGHT + STEM_LINE_HEIGHT + STEM_DOT_RADIUS * 2 + BORDER;

const INK = "#171310";
const VENUE_FILL = "#9D2235"; // --color-cherry
const VENUE_HALO = "rgba(157, 34, 53, 0.28)";
const VENUE_TEXT = "#ffffff";

// Drawn at the old z18.5 GL text size; the layer's zoom-scaled
// `icon-size` shrinks the whole sprite at lower zooms.
const LABEL_FONT_SIZE = 13;
const LABEL_PAD_X = 20;

// Campus-dining info pins: white surface + the campus-building stroke
// stone, so they read as map furniture — never a tappable cherry venue.
const DINING_FILL = "#FFFFFF";
const DINING_STROKE = "#B8B4AA";

type PillStyle = {
  fill: string;
  stroke: string;
  borderWidth: number;
  /** Selected-only soft ring outside the border. */
  halo?: string;
  /** Stem line + dot outline. Defaults to the plate's ink outline. */
  stemStroke?: string;
};

export type PillIconAsset = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  pixelRatio: number;
  content: [number, number, number, number];
  stretchX: [number, number][];
  stretchY: [number, number][];
};

export type VenuePillIconAsset = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  pixelRatio: number;
};

export type VenuePillState = "normal" | "hover" | "selected";

export const DINING_PILL_ICON = "campus-dining-pill";

/**
 * Image id for one venue's baked pill. Includes the name so an admin
 * rename naturally busts the per-map image cache.
 */
export function venuePillIconId(
  venueId: string,
  state: VenuePillState,
  name: string,
): string {
  return `venue-pill/${state}/${venueId}/${name}`;
}

/**
 * Image id for a cluster badge — several venues occupying (near-)identical
 * screen space, shown as one "N spots" pill instead of silently stacking.
 * Keyed only by count + state: the label text depends on nothing else, so
 * clusters of the same size reuse one baked sprite regardless of which
 * venues happen to be in them.
 */
export function clusterPillIconId(
  count: number,
  state: VenuePillState,
): string {
  return `cluster-pill/${state}/${count}`;
}

export function clusterPillLabel(count: number): string {
  return `${count} spots`;
}

/** Same baked-pill treatment as a venue, labeled with a spot count. */
export function buildClusterPillIcon(
  count: number,
  state: VenuePillState,
): VenuePillIconAsset {
  return buildVenuePillIcon(clusterPillLabel(count), state);
}

const VENUE_PILL_STYLES: Record<VenuePillState, PillStyle> = {
  normal: { fill: VENUE_FILL, stroke: INK, borderWidth: 1.5 },
  hover: { fill: VENUE_FILL, stroke: INK, borderWidth: 2.25 },
  selected: {
    fill: VENUE_FILL,
    stroke: INK,
    borderWidth: 2.25,
    halo: VENUE_HALO,
  },
};

// Same body-font approach as zone-label-icon.ts, so pill names match the
// page's Satoshi instead of the basemap's Noto.
function labelFont(): string {
  const family =
    typeof document === "undefined"
      ? "sans-serif"
      : getComputedStyle(document.body).fontFamily || "sans-serif";
  return `700 ${LABEL_FONT_SIZE}px ${family}`;
}

/** Paints halo + square plate + leader-line-and-dot stem (`pillWidth` in design units). */
function paintPill(
  ctx: CanvasRenderingContext2D,
  pillWidth: number,
  style: PillStyle,
) {
  const { fill, stroke, borderWidth, halo, stemStroke = INK } = style;
  const plateX = PAD;
  const plateY = PAD;

  // Selected-only halo — a soft cherry ring outside the ink border so
  // the selected plate reads differently from a merely hovered one.
  if (halo) {
    ctx.beginPath();
    ctx.rect(
      plateX - HALO_WIDTH,
      plateY - HALO_WIDTH,
      pillWidth + HALO_WIDTH * 2,
      PILL_HEIGHT + HALO_WIDTH * 2,
    );
    ctx.fillStyle = halo;
    ctx.fill();
  }

  // Hard offset shadow — solid, no blur, same pixel-UI treatment as
  // zone labels. Drawn first so the plate and stem sit on top of it.
  ctx.beginPath();
  ctx.rect(
    plateX + SHADOW_OFFSET,
    plateY + SHADOW_OFFSET,
    pillWidth - BORDER,
    PILL_HEIGHT - BORDER,
  );
  ctx.fillStyle = SHADOW_COLOR;
  ctx.fill();

  // Square plate — fill + ink outline on all sides.
  ctx.beginPath();
  ctx.rect(
    plateX + borderWidth / 2,
    plateY + borderWidth / 2,
    pillWidth - borderWidth,
    PILL_HEIGHT - borderWidth,
  );
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = borderWidth;
  ctx.strokeStyle = stroke;
  ctx.stroke();

  // Stem — thin leader line ending in a small fill-colored dot at the
  // true coordinate (`icon-anchor: "bottom"`), matching zone labels.
  const cx = plateX + pillWidth / 2;
  const stemTopY = plateY + PILL_HEIGHT;
  const stemBottomY = stemTopY + STEM_LINE_HEIGHT;
  ctx.beginPath();
  ctx.moveTo(cx, stemTopY);
  ctx.lineTo(cx, stemBottomY);
  ctx.lineWidth = STEM_LINE_WIDTH;
  ctx.strokeStyle = stemStroke;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, stemBottomY + STEM_DOT_RADIUS, STEM_DOT_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = BORDER;
  ctx.strokeStyle = stemStroke;
  ctx.stroke();
}

/** One opaque sprite: pill + stem + the venue name, sized to the name. */
export function buildVenuePillIcon(
  name: string,
  state: VenuePillState,
): VenuePillIconAsset {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  const font = labelFont();
  ctx.font = font;
  const textWidth = ctx.measureText(name).width;
  const pillWidth = Math.max(
    PILL_WIDTH,
    Math.ceil(textWidth + LABEL_PAD_X * 2),
  );
  const width = pillWidth + PAD * 2 + SHADOW_OFFSET;

  canvas.width = width * SCALE;
  canvas.height = HEIGHT * SCALE;
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.font = font; // canvas resize resets state

  paintPill(ctx, pillWidth, VENUE_PILL_STYLES[state]);

  ctx.fillStyle = VENUE_TEXT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name, PAD + pillWidth / 2, PAD + PILL_HEIGHT / 2);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  return {
    width: canvas.width,
    height: canvas.height,
    data: imageData.data,
    pixelRatio: SCALE,
  };
}

// ---------------------------------------------------------------------------
// Label-free 9-slice variant (campus dining) — stretched by icon-text-fit.
// `content`/`stretchX`/`stretchY` are specified in the raw bitmap's own
// pixel space (i.e. WIDTH*SCALE / HEIGHT*SCALE) — NOT the unscaled design
// units used above. Defined here in design units (pill offset by PAD),
// then scaled below.

const NINE_SLICE_WIDTH = PILL_WIDTH + PAD * 2 + SHADOW_OFFSET;

const CONTENT_DESIGN: [number, number, number, number] = [
  16 + PAD,
  9 + PAD,
  48 + PAD,
  31 + PAD,
];
const STRETCH_X_DESIGN: [number, number][] = [
  [16 + PAD, 23 + PAD],
  [41 + PAD, 48 + PAD],
];
const STRETCH_Y_DESIGN: [number, number][] = [[19 + PAD, 21 + PAD]];

const CONTENT = CONTENT_DESIGN.map((v) => v * SCALE) as [
  number,
  number,
  number,
  number,
];
const STRETCH_X = STRETCH_X_DESIGN.map(
  ([a, b]) => [a * SCALE, b * SCALE] as [number, number],
);
const STRETCH_Y = STRETCH_Y_DESIGN.map(
  ([a, b]) => [a * SCALE, b * SCALE] as [number, number],
);

function drawPill(style: PillStyle): PillIconAsset {
  const canvas = document.createElement("canvas");
  canvas.width = NINE_SLICE_WIDTH * SCALE;
  canvas.height = HEIGHT * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  paintPill(ctx, PILL_WIDTH, style);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  return {
    width: canvas.width,
    height: canvas.height,
    data: imageData.data,
    pixelRatio: SCALE,
    content: CONTENT,
    stretchX: STRETCH_X,
    stretchY: STRETCH_Y,
  };
}

// Dining pins display at 2/3 the venue-pill footprint: same bitmap,
// registered at a higher pixelRatio. The content/stretch bands are in
// bitmap pixel space, so they need no adjustment.
const DINING_PILL_DOWNSCALE = 1.5;

/** Neutral, non-interactive pill for meal-plan dining info pins. */
export function buildDiningPillIcon(): PillIconAsset {
  const asset = drawPill({
    fill: DINING_FILL,
    stroke: DINING_STROKE,
    borderWidth: 1.5,
    stemStroke: INK,
  });
  return { ...asset, pixelRatio: asset.pixelRatio * DINING_PILL_DOWNSCALE };
}
