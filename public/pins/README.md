# Venue map pins

**Name plates** — cherry square label + leader-line-and-dot stem, matching zone-label chrome. The pin’s job is naming the spot. Open status, ratings, and cash live on the list / mini-card / detail — not on the pin.

See `Context/DESIGN.md` and `docs/design/map-and-pins.md`.

## Label

Venue name, baked into an opaque sprite so overlapping plates occlude instead of blending. Coinciding spots share one "N spots" plate. Cuisine tags live on the list, mini-card, and detail.

The SVGs in this folder are leftover cuisine-pill sketches, not the runtime pin.

## Rendering

- **Shape:** Square plate (`rx` 0) + vertical ink stem ending in a fill-colored dot. Dot tip = geographic point (`icon-anchor: bottom`).
- **Fill:** Always cherry `#9D2235` + ink `#171310` stroke + hard offset shadow. Do **not** recolor by open/closed.
- **Type:** Bold ~13px, white. Runtime sprites use the page body font.
- **Implementation:** Canvas sprites in `src/lib/map/venue-pill-icon.ts`, one image per venue × state.
- **Density:** At low zoom, collision fade or cluster; at street zoom (~16+) every plate tappable.
- **Selected:** Same name, thicker ink outline + soft cherry halo.

## Not on the pin

Open / closed / hours unknown · ratings · cash/card · cuisine abbreviation.
