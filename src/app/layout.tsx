import type { Metadata } from "next";
import localFont from "next/font/local";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";

import { RecoveryRedirect } from "@/components/auth/recovery-redirect";

const cabinetGrotesk = localFont({
  src: [
    {
      path: "../../public/fonts/cabinet-grotesk-700.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/cabinet-grotesk-800.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-cabinet-grotesk",
});

const satoshi = localFont({
  src: [
    {
      path: "../../public/fonts/satoshi-400.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/satoshi-500.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/satoshi-700.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-satoshi",
});

export const metadata: Metadata = {
  title: {
    default: "TuEats",
    template: "%s · TuEats",
  },
  description:
    "An unofficial guide to food trucks and other off-meal-plan food near Temple University.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${cabinetGrotesk.variable} ${satoshi.variable}`}>
        <RecoveryRedirect />
        {children}
      </body>
    </html>
  );
}
