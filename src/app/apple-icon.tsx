import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iOS home-screen icon — same mark as icon.tsx, scaled up. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#9d2235",
          color: "#ffffff",
          fontSize: 110,
          fontWeight: 700,
        }}
      >
        T
      </div>
    ),
    { ...size },
  );
}
