import { useLayoutEffect, useRef } from "react";

/**
 * useAutoScroll
 *
 * Responsibility:
 * ----------------
 * Perform automatic scroll-to-bottom behavior when:
 *   - New content (blocks) is appended
 *   - The state machine currently owns scrolling ("machineOwned")
 *   - Layout has fully stabilized (MDX + Mermaid rendered, heights settled)
 *
 * Design Principles:
 * ------------------
 * 1. Never scroll before layout is stable.
 * 2. Never scroll if the user owns scrolling.
 * 3. Scroll exactly once per append event.
 * 4. Suppress ownership recalculation while we are restoring scroll.
 *
 * This hook is intentionally imperative and uses refs instead of state
 * because this is coordination logic, not UI state.
 */
export function useAutoScroll(
  scrollRef: React.RefObject<HTMLDivElement | null>,

  /**
   * The number of rendered blocks.
   * When this increases, it means new content has been appended.
   */
  blocksLength: number,

  /**
   * Current scroll ownership, derived from the XState machine.
   * - "machineOwned" → auto-scroll allowed
   * - "userOwned"    → do not interfere
   */
  scrollOwner: "machineOwned" | "userOwned",

  /**
   * True only after layout has fully stabilized.
   * Provided by useLayoutStable (ResizeObserver-based settling).
   */
  layoutReady: boolean,
) {
  /**
   * Tracks the previous blocks length.
   * Used to detect content growth (append events).
   */
  const prevLengthRef = useRef(blocksLength);

  /**
   * A one-shot latch indicating:
   *   "We owe the viewport a scroll-to-bottom once layout stabilizes."
   *
   * Why needed:
   * - New content may append before layoutReady becomes true.
   * - We must remember that a scroll is required.
   * - We must perform it exactly once.
   *
   * This is not UI state — it is internal coordination memory.
   */
  const pendingScrollRef = useRef(false);

  /**
   * Indicates that we are currently performing a machine-driven
   * scroll restoration.
   *
   * This is consumed by useScrollOwnership to avoid misinterpreting
   * our own programmatic scroll as a user scroll.
   */
  const restoringRef = useRef(false);

  /**
   * useLayoutEffect is used instead of useEffect because:
   * - We want scroll mutation to occur before the browser paints.
   * - This prevents visible flicker or mid-frame repositioning.
   */
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    /* ------------------------------------------------------------
       Phase 1 — Detect Content Growth
    ------------------------------------------------------------ */

    // If blocksLength changed, new content was appended.
    if (blocksLength !== prevLengthRef.current) {
      prevLengthRef.current = blocksLength;

      // Only schedule auto-scroll if machine owns scrolling.
      // If user owns scroll, we intentionally do nothing.
      if (scrollOwner === "machineOwned") {
        pendingScrollRef.current = true;
      }
    }

    /* ------------------------------------------------------------
       Phase 2 — Execute Deferred Scroll (Once Layout Is Stable)
    ------------------------------------------------------------ */

    // Only scroll when:
    // - layout has settled (heights finalized)
    // - we previously recorded intent to scroll
    if (
      layoutReady &&
      pendingScrollRef.current &&
      scrollOwner === "machineOwned"
    ) {
      // Mark that this scroll is programmatic.
      restoringRef.current = true;

      el.scrollTop = el.scrollHeight;

      // Let the browser emit its own scroll events.
      // Do NOT manually dispatch.

      requestAnimationFrame(() => {
        restoringRef.current = false;
      });
    }
  }, [blocksLength, layoutReady, scrollOwner]);

  /**
   * We return restoringRef so useScrollOwnership can suppress
   * machine-driven scroll events.
   *
   * This is an intentional cross-hook coordination channel.
   */
  return restoringRef;
}
