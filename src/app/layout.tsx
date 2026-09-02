import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import {
  Audiowide,
  Monoton,
  Rajdhani,
  Share_Tech_Mono,
} from "next/font/google";
import "./globals.css";

import { RecoveryRedirect } from "@/components/auth/recovery-redirect";

// GTA6-retro redesign (branch: gta6-redesign) — neon-sign type system.
// Phase alpha's Cabinet Grotesk/Satoshi/JetBrains Mono live on `main`;
// see Context memory "phase-alpha-checkpoint" for the fallback plan.
const monoton = Monoton({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-monoton",
});

const audiowide = Audiowide({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-audiowide",
});

const rajdhani = Rajdhani({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-rajdhani",
});

const shareTechMono = Share_Tech_Mono({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-share-tech-mono",
});

const SITE_DESCRIPTION =
  "An unofficial guide to food trucks and other off-meal-plan food near Temple University.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "TuEats",
    template: "%s · TuEats",
  },
  description: SITE_DESCRIPTION,
  // Relative paths here resolve against metadataBase (NEXT_PUBLIC_SITE_URL)
  // — https://tueats.co in production, localhost in dev — so the canonical
  // tag is always correct for whichever environment actually rendered it,
  // rather than a hardcoded production URL leaking into local/preview builds.
  alternates: { canonical: "/" },
  openGraph: {
    title: "TuEats",
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: "TuEats",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TuEats",
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${monoton.variable} ${audiowide.variable} ${rajdhani.variable} ${shareTechMono.variable}`}
      lang="en"
    >
      <body>
        <RecoveryRedirect />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
