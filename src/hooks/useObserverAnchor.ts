import { useEffect, useRef, useState } from "react";

/**
 * ObserverMetrics
 *
 * These are geometry values derived from the DOM.
 * They are intentionally minimal — just enough to drive projection logic
 * (e.g., gradient intensity) without leaking full layout complexity.
 */
export type ObserverMetrics = {
  /**
   * The vertical midpoint of the anchor element,
   * expressed in viewport coordinates (relative to the window).
   *
   * Used to determine how close the anchor is to the bottom
   * of the visible scroll region.
   */
  midYInViewport: number;

  /**
   * The bottom of the anchor element,
   * expressed in content coordinates (relative to the scroll container).
   *
   * This is useful if we ever want to reason about
   * content-relative positioning instead of viewport-relative.
   */
  bottomInContent: number;

  /**
   * The visible height of the scroll viewport.
   * Used to normalize distance calculations.
   */
  viewportHeight: number;
};

/**
 * useObserverAnchor
 *
 * Responsibility:
 * ----------------
 * Attach a physical "anchor" element to the bottom of the scroll content
 * and continuously measure its spatial relationship to the viewport.
 *
 * This hook does NOT make decisions.
 * It only measures geometry and exposes it.
 *
 * Design Principles:
 * ------------------
 * 1. Only activate after layout has stabilized.
 * 2. Avoid leaking DOM complexity to consumers.
 * 3. Keep geometry calculations centralized and minimal.
 * 4. React to both scroll and window resize.
 */
export function useObserverAnchor(
  /**
   * Ref to the scrollable viewport container.
   */
  scrollRef: React.RefObject<HTMLDivElement | null>,

  /**
   * True only after layout (MDX, Mermaid, content height)
   * has fully stabilized.
   *
   * We do not measure geometry before layout is ready,
   * because early reads would be incorrect and noisy.
   */
  layoutReady: boolean,
) {
  /**
   * Ref to the invisible anchor element.
   *
   * This element is placed at the bottom of the content
   * and acts as a physical probe.
   */
  const observerRef = useRef<HTMLDivElement | null>(null);

  /**
   * The latest computed geometry metrics.
   * Null until first measurement occurs.
   */
  const [metrics, setMetrics] = useState<ObserverMetrics | null>(null);

  useEffect(() => {
    /**
     * Do nothing until layout is stable.
     * Prevents reading incomplete DOM geometry.
     */
    if (!layoutReady) return;

    const scroller = scrollRef.current;
    const observer = observerRef.current;

    if (!scroller || !observer) return;

    /**
     * update()
     *
     * Reads live DOM geometry and projects it into
     * a minimal, normalized metric shape.
     *
     * This is intentionally the ONLY place that
     * DOM layout reads occur for this concern.
     */
    const update = () => {
      /**
       * getBoundingClientRect gives viewport-relative coordinates.
       */
      const scrollerRect = scroller.getBoundingClientRect();
      const observerRect = observer.getBoundingClientRect();

      /**
       * Midpoint of the anchor in viewport space.
       *
       * We use midpoint instead of top/bottom directly
       * to create smoother projection behavior.
       */
      const midYInViewport = observerRect.top + observerRect.height / 2;

      /**
       * Bottom of anchor in content space.
       *
       * offsetTop is relative to offsetParent,
       * which here corresponds to the scroll content wrapper.
       */
      const bottomInContent = observer.offsetTop + observer.offsetHeight;

      /**
       * Visible height of scroll viewport.
       */
      const viewportHeight = scroller.clientHeight;

      setMetrics({
        midYInViewport,
        bottomInContent,
        viewportHeight,
      });
    };

    /**
     * Initial measurement.
     */
    update();

    /**
     * Listen to scroll events.
     * Passive because we do not preventDefault.
     */
    scroller.addEventListener("scroll", update, { passive: true });

    /**
     * Also listen to window resize,
     * since viewport height changes affect projections.
     */
    window.addEventListener("resize", update);

    return () => {
      scroller.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [layoutReady, scrollRef]);

  /**
   * Return:
   * - observerRef → attach to bottom anchor element
   * - observerMetrics → continuously updated geometry signal
   *
   * Consumers (like gradient projection) should treat
   * this as read-only physical telemetry.
   */
  return { observerRef, observerMetrics: metrics };
}
