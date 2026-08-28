import Link from "next/link";

import { AccountControl } from "@/components/layout/account-control";
import { Wordmark } from "@/components/ui/primitives";

export function SiteHeader({
  user = null,
}: {
  user?: { displayName: string } | null;
}) {
  return (
    <header className="site-header">
      <Wordmark />
      <nav aria-label="Primary navigation">
        <Link href="/about">About</Link>
        {user ? <AccountControl displayName={user.displayName} /> : null}
      </nav>
    </header>
  );
}
