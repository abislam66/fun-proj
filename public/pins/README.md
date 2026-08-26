# Venue map pins

**Cuisine pills** — cherry rounded label + stem tip. The pin’s only job is answering “what kind of food?” Open status, ratings, and cash live on the list / mini-card / detail — not on the pin.

See `Context/DESIGN.md` and `docs/design/map-and-pins.md`.

## Label map (primary cuisine → pin text)

When a venue has multiple cuisine tags, use the **first** (primary) tag. Labels are short so dense corridors stay readable. Final keys live in `src/config/cuisines.ts` at scaffold; these are the design defaults:

| Cuisine key (planned) | Pin label | Asset example |
|-----------------------|-----------|---------------|
| `halal` | Halal | `pin-halal.svg` |
| `mexican` | Mex | `pin-mexican.svg` |
| `american` | Amer | `pin-american.svg` |
| `chinese` | Chin | `pin-chinese.svg` |
| `fruit` | Fruit | `pin-fruit.svg` |
| `caribbean` | Carib | `pin-caribbean.svg` |
| unset / other | Food | `pin-other.svg` |
| *(selected)* | same label, larger | `pin-selected.svg` (example: Halal) |

## Rendering

- **Shape:** Pill (`rx` half of height) + triangular stem. Tip = geographic point (`icon-anchor: bottom`).
- **Fill:** Always cherry `#9D2235` + white stroke. Do **not** recolor by open/closed.
- **Type:** Bold ~11–13px, white. In product use Satoshi (or system-ui in static SVG assets).
- **Implementation:** Prefer HTML `Marker` with a small React component that sets the label text (one shared SVG/CSS shell) so new cuisines don’t need new asset files. The files in this folder are the visual reference / sprite seed.
- **Density:** At low zoom, collision fade or cluster; at street zoom (~16+) every pill tappable.
- **Selected:** Same cuisine label, ~1.15× scale, thicker white ring (Framer spring).

## Not on the pin

Open / closed / hours unknown · ratings · cash/card · venue name · venue type glyph.
