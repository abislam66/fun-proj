import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default share-preview image — mirrors the site header's dark "marquee" + cherry wordmark. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          background: "#171310",
        }}
      >
        <div style={{ display: "flex", fontSize: 96, fontWeight: 700 }}>
          <span style={{ color: "#ffffff" }}>Tu</span>
          <span style={{ color: "#d1495b" }}>Eats</span>
        </div>
        <div style={{ display: "flex", fontSize: 32, color: "#c9beb8" }}>
          Off-meal-plan food near Temple University
        </div>
      </div>
    ),
    { ...size },
  );
}
