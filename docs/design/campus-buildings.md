# Campus buildings — custom 2D design (research + approach)

How TuEats can give **every Temple main-campus building its own 2D look** on the MapLibre map, without leaving the existing stack (MapLibre GL JS 5 + OpenFreeMap).

Visual source of truth remains [`DESIGN.md`](../../DESIGN.md). Pin notes: [`map-and-pins.md`](./map-and-pins.md). Seed data: [`public/maps/campus-buildings.geojson`](../../public/maps/campus-buildings.geojson).

---

## What we have today

| Piece | Role | Customizable? |
|-------|------|----------------|
| **MapLibre GL JS** | Client renderer (vector tiles + GeoJSON + HTML markers) | Yes — layers, paint, expressions, runtime mutation |
| **OpenFreeMap Positron** | Hosted style JSON + planet vector tiles | Partially — fork/host style, or mutate after `load` |
| **OpenMapTiles `building` layer** | Anonymous footprints (`render_height`, `colour`, …) | Global look only — **no building names** |
| **Cuisine pill markers** | Venue pins (our data) | Fully ours |

Positron’s stock building paint (from the live style):

```json
{
  "id": "building",
  "type": "fill",
  "source-layer": "building",
  "paint": {
    "fill-color": "rgb(234, 234, 229)",
    "fill-outline-color": "rgb(219, 219, 218)"
  }
}
```

Liberty adds a `building-3d` `fill-extrusion` layer. We stay **2D** (`fill` + `line` + `symbol` labels) so cuisine pills stay readable and pitch stays flat (`pitchWithRotate: false`).

---

## Library / tooling landscape (what to tweak)

### 1. MapLibre Style Spec + Maputnik (basemap fork)

OpenFreeMap’s documented path: open Positron in [Maputnik](https://maplibre.org/maputnik/), restyle layers, **export JSON**, host it yourself, point `NEXT_PUBLIC_MAP_STYLE_URL` at it.

**Good for:** global campus atmosphere — land/water/road colors matching Cherry Compass (`--color-map-land`, `--color-map-water`), hide noisy highway shields, quieter place labels.

**Not enough alone for “every building custom”:** OpenMapTiles buildings don’t carry `name`. You cannot write `match → "Charles Library" → special fill` against the planet tiles.

### 2. Runtime style mutation (`setPaintProperty` / `setLayoutProperty`)

After `map.on('load')`, mute or recolor stock layers without hosting a fork.

**Good for:** quick experiments (already used to fade the stock `building` layer under our overlay).

**Limits:** still no per-named-building identity from tiles.

### 3. Curated GeoJSON overlay (recommended for custom buildings)

Ship a FeatureCollection of named footprints. Each feature owns design tokens:

| Property | Purpose |
|----------|---------|
| `name` / `label` | Full name + short map label |
| `category` | academic / library / student-life / housing / parking / retail / landmark / other |
| `fill` / `stroke` / `labelColor` | Per-feature 2D paint (override anytime) |
| `osmId` | Stable id for future `feature-state` hover |

MapLibre then uses data-driven expressions:

```js
"fill-color": ["coalesce", ["get", "fill"], "#EAE9E4"]
```

**Why this fits TuEats:** campus bbox is tiny (~52 named buildings in the seed). GeoJSON loads once, stays under the pin layer, needs no tile server, stays $0, and keeps `NEXT_PUBLIC_MAP_STYLE_URL` as the basemap swap point.

### 4. Other libraries (evaluated, not adopted)

| Option | Verdict |
|--------|---------|
| Leaflet + raster tiles | Weaker vector styling; would abandon MapLibre stack already shipping |
| Mapbox GL / paid styles | Budget + key; conflicts with OpenFreeMap constraint |
| Protomaps / self-hosted PMTiles | Powerful for full custom tiles; overkill while GeoJSON covers campus |
| deck.gl / custom WebGL | Extra weight; Lighthouse mobile ≥90 budget already tight with MapLibre |
| `fill-extrusion` 3D | Explicitly out of scope for this pass (2D only) |

Stay on **MapLibre + OpenFreeMap tiles + our GeoJSON**.

---

## Recommended architecture

```
OpenFreeMap Positron (muted stock buildings)
        │
        ▼
CampusBuildingLayer  ← public/maps/campus-buildings.geojson
  fill + outline + labels (data-driven paint)
        │
        ▼
VenuePinLayer (cuisine pills) + locate blue-dot
```

Implementation: `src/components/map/campus-building-layer.tsx`, mounted from `VenueMap` after style load.

### Per-building “custom design” levels

1. **Category palette (shipped seed)** — academic cool stone, library water-tint, student-life soft cherry wash, etc.
2. **Per-feature overrides** — edit one building’s `fill` / `stroke` / `label` in the GeoJSON (e.g. Charles Library unique tint).
3. **Later (optional)** — `feature-state` hover, pattern fills, or SVG/icon at centroid for a handful of icons (Bell Tower). Still 2D.

Do **not** put Temple trademarks / owl marks on buildings (`DESIGN.md` anti-patterns).

---

## Data pipeline

1. Export OSM for campus bbox (`api.openstreetmap.org/api/0.6/map?bbox=…`).
2. Keep **named** `building=*` ways + multipolygon relations; drop anonymous sheds onto the muted basemap.
3. Classify → assign palette → short labels → write `public/maps/campus-buildings.geojson`.
4. Re-run when footprints change (semester walk / OSM updates). Treat like other curated assets — not auto-scraped at runtime.

Seed snapshot (2026-07-20 OSM extract): **52** named features after dedupe.

---

## Design notes (Cherry Compass)

- Buildings are **context**, not the hero — cuisine pills stay the loudest map signal.
- Category fills stay near `--color-map-land` / stone neutrals; only student-life / landmark get a soft cherry wash (not solid `#9D2235`).
- Labels: Satoshi lives in the UI chrome; map glyphs use OpenFreeMap **Noto Sans** (style glyphs constraint). Keep labels short; collision fades housing/parking first.
- Zones on the map use `MAP_ZONE_MARK.streetLine` / `MAP_ZONE_MARK.buildingFill` (`src/config/map-zones.ts`). List-filter `zone_key` is separate.

---

## Implementation checklist

- [x] Research MapLibre / OpenFreeMap / OpenMapTiles limits
- [x] Seed `public/maps/campus-buildings.geojson` with per-feature paint tokens
- [x] `CampusBuildingLayer` — mute stock buildings, draw fill/outline/labels
- [ ] Maputnik Positron fork (roads/land/water → DESIGN tokens) when basemap still feels too “generic Philly”
- [ ] Manual pass: shorten awkward labels, fix multipolygon holes, per-building hero tints for Student Center / Charles Library / Bell Tower
- [ ] Optional hover `feature-state` synced with venue “near {building}` copy

---

## Component mapping (additions)

| Component | Responsibility |
|-----------|----------------|
| `CampusBuildingLayer` | GeoJSON source + fill/line/symbol; mute basemap `building` |
| `public/maps/campus-buildings.geojson` | Curated footprints + design tokens |
| `VenueMap` | Orchestrates basemap → buildings → pins |
