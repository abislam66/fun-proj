# Map & pin implementation notes (Phase 1)

Source of truth for visual decisions: [`Context/DESIGN.md`](../../Context/DESIGN.md). Assets: [`public/pins/`](../../public/pins/).

## Basemap

| Item | Value |
|------|--------|
| Provider | OpenFreeMap (no key, no billing) |
| Style | **Positron** — muted land so cherry cuisine pills dominate |
| URL | `https://tiles.openfreemap.org/styles/positron` |
| Env | `NEXT_PUBLIC_MAP_STYLE_URL` — single swap point if the public instance degrades |
| Library | MapLibre GL JS 5.x, dynamically imported client component |

### Viewport

Center and fit the **campus bounding box** only (never Philly-wide):

- Approx: lat `39.971`–`39.984`, lng `-75.161`–`-75.150` (west-of-Broad athletics + Girard sports complex)
- Canonical values live in `src/config/site.ts` when scaffolded (`CAMPUS_BOUNDS`, default zoom ~15–16)

### Chrome

- Custom zoom ± and locate controls: Satoshi, `--color-surface` fill, `--color-border`, cherry focus ring
- Attribution: OpenStreetMap + OpenFreeMap, visible but quiet (Feature 1 AC)
- Locate me: browser geolocation → MapLibre blue-dot only; **never** POST location to our servers

### Clutter

Phase 1 ships stock Positron. If base POI icons compete with our pills, fork the style in Maputnik later.

### Campus buildings (2D custom)

Named Temple footprints are a curated GeoJSON overlay (`public/maps/campus-buildings.geojson`) with per-feature fill/stroke/label tokens — not the anonymous OpenMapTiles `building` layer (which has no names). Stock Positron buildings are muted underneath. Full research + tweak options: [`campus-buildings.md`](./campus-buildings.md). Stay 2D (no `fill-extrusion`).

### Zones

Campus overview draws **map zones**, not every venue pin. Two marks, named in `src/config/map-zones.ts`:

| Variable | What it draws | Zones |
|----------|---------------|-------|
| `MAP_ZONE_MARK.streetLine` | Cherry corridor (casement + core line) | Student Center, W Montgomery, SERC trucks, Tyler trucks |
| `MAP_ZONE_MARK.buildingFill` | Cherry wash + outline | Vantage & The View (buildings); The Wall (plaza west of Anderson, not Anderson); Richie's Cafe (cafe footprint only, not Facilities); Liacouras Walk (1926–1938 building only, not 1940 Residence Hall) |

Click a zone → fly in → venue pills whose coordinates fall inside that zone. List-filter `zone_key` (`norris` / `montgomery` / `twelfth`) is unrelated. Zone names use a light cherry plate (`#F3E6E9`) with a thin cherry outline — the same family as `buildingFill`, not a white text halo. Each name is an opaque sprite so overlapping plates cover each other instead of blending.

## Pins — cuisine only

### Design

Cherry **pill + stem**. White label text = short primary cuisine (Halal, Mex, Amer, Chin, Fruit, Carib, Food). Same cherry fill for every venue — do not recolor by open/closed.

**Decision split:**

