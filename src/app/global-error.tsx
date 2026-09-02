"use client";

/**
 * Catches a crash in the root layout itself (font loading, a bug in
 * RootLayout's own JSX) — the one case where even globals.css/the font
 * pipeline that crashed might not be trustworthy, so this renders its
 * own <html>/<body> with plain inline styles and zero app dependencies,
 * on purpose. Everything else is handled by the normal error.tsx below.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          display: "flex",
          minHeight: "100dvh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          padding: "2rem",
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#f5f5f4",
          color: "#1c1917",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>TuEats hit a snag</h1>
        <p style={{ margin: 0, maxWidth: "24rem", color: "#57534e" }}>
          Something went wrong loading the app. Try again in a moment.
        </p>
        <button
          onClick={() => reset()}
          style={{
            marginTop: "0.5rem",
            padding: "0.6rem 1.2rem",
            borderRadius: "0.5rem",
            border: "1px solid #9d2235",
            background: "#9d2235",
            color: "#ffffff",
            fontWeight: 700,
            cursor: "pointer",
          }}
          type="button"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
