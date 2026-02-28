import { useLayoutEffect, useRef } from "react";

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function useAutoScroll(
  scrollRef: React.RefObject<HTMLDivElement | null>,
  layoutVersion: number,
  scrollOwner: "machineOwned" | "userOwned",
  layoutReady: boolean,
) {
  const prevVersionRef = useRef(layoutVersion);
  const pendingScrollRef = useRef(false);
  const restoringRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const ownerRef = useRef(scrollOwner);
  ownerRef.current = scrollOwner;

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const cancel = () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      restoringRef.current = false;
    };

    /* ------------------------------------------------------------
       Phase 1 — Detect New Stable Layout Cycle
    ------------------------------------------------------------ */

    if (layoutVersion !== prevVersionRef.current) {
      prevVersionRef.current = layoutVersion;

      if (scrollOwner === "machineOwned") {
        pendingScrollRef.current = true;
      }
    }

    /* ------------------------------------------------------------
       Phase 2 — Execute Scroll After Stable Commit
    ------------------------------------------------------------ */

    if (
      layoutReady &&
      pendingScrollRef.current &&
      scrollOwner === "machineOwned"
    ) {
      pendingScrollRef.current = false;

      cancel();

      const isTest = import.meta.env.MODE === "test";

      // 🔥 Wait two frames for DOM + motion flush
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => {
          const currentEl = scrollRef.current;
          if (!currentEl || ownerRef.current !== "machineOwned") {
            cancel();
            return;
          }

          // 🔥 NEW: Prevent scroll cycle when no overflow exists
          if (currentEl.scrollHeight <= currentEl.clientHeight) {
            restoringRef.current = false;
            return;
          }

          // 🔥 Recompute AFTER settle
          const start = currentEl.scrollTop;
          const target = Math.max(
            0,
            currentEl.scrollHeight - currentEl.clientHeight,
          );

          const distance = target - start;

          if (Math.abs(distance) < 1) {
            restoringRef.current = false;
            return;
          }

          restoringRef.current = true;

          if (isTest) {
            currentEl.scrollTop = target;
            restoringRef.current = false;
            return;
          }

          const duration = 700;
          const startTime = performance.now();

          const animate = (now: number) => {
            const elNow = scrollRef.current;
            if (!elNow || ownerRef.current !== "machineOwned") {
              cancel();
              return;
            }

            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeOutCubic(progress);

            elNow.scrollTop = start + distance * eased;

            if (progress < 1) {
              rafRef.current = requestAnimationFrame(animate);
            } else {
              elNow.scrollTop = target;
              cancel();
            }
          };

          rafRef.current = requestAnimationFrame(animate);
        });
      });
    }

    return () => cancel();
  }, [layoutVersion, layoutReady, scrollOwner, scrollRef]);

  return restoringRef;
}
