"use client";

import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  measureMobileSheetHeightPx,
  type MobileSheetSnap,
} from "@/lib/mobile-sheet-heights";

const BROWSE_SNAPS: MobileSheetSnap[] = ["collapsed", "peek", "full"];

// Below this much pointer travel, a press-and-release on the handle is
// treated as a tap (cycle to the next state) rather than a drag.
const TAP_THRESHOLD_PX = 10;

export function MobileSheet({
  children,
  mode = "browse",
  onDismissPreview,
}: {
  children: ReactNode;
  /** Browse = search/list snaps. Preview = selected venue card. */
  mode?: "browse" | "preview";
  /** Dragging the preview down past the collapsed stop dismisses it. */
  onDismissPreview?: () => void;
}) {
  const [snap, setSnap] = useState<MobileSheetSnap>("peek");
  const sheetRef = useRef<HTMLElement>(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startHeightPx = useRef(0);
  const lastHeightPx = useRef(0);
  const targetsPx = useRef({
    collapsed: 0,
    peek: 0,
    full: 0,
    preview: 0,
  });
  const onDismissPreviewRef = useRef(onDismissPreview);
  onDismissPreviewRef.current = onDismissPreview;

  const visualSnap: MobileSheetSnap = mode === "preview" ? "preview" : snap;

  useEffect(() => {
    document.documentElement.dataset.sheet = visualSnap;
    return () => {
      delete document.documentElement.dataset.sheet;
    };
  }, [visualSnap]);

  // Preview height is content-sized (`height: auto`). Publish the live px
  // value so map controls / camera padding can follow it — a CSS token
  // can't resolve auto height.
  useLayoutEffect(() => {
    const element = sheetRef.current;
    if (!element || mode !== "preview") {
      document.documentElement.style.removeProperty("--sheet-h-preview");
      return;
    }
    function publish() {
      if (!element) return;
      document.documentElement.style.setProperty(
        "--sheet-h-preview",
        `${element.getBoundingClientRect().height}px`,
      );
    }
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(element);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--sheet-h-preview");
    };
  }, [mode, children]);

  // While actively dragging, the inline height below is the live source
  // of truth and must win over the CSS transition; settling back onto a
  // snap state lets the class (and its --sheet-h-* token) take over
  // again so resize/rotation keeps recomputing it correctly.
  function settle(nextSnap: MobileSheetSnap, fromHeightPx: number) {
    const element = sheetRef.current;
    // Preview is a mode overlay — don't overwrite the browse snap so
    // dismissing returns to collapsed/peek/full as it was.
    if (nextSnap !== "preview") setSnap(nextSnap);
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
      collapsed: measureMobileSheetHeightPx("collapsed"),
      peek: measureMobileSheetHeightPx("peek"),
      full: measureMobileSheetHeightPx("full"),
      preview: startHeightPx.current,
    };
    element.style.transition = "none";
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragging.current) return;
    const element = sheetRef.current;
    if (!element) return;
    const minPx = targetsPx.current.collapsed;
    const maxPx =
      mode === "preview" ? targetsPx.current.preview : targetsPx.current.full;
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
      if (mode === "preview") {
        settle("preview", lastHeightPx.current);
        return;
      }
      // Tap steps between search (peek) and the list (full). Map-only is
      // a deliberate drag-down from peek, not a tap through-stop.
      const next =
        snap === "collapsed" ? "peek" : snap === "peek" ? "full" : "peek";
      settle(next, lastHeightPx.current);
      return;
    }
    if (mode === "preview") {
      const toCollapsed =
        Math.abs(targetsPx.current.collapsed - lastHeightPx.current) <
        Math.abs(targetsPx.current.preview - lastHeightPx.current);
      if (toCollapsed) {
        const element = sheetRef.current;
        if (element) {
          element.style.transition = "";
          element.style.height = "";
        }
        onDismissPreviewRef.current?.();
        return;
      }
      settle("preview", lastHeightPx.current);
      return;
    }
    const nearest = BROWSE_SNAPS.reduce((closest, candidate) =>
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
    settle(mode === "preview" ? "preview" : snap, lastHeightPx.current);
  }

  const handleLabel =
    mode === "preview"
      ? "Venue preview. Drag down to close."
      : `Results sheet ${snap === "collapsed" ? "map" : snap}. Drag or tap to change height.`;

  return (
    <section
      aria-label={mode === "preview" ? "Venue preview" : "Venue results"}
      className={`mobile-sheet mobile-sheet-${visualSnap}`}
      ref={sheetRef}
    >
      <button
        aria-label={handleLabel}
        className="sheet-handle"
        onPointerCancel={onPointerCancel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        type="button"
      >
        <span />
      </button>
      <div className="sheet-content" inert={visualSnap === "collapsed"}>
        {children}
      </div>
    </section>
  );
}
