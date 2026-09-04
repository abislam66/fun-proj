import { HeaderNav } from "@/components/layout/header-nav";
import { Wordmark } from "@/components/ui/primitives";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Wordmark />
      <HeaderNav />
    </header>
  );
}
