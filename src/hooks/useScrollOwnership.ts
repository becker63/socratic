import { useEffect, useRef } from "react";
import type { AnyActorRef } from "xstate";

/**
 * useScrollOwnership
 *
 * Responsibility:
 * ----------------
 * Detect whether the user or the machine currently "owns" scroll.
 *
 * This hook translates raw DOM scroll movement into semantic events
 * for the XState machine:
 *
 *   - USER_SCROLLED_UP  → transition to userOwned
 *   - USER_AT_BOTTOM    → transition to machineOwned
 *
 * Design Goals:
 * -------------
 * 1. Only emit ownership transitions when they truly change.
 * 2. Never treat machine-driven scroll restoration as user input.
 * 3. Be resilient to small pixel drift.
 * 4. Avoid event spam.
 *
 * This is the arbitration layer between:
 *   - Physical scroll movement
 *   - Semantic ownership state
 */
export function useScrollOwnership(
  /**
   * XState send function.
   * We emit semantic ownership events into the machine.
   */
  send: AnyActorRef["send"],

  /**
   * Ref to the scrollable viewport.
   */
  scrollRef: React.RefObject<HTMLDivElement | null>,

  /**
   * Shared ref from useAutoScroll.
   * When true, we are currently restoring scroll programmatically.
   * During restoration, ownership logic must be suppressed.
   */
  restoringRef: React.MutableRefObject<boolean>,
) {
  /**
   * Tracks whether we previously considered ourselves at bottom.
   * Used to prevent emitting duplicate machine events.
   */
  const lastAtBottomRef = useRef<boolean | null>(null);

  /**
   * Tracks the previous scrollTop value.
   * Used to determine scroll direction (up vs down).
   */
  const lastScrollTopRef = useRef<number>(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    /**
     * checkOwnership
     *
     * Called on every scroll event.
     * Converts raw scroll metrics into semantic ownership signals.
     */
    const checkOwnership = () => {
      const currentScrollTop = el.scrollTop;

      /**
       * Are we effectively at bottom?
       *
       * We allow a 5px tolerance to prevent flicker due to
       * rounding errors or fractional layout differences.
       */
      const atBottom =
        currentScrollTop + el.clientHeight >= el.scrollHeight - 5;

      /**
       * Determine scroll direction.
       * This helps distinguish intentional upward scroll
       * from incidental position drift.
       */
      const scrollingUp = currentScrollTop < lastScrollTopRef.current;
      const scrollingDown = currentScrollTop > lastScrollTopRef.current;

      console.log("[ownership check]", {
        scrollTop: currentScrollTop,
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight,
        atBottom,
        restoring: restoringRef.current,
        lastAtBottom: lastAtBottomRef.current,
        scrollingUp,
        scrollingDown,
      });

      /**
       * Update scroll tracker immediately.
       * This ensures future direction comparisons are accurate.
       */
      lastScrollTopRef.current = currentScrollTop;

      /**
       * Suppress ownership logic during machine-driven restoration.
       *
       * Without this, a programmatic scroll-to-bottom
       * would be interpreted as user scroll,
       * causing oscillation between states.
       */
      if (restoringRef.current) return;

      /* ------------------------------------------------------------
         Case 1: User scrolls upward and is no longer at bottom
      ------------------------------------------------------------ */

      if (!atBottom && scrollingUp) {
        /**
         * Only emit transition if ownership is actually changing.
         * Prevents duplicate USER_SCROLLED_UP events.
         */
        if (lastAtBottomRef.current !== false) {
          lastAtBottomRef.current = false;

          // Semantic transition: machine → user ownership
          send({ type: "USER_SCROLLED_UP" });
        }
        return;
      }

      /* ------------------------------------------------------------
         Case 2: Scroll position reaches bottom
      ------------------------------------------------------------ */

      if (atBottom) {
        /**
         * Only emit transition if ownership is changing.
         */
        if (lastAtBottomRef.current !== true) {
          lastAtBottomRef.current = true;

          // Semantic transition: user → machine ownership
          send({ type: "USER_AT_BOTTOM" });
        }
      }

      /**
       * Note:
       * We intentionally do nothing for:
       *   - scrollingDown but not yet at bottom
       *   - small drift while still at bottom
       *
       * Ownership only changes on meaningful boundary crossings.
       */
    };

    /**
     * Passive listener because we do not preventDefault
     * and we want scroll performance preserved.
     */
    el.addEventListener("scroll", checkOwnership, { passive: true });

    /* ------------------------------------------------------------
       Initialize baseline state
    ------------------------------------------------------------ */

    lastScrollTopRef.current = el.scrollTop;
    lastAtBottomRef.current =
      el.scrollTop + el.clientHeight >= el.scrollHeight - 5;

    // Run once to align machine with initial position.
    checkOwnership();

    return () => {
      el.removeEventListener("scroll", checkOwnership);
    };
  }, [send, scrollRef, restoringRef]);
}
