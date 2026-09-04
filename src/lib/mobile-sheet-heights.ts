"use client";

/**
 * Measures the live pixel height of one of the mobile results sheet's 3
 * snap states (globals.css .mobile-sheet-collapsed/-peek/-full/-preview,
 * driven by the shared --sheet-h-* tokens).
 *
 * Reading a CSS custom property via getComputedStyle(el).getPropertyValue
 * returns its *unresolved token text* ("calc((100dvh - 4.25rem) * 0.5)"),
 * never a resolved pixel value — custom properties don't get calc()/dvh
 * resolution the way real layout properties do. The reliable way to get
 * an actual px number is to lay out a real element with the real class
 * and measure it, so this renders a hidden, off-screen probe with the
 * exact classes MobileSheet applies and reads its rendered height. Both
 * mobile-sheet.tsx's drag/snap math and venue-map.tsx's flyToZones inset
 * share this one measurement path.
 */

let probe: HTMLDivElement | null = null;

function getProbe(): HTMLDivElement {
  if (probe && document.body.contains(probe)) return probe;
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.style.position = "fixed";
  el.style.top = "0";
  el.style.left = "-9999px";
  el.style.visibility = "hidden";
  el.style.pointerEvents = "none";
  // .mobile-sheet declares `transition: height`, which this probe
  // inherits along with the rest of the class's rules — without this,
  // back-to-back measurements (collapsed, then peek, then full) would
  // each sample mid-transition instead of the settled value, since
  // no time elapses between them.
  el.style.transition = "none";
  document.body.appendChild(el);
  probe = el;
  return el;
}

export type MobileSheetSnap = "collapsed" | "peek" | "full" | "preview";

export function measureMobileSheetHeightPx(state: MobileSheetSnap): number {
  if (typeof document === "undefined") return 0;
  if (state === "preview") {
    const live = document.querySelector(".mobile-sheet-preview");
    if (live instanceof HTMLElement) {
      return live.getBoundingClientRect().height;
    }
  }
  const el = getProbe();
  el.className = `mobile-sheet mobile-sheet-${state}`;
  return el.getBoundingClientRect().height;
}

/** Height of whichever snap the sheet is actually in right now. */
export function measureCurrentMobileSheetHeightPx(): number {
  if (typeof document === "undefined") return 0;
  const snap = document.documentElement.dataset.sheet;
  if (
    snap === "collapsed" ||
    snap === "peek" ||
    snap === "full" ||
    snap === "preview"
  ) {
    return measureMobileSheetHeightPx(snap);
  }
  return measureMobileSheetHeightPx("peek");
}
