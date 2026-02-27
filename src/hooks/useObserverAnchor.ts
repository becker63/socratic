// src/hooks/useObserverAnchor.ts
import { useEffect, useRef, useState } from "react";

export type ObserverMetrics = {
  midYInViewport: number;
  bottomInContent: number;
  viewportHeight: number;
};

export function useObserverAnchor(
  scrollRef: React.RefObject<HTMLDivElement | null>,
  layoutReady: boolean,
) {
  const observerRef = useRef<HTMLDivElement | null>(null);
  const [metrics, setMetrics] = useState<ObserverMetrics | null>(null);

  useEffect(() => {
    if (!layoutReady) return;

    const scroller = scrollRef.current;
    const observer = observerRef.current;

    if (!scroller || !observer) return;

    const update = () => {
      const scrollerRect = scroller.getBoundingClientRect();
      const observerRect = observer.getBoundingClientRect();

      const midYInViewport = observerRect.top + observerRect.height / 2;

      const bottomInContent = observer.offsetTop + observer.offsetHeight;

      const viewportHeight = scroller.clientHeight;

      setMetrics({
        midYInViewport,
        bottomInContent,
        viewportHeight,
      });
    };

    update();
    scroller.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      scroller.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [layoutReady, scrollRef]);

  return { observerRef, observerMetrics: metrics };
}
