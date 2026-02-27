import { useEffect, useRef } from "react";
import type { AnyActorRef } from "xstate";

export function useScrollOwnership(
  send: AnyActorRef["send"],
  scrollRef: React.RefObject<HTMLDivElement | null>,
  restoringRef: React.MutableRefObject<boolean>,
) {
  const lastAtBottomRef = useRef<boolean | null>(null);
  const lastScrollTopRef = useRef<number>(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const checkOwnership = () => {
      const currentScrollTop = el.scrollTop;
      const atBottom =
        currentScrollTop + el.clientHeight >= el.scrollHeight - 5;

      const scrollingUp = currentScrollTop < lastScrollTopRef.current;
      const scrollingDown = currentScrollTop > lastScrollTopRef.current;

      console.log("[ownership check]", {
        scrollTop: currentScrollTop,
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight,
        atBottom,
        restoring: restoringRef.current,
        lastAtBottom: lastAtBottomRef.current,
        scrollingUp,
        scrollingDown,
      });

      // Update scrollTop tracker immediately
      lastScrollTopRef.current = currentScrollTop;

      // Ignore machine-driven scroll restoration
      if (restoringRef.current) return;

      // If user actively scrolled upward and we are no longer at bottom
      if (!atBottom && scrollingUp) {
        if (lastAtBottomRef.current !== false) {
          lastAtBottomRef.current = false;
          send({ type: "USER_SCROLLED_UP" });
        }
        return;
      }

      // If we reached bottom (either via user scroll down or auto-scroll)
      if (atBottom) {
        if (lastAtBottomRef.current !== true) {
          lastAtBottomRef.current = true;
          send({ type: "USER_AT_BOTTOM" });
        }
      }
    };

    el.addEventListener("scroll", checkOwnership, { passive: true });

    // Initialize tracking state
    lastScrollTopRef.current = el.scrollTop;
    lastAtBottomRef.current =
      el.scrollTop + el.clientHeight >= el.scrollHeight - 5;

    checkOwnership();

    return () => {
      el.removeEventListener("scroll", checkOwnership);
    };
  }, [send, scrollRef, restoringRef]);
}
