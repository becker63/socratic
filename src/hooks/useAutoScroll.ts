import { useLayoutEffect, useRef } from "react";

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function useAutoScroll(
  scrollRef: React.RefObject<HTMLDivElement | null>,
  blocksLength: number,
  scrollOwner: "machineOwned" | "userOwned",
  layoutReady: boolean,
) {
  const prevLengthRef = useRef(blocksLength);
  const pendingScrollRef = useRef(false);
  const restoringRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  // ✅ Avoid stale-closure issues inside rAF
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
       Phase 1 — Detect Content Growth
    ------------------------------------------------------------ */

    if (blocksLength !== prevLengthRef.current) {
      prevLengthRef.current = blocksLength;

      if (scrollOwner === "machineOwned") {
        pendingScrollRef.current = true;
      }
    }

    /* ------------------------------------------------------------
       Phase 2 — Execute Scroll
    ------------------------------------------------------------ */

    if (
      layoutReady &&
      pendingScrollRef.current &&
      scrollOwner === "machineOwned"
    ) {
      pendingScrollRef.current = false;

      // Always cancel any prior animation before starting a new one
      cancel();

      const start = el.scrollTop;

      // ✅ Correct "bottom" scrollTop target
      const target = Math.max(0, el.scrollHeight - el.clientHeight);

      // Nothing to do
      if (Math.abs(target - start) < 1) {
        restoringRef.current = false;
        return;
      }

      restoringRef.current = true;

      const isTest = import.meta.env.MODE === "test";
      if (isTest) {
        el.scrollTop = target;
        restoringRef.current = false;
        return;
      }

      const duration = 700; // ms
      const startTime = performance.now();

      const animate = (now: number) => {
        const currentEl = scrollRef.current;

        // If we lost the element, don't leave restoring stuck true
        if (!currentEl) {
          cancel();
          return;
        }

        // Abort if ownership changed mid-animation
        if (ownerRef.current !== "machineOwned") {
          cancel();
          return;
        }

        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(progress);

        const next = start + (target - start) * eased;
        currentEl.scrollTop = next;

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          currentEl.scrollTop = target; // guarantee exact bottom
          cancel();
        }
      };

      rafRef.current = requestAnimationFrame(animate);
    }

    // ✅ Critical for StrictMode: cleanup must clear restoringRef
    return () => cancel();
  }, [blocksLength, layoutReady, scrollOwner, scrollRef]);

  return restoringRef;
}
