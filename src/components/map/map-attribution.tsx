/**
 * Required OpenStreetMap + OpenFreeMap attribution (Feature 1 AC), kept quiet
 * per DESIGN.md. The default MapLibre control is disabled in favour of this so
 * the credit always renders even if the style JSON omits it.
 */
export function MapAttribution() {
  return (
    <div className="map-attribution">
      <a
        href="https://www.openstreetmap.org/copyright"
        rel="noreferrer"
        target="_blank"
      >
        © OpenStreetMap
      </a>
      <span aria-hidden="true">·</span>
      <a href="https://openfreemap.org" rel="noreferrer" target="_blank">
        OpenFreeMap
      </a>
    </div>
  );
}
