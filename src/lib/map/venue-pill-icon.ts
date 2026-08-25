/**
 * Canvas-drawn, 9-slice-ready pill+stem icons for the map's symbol
 * layers — generated at runtime so no binary asset is checked in. The
 * cherry venue variants (normal / hover border / selected border +
 * cherry halo ring) and the neutral campus-dining variant share one
 * drawing routine; each is registered once via `map.addImage`, then
 * MapLibre's `icon-text-fit` stretches it per-feature to fit its label,
 * using the `stretchX`/`stretchY` bands below to keep the rounded caps
 * and stem crisp while only the flat mid-sections grow.
 */

const SCALE = 3; // raster oversample for crisp rendering at typical zoom
const PILL_WIDTH = 64;
const PILL_HEIGHT = 28;
const STEM_WIDTH = 14;
const STEM_HEIGHT = 10;
// Margin above/beside the pill so the selected halo isn't clipped. No
// margin below: the stem tip must stay at the bitmap's bottom edge —
// it is the map coordinate (icon-anchor: bottom).
const PAD = 4;
const HALO_WIDTH = 2.5;
const WIDTH = PILL_WIDTH + PAD * 2;
const HEIGHT = PAD + PILL_HEIGHT + STEM_HEIGHT;
const RADIUS = PILL_HEIGHT / 2;

const VENUE_FILL = "#9D2235"; // --color-cherry
const VENUE_STROKE = "#ffffff";
const VENUE_HALO = "rgba(157, 34, 53, 0.28)";

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

export const PILL_ICON_NORMAL = "venue-pill";
export const PILL_ICON_HOVER = "venue-pill-hover";
export const PILL_ICON_SELECTED = "venue-pill-selected";
export const DINING_PILL_ICON = "campus-dining-pill";

// `content`/`stretchX`/`stretchY` are specified in the raw bitmap's own
// pixel space (i.e. WIDTH*SCALE / HEIGHT*SCALE) — NOT the unscaled design
// units used above. Defined here in design units (pill offset by PAD),
// then scaled below.
const CONTENT_DESIGN: [number, number, number, number] = [
  18 + PAD,
  6 + PAD,
  46 + PAD,
  22 + PAD,
];
const STRETCH_X_DESIGN: [number, number][] = [
  [16 + PAD, 23 + PAD],
  [41 + PAD, 48 + PAD],
];
const STRETCH_Y_DESIGN: [number, number][] = [[13 + PAD, 15 + PAD]];

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
  const { fill, stroke, borderWidth, halo, strokeStem } = style;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * SCALE;
  canvas.height = HEIGHT * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  ctx.scale(SCALE, SCALE);
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // Selected-only halo — a soft cherry ring outside the white border,
  // matching DESIGN.md's "thicker white ring" + glow treatment so the
  // selected pill reads differently from a merely hovered one.
  if (halo) {
    ctx.beginPath();
    ctx.roundRect(
      PAD - HALO_WIDTH,
      PAD - HALO_WIDTH,
      PILL_WIDTH + HALO_WIDTH * 2,
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
    PILL_WIDTH - borderWidth,
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
  const cx = WIDTH / 2;
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

  const imageData = ctx.getImageData(0, 0, WIDTH * SCALE, HEIGHT * SCALE);

  return {
    width: WIDTH * SCALE,
    height: HEIGHT * SCALE,
    data: imageData.data,
    pixelRatio: SCALE,
    content: CONTENT,
    stretchX: STRETCH_X,
    stretchY: STRETCH_Y,
  };
}

export function buildPillIcons(): {
  normal: PillIconAsset;
  hover: PillIconAsset;
  selected: PillIconAsset;
} {
  const venue = { fill: VENUE_FILL, stroke: VENUE_STROKE };
  return {
    normal: drawPill({ ...venue, borderWidth: 2 }),
    hover: drawPill({ ...venue, borderWidth: 3 }),
    selected: drawPill({ ...venue, borderWidth: 3, halo: VENUE_HALO }),
  };
}

/** Neutral, non-interactive pill for meal-plan dining info pins. */
export function buildDiningPillIcon(): PillIconAsset {
  return drawPill({
    fill: DINING_FILL,
    stroke: DINING_STROKE,
    borderWidth: 1.5,
    strokeStem: true,
  });
}
