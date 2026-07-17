"use client";

import { CUISINES, CUISINE_KEYS, type CuisineKey } from "@/config/cuisines";
import { ZONES, ZONE_KEYS, type ZoneKey } from "@/config/zones";
import { Chip, Input } from "@/components/ui/primitives";
import type { PaymentFilter, VenueFilters } from "@/lib/venues";

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
  function update<K extends keyof VenueFilters>(
    key: K,
    value: VenueFilters[K],
  ) {
    onChange({ ...filters, [key]: value });
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
        <details className="filter-menu">
          <summary
            className={filters.cuisines.length ? "chip chip-active" : "chip"}
          >
            Cuisine
            {filters.cuisines.length ? ` · ${filters.cuisines.length}` : ""}
          </summary>
          <div className="filter-popover">
            {CUISINE_KEYS.map((key) => (
              <label key={key}>
                <input
                  checked={filters.cuisines.includes(key)}
                  onChange={() =>
                    update(
                      "cuisines",
                      toggle<CuisineKey>(filters.cuisines, key),
                    )
                  }
                  type="checkbox"
                />
                {CUISINES[key].label}
              </label>
            ))}
          </div>
        </details>
        <details className="filter-menu">
          <summary
            className={filters.zones.length ? "chip chip-active" : "chip"}
          >
            Area{filters.zones.length ? ` · ${filters.zones.length}` : ""}
          </summary>
          <div className="filter-popover">
            {ZONE_KEYS.map((key) => (
              <label key={key}>
                <input
                  checked={filters.zones.includes(key)}
                  onChange={() =>
                    update("zones", toggle<ZoneKey>(filters.zones, key))
                  }
                  type="checkbox"
                />
                {ZONES[key].label}
              </label>
            ))}
          </div>
        </details>
        <Chip
          active={filters.payments.includes("card")}
          onClick={() =>
            update(
              "payments",
              toggle<PaymentFilter>(filters.payments, "card"),
            )
          }
        >
          Accepts card
        </Chip>
      </div>
    </div>
  );
}
