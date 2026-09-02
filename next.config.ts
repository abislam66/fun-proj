import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Pragmatic first-pass CSP: locks down the high-value directives
 * (frame-ancestors/object-src/base-uri/form-action — the actual
 * clickjacking/injection-target vectors) without nonces, since a
 * nonce-based strict script-src needs deeper per-request wiring through
 * middleware/streaming SSR that risks breaking hydration on a first
 * pass. `'unsafe-inline'` stays on script-src/style-src for that reason
 * (Next's own inline bootstrap scripts, and the app's dynamic inline
 * `style={{ background }}` swatches on map/cluster UI) — a stronger,
 * nonce-based CSP is a good follow-up, not done here.
 *
 * Hosts allowed beyond 'self': `*.supabase.co` (auth, called from the
 * browser client during Google sign-in + password recovery),
 * `tiles.openfreemap.org` (the only host the MapLibre style references —
 * confirmed by inspecting its style JSON: sources, sprite, and glyphs
 * all resolve there), `*.public.blob.vercel-storage.com` (venue
 * photos — the admin photo manager uses a plain `<img>` that loads
 * directly from Blob storage, not proxied through `/_next/image`), and
 * `nominatim.openstreetmap.org` (admin-only address search in the venue
 * location picker — recenters the map, never auto-sets coordinates).
 */
const csp = [
  "default-src 'self'",
  // @vercel/analytics loads its script same-origin (`/_vercel/insights/script.js`)
  // in production, but from `va.vercel-scripts.com` in local dev (its own
  // `getScriptSrc()` debug-mode branch) — only widen script-src for that host
  // outside production, where it's actually used.
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval' https://va.vercel-scripts.com"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://tiles.openfreemap.org https://nominatim.openstreetmap.org",
  "worker-src 'self' blob:",
  "frame-ancestors 'self' https://vercel.com https://*.vercel.app",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  isProd ? "upgrade-insecure-requests" : "",
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // CSP's frame-ancestors (above) is the modern, granular version of this;
  // SAMEORIGIN is the closest same-effect fallback for browsers that only
  // understand this legacy header.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
