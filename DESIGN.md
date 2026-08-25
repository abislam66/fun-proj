# Design System — TuEats

## Product Context

- **What this is:** An unofficial guide to off-meal-plan food around Temple University's main campus — map + list, starting with food trucks.
- **Who it's for:** Students (and campus community) deciding where to eat — primarily on a phone between classes, also on laptop/desktop when browsing from a dorm, library, or showing the project.
- **Space/industry:** Campus food discovery / local map utilities (peers: Google Maps place search, Yelp map+list, campus dining maps).
- **Project type:** Responsive web utility — **mobile-first in priority and constraints**, **desktop as a first-class surface** (portfolio-quality, not a stretched phone layout).
- **Responsive posture:** Design and ship for the sidewalk phone first (≤2 taps, Lighthouse mobile ≥90). Desktop must still feel intentional: split composition, hover/keyboard affordances, readable type, and a map that earns the large viewport. Reviewers and hiring managers will open this on a laptop — that experience is part of the product.

## Aesthetic Direction

- **Direction:** Cherry Compass — athletic-campus utility
- **Decoration level:** Intentional (restrained) — crisp SVG pins, muted basemap, no glow stacks or decorative blobs
- **Mood:** “I can decide in 10 seconds.” Confident, local, unofficial — not a sports storefront, not a food blog, not a scraped directory.
- **Reference patterns:** Google Maps–style non-modal bottom sheet (safe); cuisine-label cherry pills on a muted Positron map (deliberate risk)

## Typography

- **Display / Hero / Wordmark / Venue titles:** Cabinet Grotesk (Fontshare) — modern geometric, athletic without Inter
- **Body / UI / Filters:** Satoshi (Fontshare) — clean, slightly rounded; works on phone and desktop
- **Data / Hours / Walking mins:** JetBrains Mono (tabular nums) — status reads like a readout, not marketing
- **Code:** JetBrains Mono
- **Loading:** Self-host woff2 via `next/font` or Fontshare download; latin subset only. Never load Inter / Roboto / system UI / Montserrat / Poppins as primary.
- **Scale (size / line-height):**

| Token | Mobile | Desktop (≥1024) |
|-------|--------|-----------------|
| Display | 32 / 40 | 40 / 48 |
| Title | 22 / 28 | 24 / 32 |
| Body | 16 / 24 | 16 / 24 |
| Small | 13 / 18 | 14 / 20 |
| Micro | 11 / 14 | 12 / 16 |

## Color

- **Approach:** Restrained — cherry is rare and meaningful (brand, selected pin, primary CTA). Status greens/ambers are semantic, never conflated with brand cherry.
- **Temple-adjacent, not official brand:** Cherry from public Owls / PMS 201 references. No Temple wordmark, “T” logo, or owl marks. Site always carries the unaffiliated disclaimer.

```css
:root {
  --color-cherry:        #9D2235; /* brand, selected pin, primary CTA */
  --color-cherry-hover:  #B52A3F;
  --color-cherry-deep:   #6E1826;
  --color-cherry-soft:   #F8ECEF; /* selected chip / ghost fill */

  --color-canvas:        #F5F5F4; /* cool stone — NOT cream #F4F1EA */
  --color-surface:       #FFFFFF;
  --color-surface-raised:#FAFAF9;
  --color-ink:           #1C1917;
  --color-ink-secondary: #57534E;
  --color-ink-muted:     #A8A29E;
  --color-border:        #E7E5E4;

  /* Status — soft; hours are hedged */
  --color-open:          #3F6F5A;
  --color-open-soft:     #E8F2EC;
  --color-closed:        #78716C;
  --color-closed-soft:   #F5F5F4;
  --color-unknown:       #A8A29E;
  --color-warning:       #B45309; /* semester-away, stale verify */
  --color-danger:        #B91C1C; /* form errors only */

  --color-map-land:      #EEEEEA;
  --color-map-water:     #D9E2E8;
}
```

- **Dark mode:** Not in Phase 1. If added later, redesign surfaces (ink canvas + cream type) — do not merely invert.

## Spacing

- **Base unit:** 8px
- **Density:** Comfortable on public surfaces; compact on admin
- **Scale:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64)

## Layout

- **Approach:** Hybrid — full-bleed map on home; strict grid on detail/admin. **Two composed layouts**, not one layout that “kind of works” everywhere.
- **Breakpoints:**
  - **Mobile (&lt;768):** Map + bottom sheet (primary product path)
  - **Tablet (768–1023):** Prefer sheet or a narrower split; don’t leave awkward half-states — pick the composition that keeps map + list simultaneously useful
  - **Desktop (≥1024):** Persistent **split explorer** — list/filters left (~38–42%), map right (~58–62%). No bottom sheet.
  - **Wide (≥1280):** Same split; optional max width on the list column (~420–480px) so rows stay scannable while the map keeps growing
