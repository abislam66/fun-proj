"use client";

export function MapAttribution() {
  return (
    <p className="map-attribution">
      ©{" "}
      <a
        href="https://www.openstreetmap.org/copyright"
        rel="noreferrer"
        target="_blank"
      >
        OpenStreetMap
      </a>{" "}
      ·{" "}
      <a href="https://openfreemap.org/" rel="noreferrer" target="_blank">
        OpenFreeMap
      </a>
    </p>
  );
}
