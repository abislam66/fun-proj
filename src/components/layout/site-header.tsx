import { HeaderNav } from "@/components/layout/header-nav";
import type { HeaderSession } from "@/components/layout/user-avatar";
import { Wordmark } from "@/components/ui/primitives";

type ViewMode = "map" | "places";

export function SiteHeader({
  session = null,
  viewMode,
  onHome,
  onPlaces,
}: {
  session?: HeaderSession | null;
  viewMode?: ViewMode;
  onHome?: () => void;
  onPlaces?: () => void;
} = {}) {
  return (
    <header className="site-header">
      <Wordmark />
      <HeaderNav
        onHome={onHome}
        onPlaces={onPlaces}
        session={session}
        viewMode={viewMode}
      />
    </header>
  );
}
