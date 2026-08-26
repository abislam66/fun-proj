"use client";

import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

type SheetSnap = "peek" | "mid" | "full";

const SNAP_ORDER: SheetSnap[] = ["peek", "mid", "full"];

export function MobileSheet({
  children,
  collapseSignal = 0,
}: {
  children: ReactNode;
  /** Increment to tuck the sheet to peek (e.g. after a list selection). */
  collapseSignal?: number;
}) {
  const [snap, setSnap] = useState<SheetSnap>("mid");
  const startY = useRef(0);
  const startIndex = useRef(1);

  useEffect(() => {
    if (collapseSignal > 0) setSnap("peek");
  }, [collapseSignal]);

  useEffect(() => {
    document.documentElement.dataset.sheet = snap;
    return () => {
      delete document.documentElement.dataset.sheet;
    };
  }, [snap]);

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    startY.current = event.clientY;
    startIndex.current = SNAP_ORDER.indexOf(snap);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const delta = startY.current - event.clientY;
    if (Math.abs(delta) < 32) {
      const next = snap === "peek" ? "mid" : snap === "mid" ? "full" : "mid";
      setSnap(next);
      return;
    }
    const direction = delta > 0 ? 1 : -1;
    const nextIndex = Math.max(
      0,
      Math.min(SNAP_ORDER.length - 1, startIndex.current + direction),
    );
    setSnap(SNAP_ORDER[nextIndex] ?? "mid");
  }

  // Tucked-in sheet is a preview, not a surface: content is inert (no
  // scrolling, tapping, or focus) until the user expands it. A tap on the
  // tucked sheet body expands instead — inert content retargets clicks to
  // the section. Handle interactions are excluded: a drag down to peek
  // still synthesizes a click (pointer capture keeps its target on the
  // handle), and without the guard that click would bounce the sheet
  // straight back open.
  function onSectionClick(event: React.MouseEvent<HTMLElement>) {
    if (snap !== "peek") return;
    if ((event.target as HTMLElement).closest(".sheet-handle")) return;
    setSnap("mid");
  }

  return (
    <section
      aria-label="Venue results"
      className={`mobile-sheet mobile-sheet-${snap}`}
      onClick={onSectionClick}
    >
      <button
        aria-label={`Results sheet ${snap}. Drag or tap to change height.`}
        className="sheet-handle"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        type="button"
      >
        <span />
      </button>
      <div className="sheet-content" inert={snap === "peek"}>
        {children}
      </div>
    </section>
  );
}
