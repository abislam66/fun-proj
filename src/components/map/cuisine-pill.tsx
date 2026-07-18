"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * The pin's only job is answering "what kind of food?" (see DESIGN.md → Pins).
 * Open status, ratings, and payment never appear here — they live on the
 * list row, mini-card, and detail page.
 */
export function CuisinePill({
  label,
  selected,
  hovered,
  onSelect,
}: {
  label: string;
  selected: boolean;
  hovered: boolean;
  onSelect: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const scale = selected ? 1.12 : hovered ? 1.05 : 1;

  return (
    <motion.button
      animate={reduceMotion ? undefined : { scale }}
      aria-label={`${label} — show details`}
      aria-pressed={selected}
      className={[
        "cuisine-pill",
        selected ? "is-selected" : "",
        hovered ? "is-hovered" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      initial={false}
      onClick={onSelect}
      style={reduceMotion ? { transform: `scale(${scale})` } : undefined}
      transition={{ type: "spring", stiffness: 520, damping: 30 }}
      type="button"
    >
      <span className="cuisine-pill-label">{label}</span>
      <span aria-hidden="true" className="cuisine-pill-stem" />
    </motion.button>
  );
}
