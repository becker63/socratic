import { useEffect, useState } from "react";

/**
 * useLayoutStable
 *
 * Responsibility:
 * Detect when scroll content has stopped resizing for a short window.
 *
 * This is necessary because:
 * - MDX rendering
 * - Mermaid diagrams
 * - dynamic height measurement
 *
 * all cause asynchronous layout changes.
 *
 * We mark layout as "ready" only after no ResizeObserver events
 * fire for `settleMs` milliseconds.
 */
export function useLayoutStable(
  scrollRef: React.RefObject<HTMLDivElement | null>,
  blocks: unknown[],
  settleMs: number = 300,
) {
  // True once layout has fully settled
  const [ready, setReady] = useState(false);

  // Incremented whenever layout re-stabilizes
  // Useful if consumers want to react to new stable cycles
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // We observe the first child (content wrapper)
    const content = el.firstElementChild as HTMLElement | null;
    if (!content) return;

    // Whenever blocks change, layout is considered unstable again
    setReady(false);

    let timeout: number | null = null;

    const observer = new ResizeObserver(() => {
      // Reset debounce window on every resize
      if (timeout) window.clearTimeout(timeout);

      timeout = window.setTimeout(() => {
        // Layout has been stable for settleMs
        setReady(true);
        setVersion((v) => v + 1);
      }, settleMs);
    });

    observer.observe(content);

    return () => {
      observer.disconnect();
      if (timeout) window.clearTimeout(timeout);
    };
  }, [scrollRef, blocks.length, settleMs]);

  return { ready, version };
}
