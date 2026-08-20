/**
 * Canvas-drawn, 9-slice-ready pill+stem icon for the venue map layer —
 * generated at runtime so no binary asset is checked in. Two variants
 * (normal / emphasized border for selected+hover) are registered once via
 * `map.addImage`; MapLibre's `icon-text-fit` then stretches each per-feature
 * to fit the venue name, using the `stretchX`/`stretchY` bands below to keep
 * the rounded caps and stem crisp while only the flat mid-sections grow.
 */

const SCALE = 3; // raster oversample for crisp rendering at typical zoom
const WIDTH = 64;
const PILL_HEIGHT = 28;
const STEM_WIDTH = 14;
const STEM_HEIGHT = 10;
const HEIGHT = PILL_HEIGHT + STEM_HEIGHT;
const RADIUS = PILL_HEIGHT / 2;
const FILL = "#9D2235";
const STROKE = "#ffffff";

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
export const PILL_ICON_SELECTED = "venue-pill-selected";

// `content`/`stretchX`/`stretchY` are specified in the raw bitmap's own
// pixel space (i.e. WIDTH*SCALE / HEIGHT*SCALE) — NOT the unscaled design
// units used above. Defined here in design units, then scaled below.
const CONTENT_DESIGN: [number, number, number, number] = [18, 6, 46, 22];
const STRETCH_X_DESIGN: [number, number][] = [
  [16, 23],
  [41, 48],
];
const STRETCH_Y_DESIGN: [number, number][] = [[13, 15]];

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

function drawPill(borderWidth: number): PillIconAsset {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * SCALE;
  canvas.height = HEIGHT * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  ctx.scale(SCALE, SCALE);
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // Pill body — full stadium, fill + stroke on all sides.
  ctx.beginPath();
  ctx.roundRect(
    borderWidth / 2,
    borderWidth / 2,
    WIDTH - borderWidth,
    PILL_HEIGHT - borderWidth,
    RADIUS - borderWidth / 2,
  );
  ctx.fillStyle = FILL;
  ctx.fill();
  ctx.lineWidth = borderWidth;
  ctx.strokeStyle = STROKE;
  ctx.stroke();

  // Stem — solid triangle, no stroke, overlapping 1px into the pill's
  // bottom edge so the border reads as "opening up" around it.
  const cx = WIDTH / 2;
  ctx.beginPath();
  ctx.moveTo(cx - STEM_WIDTH / 2, PILL_HEIGHT - 1);
  ctx.lineTo(cx + STEM_WIDTH / 2, PILL_HEIGHT - 1);
  ctx.lineTo(cx, PILL_HEIGHT + STEM_HEIGHT - 1);
  ctx.closePath();
  ctx.fillStyle = FILL;
  ctx.fill();

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
  selected: PillIconAsset;
} {
  return {
    normal: drawPill(2),
    selected: drawPill(3),
  };
}
