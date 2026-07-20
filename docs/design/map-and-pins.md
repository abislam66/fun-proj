# Map & pin implementation notes (Phase 1)

Source of truth for visual decisions: root [`DESIGN.md`](../../DESIGN.md). Assets: [`public/pins/`](../../public/pins/).

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

- Approx: lat `39.979`–`39.984`, lng `-75.157`–`-75.150`
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

Campus zones are **list/filter language** in v1. No zone polygon fills on the map.

## Pins — cuisine only

### Design

Cherry **pill + stem**. White label text = short primary cuisine (Halal, Mex, Amer, Chin, Fruit, Carib, Food). Same cherry fill for every venue — do not recolor by open/closed.

**Decision split:**

| Surface | Helps answer |
|---------|----------------|
| Pin | What kind of food is here? |
| Mini-card / list | Name, open status, zone, payment |
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

Pin tap → sheet peeks: **name, cuisine tags, open-status badge**. Second tap → `/eat/[slug]`.

### Motion

- **GSAP** (dynamic import after map load): one-shot stagger of pills into place; skip if `prefers-reduced-motion`
- **Framer Motion:** selected pill scale / ring
- Open-status motion stays on badges, not pins

### Phase 3 venue types

Keep cuisine pills. Don’t invent truck-only pin components.

## Component mapping

| Component | Responsibility |
|-----------|----------------|
| `VenueMap` | MapLibre init, style URL, bounds, controls shell |
| `CampusBuildingLayer` | Curated campus footprints + labels (GeoJSON, 2D) |
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
- [ ] Pins match `public/pins/` + `DESIGN.md`
