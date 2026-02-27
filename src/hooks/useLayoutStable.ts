// src/hooks/useLayoutStable.ts
import { useEffect, useState } from "react";

export function useLayoutStable(
  scrollRef: React.RefObject<HTMLDivElement | null>,
  blocks: unknown[],
  settleMs: number = 150,
) {
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const content = el.firstElementChild as HTMLElement | null;
    if (!content) return;

    setReady(false);

    let timeout: number | null = null;

    const observer = new ResizeObserver(() => {
      if (timeout) window.clearTimeout(timeout);

      timeout = window.setTimeout(() => {
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
