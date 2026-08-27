"use client";

import { useId, useState } from "react";

import { CUISINES, CUISINE_KEYS, type CuisineKey } from "@/config/cuisines";
import {
  MAP_ZONES,
  MAP_ZONE_KEYS_SORTED,
  type MapZoneKey,
} from "@/config/map-zones";
import { Chip, Input } from "@/components/ui/primitives";
import type { VenueFilters } from "@/lib/venues";

type FilterMenuKey = "cuisine" | "zone";

function toggle<T extends string>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function FilterBar({
  filters,
  onChange,
}: {
  filters: VenueFilters;
  onChange: (filters: VenueFilters) => void;
}) {
  // Menu options expand inline below the chip row — an in-panel drawer
  // that pushes the results down. Never a floating popover over the list.
  const [openMenu, setOpenMenu] = useState<FilterMenuKey | null>(null);
  // The last menu keeps rendering while the drawer collapses, so closing
  // animates instead of snapping empty.
  const [renderedMenu, setRenderedMenu] = useState<FilterMenuKey>("cuisine");
  const drawerId = useId();

  function update<K extends keyof VenueFilters>(
    key: K,
    value: VenueFilters[K],
  ) {
    onChange({ ...filters, [key]: value });
  }

  function toggleMenu(menu: FilterMenuKey) {
    setOpenMenu((current) => (current === menu ? null : menu));
    setRenderedMenu(menu);
  }

  function menuChipClass(menu: FilterMenuKey, count: number) {
    return ["chip", (count > 0 || openMenu === menu) && "chip-active"]
      .filter(Boolean)
      .join(" ");
  }

  return (
    <div className="filter-area">
      <label className="search-wrap">
        <span className="search-icon" aria-hidden="true">
          /
        </span>
        <span className="sr-only">Search venues or cuisines</span>
        <Input
          onChange={(event) => update("query", event.target.value)}
          placeholder="Search food or a place"
          type="search"
          value={filters.query}
        />
      </label>
      <div className="filter-scroll" aria-label="Venue filters">
        <Chip
          active={filters.openNow}
          onClick={() => update("openNow", !filters.openNow)}
        >
          Open now
        </Chip>
        <Chip
          active={filters.isHalal}
          onClick={() => update("isHalal", !filters.isHalal)}
        >
          Halal
        </Chip>
        <Chip
          active={filters.isVeganFriendly}
          onClick={() => update("isVeganFriendly", !filters.isVeganFriendly)}
        >
          Vegan Friendly
        </Chip>
        <button
          aria-controls={drawerId}
          aria-expanded={openMenu === "cuisine"}
          className={menuChipClass("cuisine", filters.cuisines.length)}
          onClick={() => toggleMenu("cuisine")}
          type="button"
        >
          Cuisine
          {filters.cuisines.length ? ` · ${filters.cuisines.length}` : ""}
        </button>
        <button
          aria-controls={drawerId}
          aria-expanded={openMenu === "zone"}
          className={menuChipClass("zone", filters.zones.length)}
          onClick={() => toggleMenu("zone")}
          type="button"
        >
          Zone{filters.zones.length ? ` · ${filters.zones.length}` : ""}
        </button>
      </div>
      <div
        className={
          openMenu ? "filter-drawer filter-drawer-open" : "filter-drawer"
        }
        id={drawerId}
        inert={openMenu === null}
      >
        <div className="filter-drawer-clip">
          {/* Horizontal multi-select: tap toggles; cherry fill = selected. */}
          <div className="filter-options">
            {renderedMenu === "cuisine"
              ? CUISINE_KEYS.map((key) => {
                  const selected = filters.cuisines.includes(key);
                  return (
                    <button
                      aria-pressed={selected}
                      className={
                        selected
                          ? "filter-option filter-option-active"
                          : "filter-option"
                      }
                      key={key}
                      onClick={() =>
                        update(
                          "cuisines",
                          toggle<CuisineKey>(filters.cuisines, key),
                        )
                      }
                      type="button"
                    >
                      {CUISINES[key].label}
                    </button>
                  );
                })
              : MAP_ZONE_KEYS_SORTED.map((key) => {
                  const selected = filters.zones.includes(key);
                  return (
                    <button
                      aria-pressed={selected}
                      className={
                        selected
                          ? "filter-option filter-option-active"
                          : "filter-option"
                      }
                      key={key}
                      onClick={() =>
                        update("zones", toggle<MapZoneKey>(filters.zones, key))
                      }
                      type="button"
                    >
                      {MAP_ZONES[key].label}
                    </button>
                  );
                })}
          </div>
        </div>
      </div>
    </div>
  );
}
