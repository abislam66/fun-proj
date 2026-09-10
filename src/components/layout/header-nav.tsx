"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

import {
  UserAvatar,
  type HeaderSession,
} from "@/components/layout/user-avatar";

type ViewMode = "map" | "places";

/**
 * A nav item that degrades gracefully: from the homepage (where VenueExplorer
 * owns view-mode state) a click intercepts and calls the local handler with
 * no navigation; from any other page (/about, /account, admin) it's a plain
 * link to "/" with the right query param, since there's no local state to
 * call back into there.
 */
function NavAction({
  href,
  onClick,
  active,
  children,
}: {
  href: string;
  onClick?: () => void;
  active?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const onHomePage = pathname === "/";

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (onHomePage && onClick) {
      event.preventDefault();
      onClick();
    }
  }

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className="header-action"
      href={href}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
}

export function HeaderNav({
  session = null,
  viewMode = "map",
  onHome,
  onPlaces,
}: {
  session?: HeaderSession | null;
  viewMode?: ViewMode;
  onHome?: () => void;
  onPlaces?: () => void;
}) {
  return (
    <nav aria-label="Primary navigation">
      <NavAction active={viewMode === "map"} href="/" onClick={onHome}>
        Home
      </NavAction>
      <NavAction
        active={viewMode === "places"}
        href="/?view=places"
        onClick={onPlaces}
      >
        Places of the Week
      </NavAction>
      <UserAvatar session={session} />
    </nav>
  );
}
