import { useEffect, useRef, useState } from "react";
import type { ObserverMetrics } from "./useObserverAnchor";

/**
 * useGradientProjection
 *
 * Gradient represents machine ownership (auto-follow mode).
 * Visible when machineOwned.
 * Hidden when userOwned.
 * Includes grace window to prevent flicker.
 */
export function useGradientProjection(
  observerMetrics: ObserverMetrics | null,
  layoutReady: boolean,
  scrollOwner: "machineOwned" | "userOwned",
  maxDistance: number = 500,
) {
  const [intensity, setIntensity] = useState(0);

  const GRACE_MS = 250;
  const hideAfterRef = useRef<number>(0);

  useEffect(() => {
    if (!layoutReady) return;

    const now = performance.now();

    // Optional subtle geometry modulation
    let geometryFactor = 1;

    if (observerMetrics) {
      const { midYInViewport, viewportHeight } = observerMetrics;
      const distance = viewportHeight - midYInViewport;

      const normalized = Math.max(0, Math.min(distance / maxDistance, 1));

      geometryFactor = 1 - Math.pow(1 - normalized, 2);
    }

    if (scrollOwner === "machineOwned") {
      // Machine in control → show gradient
      hideAfterRef.current = now + GRACE_MS;
      setIntensity(0.9 * geometryFactor); // subtle cap
      return;
    }

    // User owns → fade out after grace
    if (now < hideAfterRef.current) {
      setIntensity(0.9 * geometryFactor);
    } else {
      setIntensity(0);
    }
  }, [observerMetrics, layoutReady, scrollOwner, maxDistance]);

  return { intensity };
}
