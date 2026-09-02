import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Coded favicon (no source logo file exists) — cherry square, white "T", matching the Wordmark's cherry/white identity. */
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#9d2235",
        color: "#ffffff",
        fontSize: 22,
        fontWeight: 700,
        borderRadius: 6,
      }}
    >
      T
    </div>,
    { ...size },
  );
}
