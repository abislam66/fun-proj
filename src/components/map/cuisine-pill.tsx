"use client";

import { motion, useReducedMotion } from "framer-motion";

export function CuisinePill({
  label,
  selected = false,
  highlighted = false,
  index = 0,
}: {
  label: string;
  selected?: boolean;
  highlighted?: boolean;
  index?: number;
}) {
  const reduceMotion = useReducedMotion();
  const scale = selected ? 1.15 : highlighted ? 1.06 : 1;

  return (
    <motion.div
      animate={{ scale, opacity: 1, y: 0 }}
      className={[
        "cuisine-pill",
        selected && "cuisine-pill-selected",
        highlighted && !selected && "cuisine-pill-highlighted",
      ]
        .filter(Boolean)
        .join(" ")}
      initial={reduceMotion ? false : { scale: 0.72, opacity: 0, y: 8 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : {
              type: "spring",
              stiffness: 420,
              damping: 28,
              delay: Math.min(index, 12) * 0.025,
            }
      }
    >
      <span className="cuisine-pill-label">{label}</span>
      <span className="cuisine-pill-stem" aria-hidden="true" />
    </motion.div>
  );
}
