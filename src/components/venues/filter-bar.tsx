"use client";

import { useId, useState } from "react";

import { CUISINES, CUISINE_KEYS, type CuisineKey } from "@/config/cuisines";
import { ZONES, ZONE_KEYS, type ZoneKey } from "@/config/zones";
import { Chip, Input } from "@/components/ui/primitives";
import type { PaymentFilter, VenueFilters } from "@/lib/venues";

type FilterPanel = "cuisines" | "zones" | null;

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
  const [openPanel, setOpenPanel] = useState<FilterPanel>(null);
  const cuisinePanelId = useId();
  const zonePanelId = useId();

  function update<K extends keyof VenueFilters>(
    key: K,
    value: VenueFilters[K],
  ) {
    onChange({ ...filters, [key]: value });
  }

  function togglePanel(panel: Exclude<FilterPanel, null>) {
    setOpenPanel((current) => (current === panel ? null : panel));
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
          active={filters.cuisines.length > 0 || openPanel === "cuisines"}
          aria-controls={cuisinePanelId}
          aria-expanded={openPanel === "cuisines"}
          onClick={() => togglePanel("cuisines")}
        >
          Cuisine
          {filters.cuisines.length ? ` · ${filters.cuisines.length}` : ""}
        </Chip>
        <Chip
          active={filters.zones.length > 0 || openPanel === "zones"}
          aria-controls={zonePanelId}
          aria-expanded={openPanel === "zones"}
          onClick={() => togglePanel("zones")}
        >
          Area{filters.zones.length ? ` · ${filters.zones.length}` : ""}
        </Chip>
        <Chip
          active={filters.payments.includes("card")}
          onClick={() =>
            update("payments", toggle<PaymentFilter>(filters.payments, "card"))
          }
        >
          Accepts card
        </Chip>
      </div>
      {openPanel === "cuisines" ? (
        <div
          className="filter-panel"
          id={cuisinePanelId}
          role="region"
          aria-label="Cuisine filters"
        >
          <div className="filter-panel-options">
            {CUISINE_KEYS.map((key) => (
              <Chip
                key={key}
                active={filters.cuisines.includes(key)}
                onClick={() =>
                  update("cuisines", toggle<CuisineKey>(filters.cuisines, key))
                }
              >
                {CUISINES[key].label}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}
      {openPanel === "zones" ? (
        <div
          className="filter-panel"
          id={zonePanelId}
          role="region"
          aria-label="Area filters"
        >
          <div className="filter-panel-options">
            {ZONE_KEYS.map((key) => (
              <Chip
                key={key}
                active={filters.zones.includes(key)}
                onClick={() =>
                  update("zones", toggle<ZoneKey>(filters.zones, key))
                }
              >
                {ZONES[key].label}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
