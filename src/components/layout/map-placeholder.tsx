export function MapPlaceholder() {
  return (
    <div className="map-placeholder" aria-label="Campus map placeholder">
      <div className="map-street map-street-a" />
      <div className="map-street map-street-b" />
      <div className="map-street map-street-c" />
      <div className="map-water" />
      <div className="map-label">
        <span>Temple Main Campus</span>
        <small>Map view</small>
      </div>
      <p className="map-note">Interactive map coming later</p>
    </div>
  );
}
