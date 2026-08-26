/**
 * Per-zone name plate: opaque light-cherry fill, thin cherry outline, and
 * the label painted into the same bitmap. MapLibre draws every `icon-image`
 * in a symbol layer first, then every `text-field` — so a stretchable
 * plate plus live text lets one name bleed through the next plate.
 * Baking text into the sprite means overlapping labels occlude.
 */

const SCALE = 3;
const FONT_SIZE = 12;
const PAD_X = 10;
const PAD_Y = 5;
const RADIUS = 6;
const BORDER = 1.5;

const FILL = "#F3E6E9";
const STROKE = "#9D2235";
const TEXT = "#9D2235";

export type ZoneLabelIconAsset = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  pixelRatio: number;
};

export const ZONE_LABEL_ICON_PREFIX = "map-zone-label-";

export function zoneLabelIconId(zoneKey: string): string {
  return `${ZONE_LABEL_ICON_PREFIX}${zoneKey}`;
}

function labelFont(): string {
  const family =
    typeof document === "undefined"
      ? "sans-serif"
      : getComputedStyle(document.body).fontFamily || "sans-serif";
  return `700 ${FONT_SIZE}px ${family}`;
}

export function buildZoneLabelIcon(label: string): ZoneLabelIconAsset {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  const font = labelFont();
  ctx.font = font;
  const textWidth = ctx.measureText(label).width;
  const plateW = Math.ceil(textWidth + PAD_X * 2 + BORDER);
  const plateH = Math.ceil(FONT_SIZE + PAD_Y * 2 + BORDER);

  canvas.width = plateW * SCALE;
  canvas.height = plateH * SCALE;
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.font = font;

  ctx.beginPath();
  ctx.roundRect(
    BORDER / 2,
    BORDER / 2,
    plateW - BORDER,
    plateH - BORDER,
    RADIUS,
  );
  ctx.fillStyle = FILL;
  ctx.fill();
  ctx.lineWidth = BORDER;
  ctx.strokeStyle = STROKE;
  ctx.stroke();

  ctx.fillStyle = TEXT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, plateW / 2, plateH / 2);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  return {
    width: canvas.width,
    height: canvas.height,
    data: imageData.data,
    pixelRatio: SCALE,
  };
}
