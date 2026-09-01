/**
 * Per-zone name plate: a solid color-coded badge (one hue per zone, from
 * `MAP_ZONES[key].color`) with a small icon chip, the zone's live spot
 * count, and a leader-line-and-dot stem pointing at the zone's actual map
 * coordinate — styled like a retro/pixel-computer game-map region key
 * (hard dark outline, flat offset drop shadow, no blur) rather than a
 * soft modern pill. MapLibre draws every `icon-image` in a symbol layer
 * first, then every `text-field` — so a stretchable plate plus live text
 * lets one name bleed through the next plate. Baking text into the
 * sprite means overlapping labels occlude cleanly instead.
 */

import type { MapZoneIcon } from "@/config/map-zones";

const SCALE = 3;
const FONT_SIZE = 11;
const COUNT_FONT_SIZE = 9;
const PAD_X = 8;
const PAD_Y = 6;
const ICON_SIZE = 9;
const ICON_CHIP_PAD = 3;
const ICON_GAP = 6;
const RADIUS = 3;
const BORDER = 1.25;
const STEM_LINE_WIDTH = 2.5;
const STEM_LINE_HEIGHT = 9;
const STEM_DOT_RADIUS = 3;
const SHADOW_OFFSET = 2;
const SHADOW_COLOR = "rgba(23, 19, 16, 0.4)";
// Margin around the whole plate so its border/shadow never clip.
const PAD = 4;

const INK = "#171310";
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

function darken(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  const value = parseInt(clean, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  const f = 1 - amount;
  return `rgb(${Math.round(r * f)}, ${Math.round(g * f)}, ${Math.round(b * f)})`;
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
  } else if (icon === "cap") {
    // Mortarboard: flattened diamond top + small base + tassel.
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.1);
    ctx.lineTo(s * 0.94, s * 0.36);
    ctx.lineTo(s * 0.5, s * 0.62);
    ctx.lineTo(s * 0.06, s * 0.36);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(s * 0.32, s * 0.48, s * 0.36, s * 0.26, 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.8, s * 0.4);
    ctx.lineTo(s * 0.8, s * 0.68);
    ctx.lineTo(s * 0.88, s * 0.8);
    ctx.stroke();
  } else if (icon === "binoculars") {
    ctx.beginPath();
    ctx.arc(s * 0.3, s * 0.62, s * 0.24, 0, Math.PI * 2);
    ctx.arc(s * 0.7, s * 0.62, s * 0.24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(s * 0.4, s * 0.3, s * 0.2, s * 0.24, 0.5);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.28, s * 0.4);
    ctx.lineTo(s * 0.2, s * 0.16);
    ctx.moveTo(s * 0.72, s * 0.4);
    ctx.lineTo(s * 0.8, s * 0.16);
    ctx.stroke();
  } else if (icon === "cup") {
    ctx.beginPath();
    ctx.roundRect(s * 0.16, s * 0.3, s * 0.56, s * 0.56, 1.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.72, s * 0.4);
    ctx.lineTo(s * 0.9, s * 0.4);
    ctx.lineTo(s * 0.9, s * 0.62);
    ctx.lineTo(s * 0.72, s * 0.62);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.32, s * 0.14);
    ctx.lineTo(s * 0.3, s * 0.24);
    ctx.moveTo(s * 0.48, s * 0.1);
    ctx.lineTo(s * 0.46, s * 0.22);
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

/**
 * One opaque badge: a flat color plate with a dark pixel-style outline
 * and hard offset shadow (no blur), a two-tone icon chip on the left,
 * "LABEL" + "N SPOTS" text, and a leader-line-and-dot stem pointing at
 * the true coordinate below.
 */
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

  const iconChipSize = ICON_SIZE + ICON_CHIP_PAD * 2;
  const plateW = Math.ceil(
    PAD_X * 0.6 + iconChipSize + ICON_GAP + textBlockWidth + PAD_X + BORDER,
  );
  const plateH = Math.ceil(
    Math.max(
      iconChipSize + PAD_Y * 0.6,
      FONT_SIZE + COUNT_FONT_SIZE + PAD_Y * 1.6,
    ) + BORDER,
  );
  const width = plateW + PAD * 2 + SHADOW_OFFSET;
  const height = PAD + plateH + STEM_LINE_HEIGHT + STEM_DOT_RADIUS * 2 + BORDER;

  canvas.width = width * SCALE;
  canvas.height = height * SCALE;
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);

  const plateX = PAD;
  const plateY = PAD;

  // Hard offset shadow — solid, no blur, the classic pixel-UI treatment.
  ctx.beginPath();
  ctx.roundRect(
    plateX + SHADOW_OFFSET,
    plateY + SHADOW_OFFSET,
    plateW - BORDER,
    plateH - BORDER,
    RADIUS,
  );
  ctx.fillStyle = SHADOW_COLOR;
  ctx.fill();

  // Plate.
  ctx.beginPath();
  ctx.roundRect(
    plateX + BORDER / 2,
    plateY + BORDER / 2,
    plateW - BORDER,
    plateH - BORDER,
    RADIUS,
  );
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = BORDER;
  ctx.strokeStyle = INK;
  ctx.stroke();

  // Icon chip — a darker tone of the same hue, giving the badge a
  // two-tone "windowed" look instead of one flat block of color.
  const chipX = plateX + PAD_X * 0.3;
  const chipY = plateY + (plateH - iconChipSize) / 2;
  ctx.beginPath();
  ctx.roundRect(chipX, chipY, iconChipSize, iconChipSize, RADIUS * 0.6);
  ctx.fillStyle = darken(fill, 0.22);
  ctx.fill();
  ctx.lineWidth = BORDER * 0.8;
  ctx.strokeStyle = INK;
  ctx.stroke();

  ctx.save();
  ctx.translate(chipX + ICON_CHIP_PAD, chipY + ICON_CHIP_PAD);
  paintIcon(ctx, icon);
  ctx.restore();

  const textX = chipX + iconChipSize + ICON_GAP;
  ctx.fillStyle = TEXT;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = titleFont;
  ctx.fillText(titleText, textX, plateY + plateH / 2 - COUNT_FONT_SIZE * 0.55);
  ctx.font = countFont;
  ctx.globalAlpha = 0.85;
  ctx.fillText(countText, textX, plateY + plateH / 2 + FONT_SIZE * 0.55);
  ctx.globalAlpha = 1;

  // Stem — a thin leader line ending in a small dot exactly at the true
  // coordinate (the sprite's `icon-anchor: "bottom"`), rather than a wide
  // triangle notch, so it reads as a map pin lead rather than a speech-
  // bubble tail.
  const cx = plateX + plateW / 2;
  const stemTopY = plateY + plateH;
  const stemBottomY = stemTopY + STEM_LINE_HEIGHT;
  ctx.beginPath();
  ctx.moveTo(cx, stemTopY);
  ctx.lineTo(cx, stemBottomY);
  ctx.lineWidth = STEM_LINE_WIDTH;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, stemBottomY + STEM_DOT_RADIUS, STEM_DOT_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = BORDER;
  ctx.strokeStyle = INK;
  ctx.stroke();

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  return {
    width: canvas.width,
    height: canvas.height,
    data: imageData.data,
    pixelRatio: SCALE,
  };
}
