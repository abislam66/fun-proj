"use client";

import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import { measureMobileSheetHeightPx } from "@/lib/mobile-sheet-heights";

type SheetSnap = "peek" | "mid" | "full";

const SNAP_ORDER: SheetSnap[] = ["peek", "mid", "full"];

// Below this much pointer travel, a press-and-release on the handle is
// treated as a tap (cycle to the next state) rather than a drag.
const TAP_THRESHOLD_PX = 10;

export function MobileSheet({
  children,
  collapseSignal = 0,
}: {
  children: ReactNode;
  /** Increment to tuck the sheet to peek (e.g. after a list selection). */
  collapseSignal?: number;
}) {
  const [snap, setSnap] = useState<SheetSnap>("peek");
  const sheetRef = useRef<HTMLElement>(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startHeightPx = useRef(0);
  const lastHeightPx = useRef(0);
  const targetsPx = useRef({ peek: 0, mid: 0, full: 0 });

  useEffect(() => {
    if (collapseSignal > 0) setSnap("peek");
  }, [collapseSignal]);

  useEffect(() => {
    document.documentElement.dataset.sheet = snap;
    return () => {
      delete document.documentElement.dataset.sheet;
    };
  }, [snap]);

  // While actively dragging, the inline height below is the live source
  // of truth and must win over the CSS transition; settling back onto a
  // snap state lets the class (and its --sheet-h-* token) take over
  // again so resize/rotation keeps recomputing it correctly.
  function settle(nextSnap: SheetSnap, fromHeightPx: number) {
    const element = sheetRef.current;
    setSnap(nextSnap);
    if (!element) return;
    const targetPx = targetsPx.current[nextSnap];
    element.style.transition = "";
    element.style.height = `${fromHeightPx}px`;
    // Force a reflow so the browser registers the start height before
    // the target height change kicks off the transition.
    void element.offsetHeight;
    element.style.height = `${targetPx}px`;
    const clearInlineHeight = (event: TransitionEvent) => {
      if (event.propertyName !== "height") return;
      element.style.height = "";
      element.removeEventListener("transitionend", clearInlineHeight);
    };
    element.addEventListener("transitionend", clearInlineHeight);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    const element = sheetRef.current;
    if (!element) return;
    dragging.current = true;
    startY.current = event.clientY;
    startHeightPx.current = element.getBoundingClientRect().height;
    lastHeightPx.current = startHeightPx.current;
    targetsPx.current = {
      peek: measureMobileSheetHeightPx("peek"),
      mid: measureMobileSheetHeightPx("mid"),
      full: measureMobileSheetHeightPx("full"),
    };
    element.style.transition = "none";
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragging.current) return;
    const element = sheetRef.current;
    if (!element) return;
    const { peek, full } = targetsPx.current;
    const [minPx, maxPx] = peek < full ? [peek, full] : [full, peek];
    const dragged = startHeightPx.current + (startY.current - event.clientY);
    const clamped = Math.min(maxPx, Math.max(minPx, dragged));
    lastHeightPx.current = clamped;
    element.style.height = `${clamped}px`;
  }

  function onPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragging.current) return;
    dragging.current = false;
    const traveled = Math.abs(startY.current - event.clientY);
    if (traveled < TAP_THRESHOLD_PX) {
      const next = snap === "peek" ? "mid" : snap === "mid" ? "full" : "mid";
      settle(next, lastHeightPx.current);
      return;
    }
    // Nearest of the 3 target heights to where the drag ended.
    const nearest = SNAP_ORDER.reduce((closest, candidate) =>
      Math.abs(targetsPx.current[candidate] - lastHeightPx.current) <
      Math.abs(targetsPx.current[closest] - lastHeightPx.current)
        ? candidate
        : closest,
    );
    settle(nearest, lastHeightPx.current);
  }

  function onPointerCancel() {
    if (!dragging.current) return;
    dragging.current = false;
    settle(snap, lastHeightPx.current);
  }

  return (
    <section
      aria-label="Venue results"
      className={`mobile-sheet mobile-sheet-${snap}`}
      ref={sheetRef}
    >
      <button
        aria-label={`Results sheet ${snap}. Drag or tap to change height.`}
        className="sheet-handle"
        onPointerCancel={onPointerCancel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        type="button"
      >
        <span />
      </button>
      <div className="sheet-content">{children}</div>
    </section>
  );
}
