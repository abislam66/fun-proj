/**
 * Canvas-drawn pill+stem icons for the map's symbol layers — generated at
 * runtime so no binary asset is checked in.
 *
 * Venue pills bake the venue name INTO the sprite (one image per venue ×
 * state). MapLibre draws every `icon-image` in a symbol layer first, then
 * every `text-field`, so a stretchable pill plus live text lets one name
 * bleed through an overlapping pill — baked sprites occlude cleanly
 * instead (same fix as zone-label-icon.ts).
 *
 * The neutral campus-dining variant keeps the label-free 9-slice path:
 * its three pins never overlap each other, and its text stays a GL
 * `text-field`.
 */

const SCALE = 3; // raster oversample for crisp rendering at typical zoom
const PILL_WIDTH = 64; // dining 9-slice base / venue-pill minimum width
const PILL_HEIGHT = 30;
const STEM_WIDTH = 12;
const STEM_HEIGHT = 8;
// Margin above/beside the pill so the selected halo isn't clipped. No
// margin below: the stem tip must stay at the bitmap's bottom edge —
// it is the map coordinate (icon-anchor: bottom).
const PAD = 5;
const HALO_WIDTH = 2.5;
const HEIGHT = PAD + PILL_HEIGHT + STEM_HEIGHT;
const RADIUS = PILL_HEIGHT / 2;

const VENUE_FILL = "#9D2235"; // --color-cherry
const VENUE_STROKE = "#ffffff";
const VENUE_HALO = "rgba(157, 34, 53, 0.28)";
const VENUE_TEXT = "#ffffff";

// Drawn at the old z18.5 GL text size; the layer's zoom-scaled
// `icon-size` shrinks the whole sprite at lower zooms.
const LABEL_FONT_SIZE = 13;
const LABEL_PAD_X = 12; // matches the old icon-text-fit-padding sides

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
  /**
   * Outline the stem's slanted edges. The cherry stem reads on its own,
   * but a white stem on the stone basemap needs an edge to stay visible.
   */
  strokeStem?: boolean;
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
  normal: { fill: VENUE_FILL, stroke: VENUE_STROKE, borderWidth: 2 },
  hover: { fill: VENUE_FILL, stroke: VENUE_STROKE, borderWidth: 3 },
  selected: {
    fill: VENUE_FILL,
    stroke: VENUE_STROKE,
    borderWidth: 3,
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

/** Paints halo + pill body + stem for a pill `pillWidth` wide (design units). */
function paintPill(
  ctx: CanvasRenderingContext2D,
  pillWidth: number,
  style: PillStyle,
) {
  const { fill, stroke, borderWidth, halo, strokeStem } = style;
  const width = pillWidth + PAD * 2;

  // Selected-only halo — a soft cherry ring outside the white border,
  // matching DESIGN.md's "thicker white ring" + glow treatment so the
  // selected pill reads differently from a merely hovered one.
  if (halo) {
    ctx.beginPath();
    ctx.roundRect(
      PAD - HALO_WIDTH,
      PAD - HALO_WIDTH,
      pillWidth + HALO_WIDTH * 2,
      PILL_HEIGHT + HALO_WIDTH * 2,
      RADIUS + HALO_WIDTH,
    );
    ctx.fillStyle = halo;
    ctx.fill();
  }

  // Pill body — full stadium, fill + stroke on all sides.
  ctx.beginPath();
  ctx.roundRect(
    PAD + borderWidth / 2,
    PAD + borderWidth / 2,
    pillWidth - borderWidth,
    PILL_HEIGHT - borderWidth,
    RADIUS - borderWidth / 2,
  );
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = borderWidth;
  ctx.strokeStyle = stroke;
  ctx.stroke();

  // Stem — solid triangle overlapping 1px into the pill's bottom edge so
  // the border reads as "opening up" around it.
  const cx = width / 2;
  ctx.beginPath();
  ctx.moveTo(cx - STEM_WIDTH / 2, PAD + PILL_HEIGHT - 1);
  ctx.lineTo(cx + STEM_WIDTH / 2, PAD + PILL_HEIGHT - 1);
  ctx.lineTo(cx, PAD + PILL_HEIGHT + STEM_HEIGHT - 1);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();

  if (strokeStem) {
    // Only the two slanted edges — an open path, so no stroke line cuts
    // horizontally across the pill's bottom border.
    ctx.beginPath();
    ctx.moveTo(cx - STEM_WIDTH / 2, PAD + PILL_HEIGHT - 1);
    ctx.lineTo(cx, PAD + PILL_HEIGHT + STEM_HEIGHT - 1);
    ctx.lineTo(cx + STEM_WIDTH / 2, PAD + PILL_HEIGHT - 1);
    ctx.lineWidth = borderWidth;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
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
  const width = pillWidth + PAD * 2;

  canvas.width = width * SCALE;
  canvas.height = HEIGHT * SCALE;
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.font = font; // canvas resize resets state

  paintPill(ctx, pillWidth, VENUE_PILL_STYLES[state]);

  ctx.fillStyle = VENUE_TEXT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name, width / 2, PAD + PILL_HEIGHT / 2);

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

const NINE_SLICE_WIDTH = PILL_WIDTH + PAD * 2;

const CONTENT_DESIGN: [number, number, number, number] = [
  16 + PAD,
  6 + PAD,
  48 + PAD,
  24 + PAD,
];
const STRETCH_X_DESIGN: [number, number][] = [
  [16 + PAD, 23 + PAD],
  [41 + PAD, 48 + PAD],
];
const STRETCH_Y_DESIGN: [number, number][] = [[14 + PAD, 16 + PAD]];

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
    strokeStem: true,
  });
  return { ...asset, pixelRatio: asset.pixelRatio * DINING_PILL_DOWNSCALE };
}