- **Max content width:** Detail/about prose ~40rem (centered or left-aligned in a calm column); home explorer is **viewport-bound** on all sizes
- **Border radius:** sm 4px · md 8px · lg 12px · sheet top 16px · full 9999px (chips sparingly — prefer md on filter chips)

### Home (`/`) — mobile

Map is the first viewport. Wordmark top-left (“Tu” ink, “Eats” cherry). Compact search/filter strip. Non-modal bottom sheet: peek ~28%, mid ~55%, full ~92%. No marketing hero.

### Home (`/`) — desktop (portfolio surface)

- **Split composition from first paint:** list + filters + search on the left; MapLibre on the right filling remaining height (under a slim top bar with wordmark + about/account).
- **Shared state:** Same URL searchParams and payload as mobile — filter/search/selection stay in sync across panes. Hovering or focusing a list row highlights the matching cuisine pill on the map; selecting a pin scrolls/focuses the list row.
- **List density:** Comfortable rows with name, cuisine tags, zone, open-status badge, payment icons — designed for mouse scan, not thumb-only.
- **Map:** Larger campus view earns the desktop width; cuisine pills remain legible; controls sit top-right of the map pane (not floating over the list).
- **No mobile chrome on desktop:** No grab-handle sheet, no peek/mid/full detents, no “tap to expand list.” If it looks like a phone UI scaled up, it’s wrong.
- **Empty / filtered states:** Friendly empty copy in the list pane; map still shows campus (pins filtered). Never a blank white half-screen.

### Venue detail (`/eat/[slug]`)

- **Content order (all breakpoints):** name → hedged open-status (mono) → cuisine / zone / payment → description → hours → last-verified → report. Phase 2: student rating primary, Google snapshot secondary and never merged.
- **Mobile:** Single column, back returns to explorer with preserved filters/map position.
- **Desktop:** Typography-led reading column (~40rem) with generous vertical rhythm; optional sticky mini context (open status + primary cuisine) as the user scrolls. Not a cramped phone article stretched to 1200px. Back / “View on map” restores the split explorer state.

### About / admin

- **About:** Readable prose column on desktop; quiet disclaimer and credits.
- **Admin:** Same tokens, denser spacing, table-first — desktop-primary tooling is fine here.

### Desktop interaction bar

- Hover styles on list rows, chips, pins, and buttons (subtle — no glow stacks).
- Visible focus rings (cherry) for keyboard users.
- Pin/list selection works with click and keyboard; map remains pannable/zoomable with mouse and trackpad.

## Motion

- **Approach:** Intentional, performance-budgeted (Lighthouse mobile ≥90; MapLibre is already heavy). Desktop can afford slightly richer hover/selection feedback; don’t add weight to the mobile critical path.
- **Libraries:**
  - **Framer Motion** — sheet snap (mobile), list filter crossfade, selected pin spring, list↔pin highlight, detail page enter, chip press. Client chunks for explorer + detail only.
  - **GSAP** — one-shot pin stagger after `map.on('load')` (≤40 pins, 20–30ms stagger, `power2.out`, total &lt;800ms). Dynamic import only; never on critical path.
  - **CSS** — badges, hover, focus rings, reduced-motion fallbacks
- **Easing:** enter ease-out · exit ease-in · move ease-in-out
- **Duration:** micro 100ms · short 200ms · medium 350ms · long ≤700ms
- **Rules:** Honor `prefers-reduced-motion: reduce` (instant state, no stagger). No scroll-jacking. No perpetual GSAP timelines on home. Desktop hover transitions stay in the micro/short range.

## Map

