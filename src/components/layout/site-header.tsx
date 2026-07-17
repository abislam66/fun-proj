import Link from "next/link";

import { Wordmark } from "@/components/ui/primitives";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Wordmark />
      <nav aria-label="Primary navigation">
        <Link href="/">Explore</Link>
        <Link href="/about">About</Link>
      </nav>
    </header>
  );
}
