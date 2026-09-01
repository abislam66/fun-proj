/**
 * Per-zone name plate: a solid color-coded badge (one hue per zone, from
 * `MAP_ZONES[key].color`) with a small glyph, the zone's live spot count,
 * and a stem pointing at the zone's actual map coordinate — the campus
 * overview reads like a game map's region key instead of every zone
 * sharing one cherry hue. MapLibre draws every `icon-image` in a symbol
 * layer first, then every `text-field` — so a stretchable plate plus
 * live text lets one name bleed through the next plate. Baking text into
 * the sprite means overlapping labels occlude cleanly instead.
 */

import type { MapZoneIcon } from "@/config/map-zones";

const SCALE = 3;
const FONT_SIZE = 11;
const COUNT_FONT_SIZE = 9;
const PAD_X = 10;
const PAD_Y = 6;
const ICON_SIZE = 9;
const ICON_GAP = 5;
const RADIUS = 6;
const BORDER = 1.5;
const STEM_WIDTH = 10;
const STEM_HEIGHT = 7;
// Margin above the plate for nothing in particular yet, kept symmetric
// with venue-pill-icon.ts's PAD so both sprite kinds share a layout idiom.
const PAD = 4;

const STROKE = "#ffffff";
const TEXT = "#ffffff";

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

function labelFont(size: number, weight = 700): string {
  const family =
    typeof document === "undefined"
      ? "sans-serif"
      : getComputedStyle(document.body).fontFamily || "sans-serif";
  return `${weight} ${size}px ${family}`;
}

/** Small white glyphs drawn at (0,0)-(ICON_SIZE,ICON_SIZE), stroke-only so they read at badge scale. */
function paintIcon(ctx: CanvasRenderingContext2D, icon: MapZoneIcon) {
  ctx.save();
  ctx.strokeStyle = "#ffffff";
  ctx.fillStyle = "#ffffff";
  ctx.lineWidth = 1.1;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const s = ICON_SIZE;
  if (icon === "star") {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const outerAngle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const innerAngle = outerAngle + Math.PI / 5;
      const ox = s / 2 + (s / 2) * Math.cos(outerAngle);
      const oy = s / 2 + (s / 2) * Math.sin(outerAngle);
      const ix = s / 2 + (s / 4.2) * Math.cos(innerAngle);
      const iy = s / 2 + (s / 4.2) * Math.sin(innerAngle);
      if (i === 0) ctx.moveTo(ox, oy);
      else ctx.lineTo(ox, oy);
      ctx.lineTo(ix, iy);
    }
    ctx.closePath();
    ctx.fill();
  } else if (icon === "truck") {
    ctx.beginPath();
    ctx.roundRect(0, s * 0.25, s * 0.62, s * 0.4, 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(s * 0.6, s * 0.4, s * 0.36, s * 0.25, 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(s * 0.28, s * 0.72, s * 0.13, 0, Math.PI * 2);
    ctx.arc(s * 0.78, s * 0.72, s * 0.13, 0, Math.PI * 2);
    ctx.fill();
  } else if (icon === "walk") {
    ctx.beginPath();
    ctx.arc(s * 0.52, s * 0.18, s * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.52, s * 0.36);
    ctx.lineTo(s * 0.52, s * 0.62);
    ctx.lineTo(s * 0.3, s * 0.95);
    ctx.moveTo(s * 0.52, s * 0.62);
    ctx.lineTo(s * 0.72, s * 0.9);
    ctx.moveTo(s * 0.3, s * 0.48);
    ctx.lineTo(s * 0.72, s * 0.42);
    ctx.stroke();
  } else {
    // "food" — a fork+knife crossed over a plate rim.
    ctx.beginPath();
    ctx.arc(s * 0.5, s * 0.55, s * 0.42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.3, s * 0.15);
    ctx.lineTo(s * 0.7, s * 0.85);
    ctx.moveTo(s * 0.7, s * 0.15);
    ctx.lineTo(s * 0.3, s * 0.85);
    ctx.stroke();
  }
  ctx.restore();
}

/** One opaque badge: color fill + icon + "LABEL" + "N SPOTS" + a stem pointing at the coordinate. */
export function buildZoneLabelIcon(
  label: string,
  count: number,
  fill: string,
  icon: MapZoneIcon,
): ZoneLabelIconAsset {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  const titleFont = labelFont(FONT_SIZE);
  const countFont = labelFont(COUNT_FONT_SIZE, 600);
  const titleText = label.toUpperCase();
  const countText = `${count} SPOT${count === 1 ? "" : "S"}`;

  ctx.font = titleFont;
  const titleWidth = ctx.measureText(titleText).width;
  ctx.font = countFont;
  const countWidth = ctx.measureText(countText).width;
  const textBlockWidth = Math.max(titleWidth, countWidth);

  const plateW = Math.ceil(
    PAD_X * 2 + ICON_SIZE + ICON_GAP + textBlockWidth + BORDER,
  );
  const plateH = Math.ceil(FONT_SIZE + COUNT_FONT_SIZE + PAD_Y * 2.4 + BORDER);
  const width = plateW + PAD * 2;
  const height = PAD + plateH + STEM_HEIGHT;

  canvas.width = width * SCALE;
  canvas.height = height * SCALE;
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);

  ctx.beginPath();
  ctx.roundRect(
    PAD + BORDER / 2,
    PAD + BORDER / 2,
    plateW - BORDER,
    plateH - BORDER,
    RADIUS,
  );
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = BORDER;
  ctx.strokeStyle = STROKE;
  ctx.stroke();

  // Stem — solid triangle, same fill, overlapping into the plate's bottom edge.
  const cx = width / 2;
  ctx.beginPath();
  ctx.moveTo(cx - STEM_WIDTH / 2, PAD + plateH - 1);
  ctx.lineTo(cx + STEM_WIDTH / 2, PAD + plateH - 1);
  ctx.lineTo(cx, PAD + plateH + STEM_HEIGHT - 1);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.save();
  ctx.translate(PAD + PAD_X, PAD + (plateH - ICON_SIZE) / 2);
  paintIcon(ctx, icon);
  ctx.restore();

  const textX = PAD + PAD_X + ICON_SIZE + ICON_GAP;
  ctx.fillStyle = TEXT;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = titleFont;
  ctx.fillText(titleText, textX, PAD + plateH / 2 - COUNT_FONT_SIZE * 0.55);
  ctx.font = countFont;
  ctx.globalAlpha = 0.85;
  ctx.fillText(countText, textX, PAD + plateH / 2 + FONT_SIZE * 0.55);
  ctx.globalAlpha = 1;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  return {
    width: canvas.width,
    height: canvas.height,
    data: imageData.data,
    pixelRatio: SCALE,
  };
}
