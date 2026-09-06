import { HeaderNav } from "@/components/layout/header-nav";
import type { HeaderSession } from "@/components/layout/user-avatar";
import { Wordmark } from "@/components/ui/primitives";

type ViewMode = "map" | "hotspots";

export function SiteHeader({
  session = null,
  viewMode,
  onHome,
  onHotSpots,
}: {
  session?: HeaderSession | null;
  viewMode?: ViewMode;
  onHome?: () => void;
  onHotSpots?: () => void;
} = {}) {
  return (
    <header className="site-header">
      <Wordmark />
      <HeaderNav
        onHome={onHome}
        onHotSpots={onHotSpots}
        session={session}
        viewMode={viewMode}
      />
    </header>
  );
}
