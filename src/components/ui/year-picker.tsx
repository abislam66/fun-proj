"use client";

import { useEffect, useId, useRef, useState } from "react";

import { GRADUATION_YEAR_MAX, GRADUATION_YEAR_MIN } from "@/config/site";
import { decadeStart, formatClassYear, yearsInDecade } from "@/lib/profile";

function currentYear(): number {
  return new Date().getFullYear();
}

export function YearPicker({
  name,
  value,
  min = GRADUATION_YEAR_MIN,
  max = GRADUATION_YEAR_MAX,
}: {
  name: string;
  value: number | null;
  min?: number;
  max?: number;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(value);
  const [decade, setDecade] = useState(() =>
    decadeStart(value ?? currentYear()),
  );

  useEffect(() => {
    setSelected(value);
    if (value != null) setDecade(decadeStart(value));
  }, [value]);

  const years = yearsInDecade(decade, min, max);
  const canPrev = decade - 10 >= decadeStart(min);
  const canNext = decade + 10 <= decadeStart(max);
  const label = formatClassYear(selected) ?? "Add class year";

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function choose(year: number | null) {
    setSelected(year);
    setOpen(false);
    if (year != null) setDecade(decadeStart(year));
  }

  return (
    <div className="year-picker" ref={rootRef}>
      <input name={name} type="hidden" value={selected ?? ""} />
      <button
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Class year, ${label}`}
        className="year-picker-trigger"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{label}</span>
        <span aria-hidden="true" className="year-picker-chevron">
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open ? (
        <div className="year-picker-panel">
          <div className="year-picker-decade">
            <button
              aria-label="Previous decade"
              className="year-picker-nav"
              disabled={!canPrev}
              onClick={() => setDecade((current) => current - 10)}
              type="button"
            >
              ‹
            </button>
            <p>
              {decade}–{Math.min(decade + 9, max)}
            </p>
            <button
              aria-label="Next decade"
              className="year-picker-nav"
              disabled={!canNext}
              onClick={() => setDecade((current) => current + 10)}
              type="button"
            >
              ›
            </button>
          </div>
          <div
            aria-label="Class year"
            className="year-picker-grid"
            id={listId}
            role="listbox"
          >
            {years.map((year) => {
              const isSelected = year === selected;
              return (
                <button
                  aria-selected={isSelected}
                  className={
                    isSelected
                      ? "year-picker-year is-selected"
                      : "year-picker-year"
                  }
                  key={year}
                  onClick={() => choose(year)}
                  role="option"
                  type="button"
                >
                  {year}
                </button>
              );
            })}
          </div>
          {selected != null ? (
            <button
              className="year-picker-clear"
              onClick={() => choose(null)}
              type="button"
            >
              Clear year
            </button>
          ) : (
            <p className="year-picker-hint">
              The year you graduate, or already did.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
