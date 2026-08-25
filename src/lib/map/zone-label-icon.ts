/**
 * Stretchable label plate for map-zone names. Cherry-soft fill + cherry
 * outline, matching `MAP_ZONE_MARK.buildingFill` — not a cuisine pill
 * (no stem, not solid cherry).
 */

const SCALE = 3;
const PLATE_WIDTH = 48;
const PLATE_HEIGHT = 24;
const RADIUS = 6;
const BORDER = 2;
const PAD = 2;
const WIDTH = PLATE_WIDTH + PAD * 2;
const HEIGHT = PLATE_HEIGHT + PAD * 2;

const FILL = "#E8D4D8";
const STROKE = "#9D2235";

export const ZONE_LABEL_ICON = "map-zone-label-plate";

export type ZoneLabelIconAsset = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  pixelRatio: number;
  content: [number, number, number, number];
  stretchX: [number, number][];
  stretchY: [number, number][];
};

export function buildZoneLabelIcon(): ZoneLabelIconAsset {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * SCALE;
  canvas.height = HEIGHT * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  ctx.scale(SCALE, SCALE);
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  ctx.beginPath();
  ctx.roundRect(
    PAD + BORDER / 2,
    PAD + BORDER / 2,
    PLATE_WIDTH - BORDER,
    PLATE_HEIGHT - BORDER,
    RADIUS,
  );
  ctx.fillStyle = FILL;
  ctx.fill();
  ctx.lineWidth = BORDER;
  ctx.strokeStyle = STROKE;
  ctx.stroke();

  const imageData = ctx.getImageData(0, 0, WIDTH * SCALE, HEIGHT * SCALE);

  return {
    width: WIDTH * SCALE,
    height: HEIGHT * SCALE,
    data: imageData.data,
    pixelRatio: SCALE,
    content: [
      (PAD + 8) * SCALE,
      (PAD + 5) * SCALE,
      (PAD + PLATE_WIDTH - 8) * SCALE,
      (PAD + PLATE_HEIGHT - 5) * SCALE,
    ],
    stretchX: [[(PAD + 12) * SCALE, (PAD + PLATE_WIDTH - 12) * SCALE]],
    stretchY: [[(PAD + 8) * SCALE, (PAD + PLATE_HEIGHT - 8) * SCALE]],
  };
}
