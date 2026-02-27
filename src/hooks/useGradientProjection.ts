// src/hooks/useGradientProjection.ts
import { useEffect, useState } from "react";
import type { ObserverMetrics } from "./useObserverAnchor";

export function useGradientProjection(
  observerMetrics: ObserverMetrics | null,
  layoutReady: boolean,
  maxDistance: number = 400,
) {
  const [intensity, setIntensity] = useState(0);
  const [normalizedPosition, setNormalizedPosition] = useState(0);

  useEffect(() => {
    if (!layoutReady || !observerMetrics) return;

    const { midYInViewport, viewportHeight } = observerMetrics;

    const distanceFromViewportBottom = viewportHeight - midYInViewport;

    const normalized = Math.max(
      0,
      Math.min(distanceFromViewportBottom / maxDistance, 1),
    );

    // cubic ease-out
    const eased = 1 - Math.pow(1 - normalized, 3);

    setNormalizedPosition(normalized);
    setIntensity(eased);
  }, [observerMetrics, layoutReady, maxDistance]);

  return { intensity, normalizedPosition };
}