| Surface | Helps answer |
|---------|----------------|
| Pin | What kind of food is here? |
| Mini-card / list | Name, open status, payment (zone line on list rows only — the mini-card never shows address/zone, that's detail-page info) |
| Detail | Full story |

### Label source

`venue.cuisines[0]` → abbrev from `config/cuisines.ts` (see `public/pins/README.md`). Multiple tags → primary only on the pin; full tags on list/detail.

### Rendering strategy

```
For each published venue:
  HTML Marker (or symbol with text field)
    └─ CuisinePill { label, selected }
User location → separate blue-dot Marker
```

At ~40 trucks, HTML Markers with a shared React pill component are fine and make dynamic labels easy. If venue count grows into the hundreds, move to a symbol layer + SDF or pre-rasterized sprites per cuisine key.

**Anchor:** Stem tip → `anchor: 'bottom'`.

### Density (Norris / Montgomery)

- Overview: collision fade or light cluster so pills don’t become an untappable blob
- Street zoom (~16+): every pill individually tappable (Feature 1 AC)

### Mini-card

Pin tap → popup anchored above the pill: **name, cuisine tags, open-status badge, price range, → arrow disc** (no "View details" text — the wordless disc is the navigation affordance; sr-only text covers screen readers). The whole card links to `/eat/[slug]`. Price is currently a hardcoded `$12` placeholder (`PLACEHOLDER_PRICE_RANGE` in venue-map.tsx).

### Motion

- **GSAP** (dynamic import after map load): one-shot stagger of pills into place; skip if `prefers-reduced-motion`
- **Framer Motion:** selected pill scale / ring
- Open-status motion stays on badges, not pins

### Phase 3 venue types

Keep cuisine pills. Don’t invent truck-only pin components.

## Meal-plan dining info pins

Meal-plan dining (Student Center food court, J&H dining hall, Morgan Hall food court) is out of scope — those places are **not venues** and never enter the DB. So the big food buildings don’t read as mysteriously empty, each gets exactly **one** info pin naming what’s there.

| Aspect | Value |
|--------|-------|
| Data | `src/config/campus-dining.ts` — static markers on footprint centroids (Morgan pin sits between the North/South towers where the dining floor is) |
| Look | Same pill+stem silhouette at 2/3 venue-pill scale (same bitmap registered at a higher pixelRatio); white surface fill, stone `#B8B4AA` border (matches building strokes), ink-secondary `#57534E` regular-weight text; whole layer at 65% `icon-opacity`/`text-opacity` so the static pins visibly recede behind zone marks and venue pills |
| Behavior | Non-interactive: no hover, no click, no mini-card. Map-background clicks through them clear selection like any other map click |
| Zones | Zoom-gated: layer `minzoom` 16 hides them at the campus overview (zoom 14.6) — they appear only at building-scale zoom. Hidden entirely (`visible` prop) once a zone is selected so venue pills take over |
| Collision | Placed like zone labels: `icon/text-allow-overlap: true` + `ignore-placement` — always render once past `minzoom` (building labels at the same centroids would otherwise collide them away) |
| Rendering | `CampusDiningLayer` symbol layer; icon from `buildDiningPillIcon()` in `venue-pill-icon.ts` (shared 9-slice drawing routine) |

### Overlay paint order

TuEats overlays always sit **above** the Positron basemap (including OSM road names). Paint order is `src/lib/map/overlay-order.ts`, bottom → top: campus buildings → map zones → dining info pins → venue pills. `liftOverlaysAboveBasemap` re-stacks those layers after each mount so a remount cannot leave a road label covering a pin, plate, or fill.

## Component mapping

| Component | Responsibility |
|-----------|----------------|
| `VenueMap` | MapLibre init, style URL, bounds, controls shell |
| `CampusBuildingLayer` | Curated campus footprints + labels (GeoJSON, 2D) |
| `CampusDiningLayer` | Neutral one-per-building info pins for meal-plan dining halls |
| `VenuePinLayer` | Markers / symbols; maps primary cuisine → pill label |
| `CuisinePill` | Shared pin chrome + label text |
| `LocateControl` | Client geolocation + blue-dot marker |
| `MapAttribution` | Required attribution UI |

## Checklist before shipping map UI

- [ ] Default viewport is campus bbox
- [ ] Interactive &lt;2s on mid-range phone (lazy MapLibre)
- [ ] Every pin shows a cuisine label (or “Food”)
- [ ] Open status is **not** encoded on the pin color
- [ ] Attribution visible
- [ ] Location never leaves the browser
- [ ] Pins match `public/pins/` + `Context/DESIGN.md`
