import { useLayoutEffect, useRef } from "react";

export function useAutoScroll(
  scrollRef: React.RefObject<HTMLDivElement | null>,
  blocksLength: number,
  scrollOwner: "machineOwned" | "userOwned",
  layoutReady: boolean,
) {
  const prevLengthRef = useRef(blocksLength);
  const pendingScrollRef = useRef(false);
  const restoringRef = useRef(false);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (blocksLength !== prevLengthRef.current) {
      prevLengthRef.current = blocksLength;

      if (scrollOwner === "machineOwned") {
        pendingScrollRef.current = true;
      }
    }

    if (layoutReady && pendingScrollRef.current) {
      restoringRef.current = true;
      el.scrollTop = el.scrollHeight;
      el.dispatchEvent(new Event("scroll")); // ensure ownership recalculates

      restoringRef.current = false;
      pendingScrollRef.current = false;
    }
  }, [blocksLength, layoutReady, scrollOwner]);

  return restoringRef;
}
