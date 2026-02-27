import { useEffect, useState } from "react";
import type { ObserverMetrics } from "./useObserverAnchor";

/**
 * useGradientProjection
 *
 * Responsibility:
 * Convert geometry telemetry (anchor position)
 * into a normalized visual intensity signal.
 *
 * This hook does not read DOM.
 * It purely transforms metrics → presentation value.
 */
export function useGradientProjection(
  observerMetrics: ObserverMetrics | null,
  layoutReady: boolean,
  maxDistance: number = 400,
) {
  // Final eased intensity used by UI
  const [intensity, setIntensity] = useState(0);

  // Raw 0–1 normalized distance before easing
  const [normalizedPosition, setNormalizedPosition] = useState(0);

  useEffect(() => {
    // Do nothing until layout is stable and we have metrics
    if (!layoutReady || !observerMetrics) return;

    const { midYInViewport, viewportHeight } = observerMetrics;

    /**
     * Distance between anchor midpoint and viewport bottom.
     * When anchor approaches bottom, gradient intensity increases.
     */
    const distanceFromViewportBottom = viewportHeight - midYInViewport;

    /**
     * Normalize distance into 0–1 range.
     * Clamped to avoid overflow.
     */
    const normalized = Math.max(
      0,
      Math.min(distanceFromViewportBottom / maxDistance, 1),
    );

    /**
     * Apply cubic ease-out for smoother visual falloff.
     * Keeps interaction feeling soft instead of linear.
     */
    const eased = 1 - Math.pow(1 - normalized, 3);

    setNormalizedPosition(normalized);
    setIntensity(eased);
  }, [observerMetrics, layoutReady, maxDistance]);

  return { intensity, normalizedPosition };
}