| Decision | Choice |
|----------|--------|
| Basemap | OpenFreeMap **Positron** — `https://tiles.openfreemap.org/styles/positron` |
| Config | `NEXT_PUBLIC_MAP_STYLE_URL` (swappable) |
| Viewport | Campus bbox only (~lat 39.971–39.984, lng −75.161–−75.150) — includes west-of-Broad athletics and the Girard sports complex; never Philly-wide |
| Chrome | Custom zoom + locate; Satoshi labels; cherry focus ring; quiet OSM/OpenFreeMap attribution |
| Desktop map pane | Fills the right split full height; controls inset in the map pane; list hover ↔ pin highlight |
| Locate me | Client-only blue-dot; never sent to server |
| Zones | Campus overview uses two marks together: `streetLine` corridors (Student Center, W Montgomery, SERC trucks, Tyler trucks) and `buildingFill` washes (Vantage & The View buildings; The Wall plaza immediately west of Anderson Hall, not Anderson itself; Richie's Cafe footprint only, not Facilities; Liacouras Walk 1926–1938 building only, not 1940 Residence Hall). Zone names sit on a light cherry plate (`#E8D4D8`) with a thin cherry outline. Click a zone to zoom in and show pins. List-filter `zone_key` is a separate model. |
| Campus buildings | Curated GeoJSON overlay — per-building 2D fill/stroke/label; mute stock Positron footprints ([docs/design/campus-buildings.md](docs/design/campus-buildings.md)) |
| Optional later | Faint dashed campus outline; Maputnik fork to strip base POI clutter / align land+water to tokens |

See [docs/design/map-and-pins.md](docs/design/map-and-pins.md) and [public/pins/](public/pins/).

## Pins

- **Job:** Answer “what kind of food?” at a glance so a hungry student can scan the corridor.
- **Shape:** Cherry **cuisine pill** (rounded label + sharp stem). Tip of the stem is the map coordinate.
- **Info on pin:** **Primary cuisine label only** (short text: Halal, Mex, Amer, Chin, Fruit, Carib, or Food). First cuisine tag wins when multiple exist.
- **Not on pin:** Open/closed, ratings, cash, name — those live on list rows, mini-card, and detail.
- **Selected:** Same label, larger + thicker white ring (Framer spring).
- **Rendering:** Prefer one shared Marker/component that injects the label (don’t explode asset count). Reference SVGs in `public/pins/`. Symbol layer or HTML markers OK at ~40 venues; HTML Marker for selected.
- **Density:** Collision fade / light cluster at overview; every pill tappable at street zoom (~16+).
- **Phase 3 types:** Same pill; cuisine still primary. Optional tiny type mark later — not required for trucks.
- **Meal-plan dining info pins:** The Student Center food court, J&H dining hall, and Morgan Hall food court are meal-plan dining — out of product scope, never venues, never in the DB. Each building gets **one** neutral info pin that just names what's there (`src/config/campus-dining.ts`). Treatment: same pill+stem silhouette, but **white surface fill, stone `#B8B4AA` border, ink-secondary regular-weight text** — deliberately not cherry, so it can't be mistaken for a tappable venue. Non-interactive (no hover, no click, no mini-card) and always loses label collisions to venue pills. Don't add more of these casually — cherry venue pills stay the dominant map layer.

## Component inventory

Maps to `Specs/architecture-planning.md`:

- `components/map/` — `VenueMap`, `CampusBuildingLayer`, `VenuePinLayer`, `LocateControl`, `MapAttribution`
- `components/venues/` — `VenueExplorer`, `VenueList`, `VenueListRow`, `VenueMiniCard`, `FilterBar`, `OpenStatusBadge`, `PaymentIcons`, `CuisineTags`
- `components/ui/` — Button, Chip, Sheet, Input, EmptyState, Wordmark
- Tokens in `globals.css` + Tailwind 4 `@theme`

**Copy voice (Feature 4):** “Open · usually until {close}”, “Closed · opens {next}”, “Hours unknown” — never treat unknown as Closed; never promise a truck is open.

## Anti-patterns (do not ship)

- Temple trademarks, “T” logo, owl marks, or official brand assets
- Warm cream (#F4F1EA-ish) + high-contrast serif + terracotta (AI-default editorial)
- Purple/indigo SaaS gradients, photo-feed home, 3-column icon grids
- Inter / Roboto / system / Montserrat / Poppins as primary type
- Numbered pins or status-colored pin forests (cuisine-label pills only; open status stays off the pin)
- Empty/decorative pins with no decision-useful info
- Merging or visually conflating student ratings with Google snapshots (Phase 2+)
- Marketing hero on `/` — the map *is* the first viewport
- Cards as decoration; cards only when they contain an interaction
- **Desktop as stretched mobile:** bottom sheet, grab handles, or single-column phone chrome on ≥1024 viewports
- **Desktop as map-only or list-only:** the split explorer is the product; hiding one pane by default fails the portfolio bar
- Detail pages that are a single narrow column floating in a sea of empty canvas with no typographic hierarchy

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-17 | Cherry Compass design system created | Design consultation from specs + competitive research; cream+serif indie alternative rejected as AI-default |
| 2026-07-17 | OpenFreeMap Positron basemap | Muted land so cherry pins dominate; $0, keyless, swappable |
| 2026-07-17 | Cuisine-label pill pins (not status beacons) | Pin must help decide what to eat; open status lives on list/mini-card |
| 2026-07-17 | Framer Motion + deferred GSAP pin stagger | Motion personality without wrecking Lighthouse ≥90 |
| 2026-07-20 | Curated GeoJSON campus buildings (2D), not basemap fork alone | OpenMapTiles buildings have no names; per-building design needs our footprints + paint tokens |
| 2026-07-17 | Cabinet Grotesk + Satoshi + JetBrains Mono | Modern athletic utility; blacklist of overused UI fonts honored |
| 2026-07-17 | Desktop is first-class (split explorer), not stretched mobile | Portfolio / hiring-manager viewport; mobile-first priority unchanged |
| 2026-08-25 | Neutral info pins for meal-plan dining halls (SC food court, J&H, Morgan) | Meal-plan places are out of scope, not venues; one white/stone non-interactive pill per building names what's there without competing with cherry venue pills |
