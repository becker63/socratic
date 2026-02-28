import { useEffect, useRef } from "react";
import type { AnyActorRef } from "xstate";

export function useScrollOwnership(
  send: AnyActorRef["send"],
  scrollRef: React.RefObject<HTMLDivElement | null>,
  restoringRef: React.MutableRefObject<boolean>,
) {
  const lastAtBottomRef = useRef<boolean | null>(null);
  const lastScrollTopRef = useRef<number>(0);

  /* ------------------------------------------------------------
     User Intent Detection
  ------------------------------------------------------------ */

  const USER_INTENT_WINDOW_MS = 200;
  const GRACE_MS = 250;

  const lastUserIntentRef = useRef<number>(0);
  const ignoreUntilRef = useRef<number>(0);
  const wasRestoringRef = useRef<boolean>(false);

  const registerUserIntent = () => {
    lastUserIntentRef.current = performance.now();
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener("wheel", registerUserIntent, { passive: true });
    el.addEventListener("touchstart", registerUserIntent, { passive: true });
    el.addEventListener("touchmove", registerUserIntent, { passive: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "PageUp" || e.key === "Home") {
        registerUserIntent();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      el.removeEventListener("wheel", registerUserIntent);
      el.removeEventListener("touchstart", registerUserIntent);
      el.removeEventListener("touchmove", registerUserIntent);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [scrollRef]);

  /* ------------------------------------------------------------
     Scroll Ownership Detection
  ------------------------------------------------------------ */

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const checkOwnership = () => {
      const currentScrollTop = el.scrollTop;

      const atBottom =
        currentScrollTop + el.clientHeight >= el.scrollHeight - 5;

      const delta = currentScrollTop - lastScrollTopRef.current;
      const significantMove = Math.abs(delta) > 4;
      const scrollingUp = delta < -4;

      lastScrollTopRef.current = currentScrollTop;

      const now = performance.now();
      const userRecentlyInteracted =
        now - lastUserIntentRef.current < USER_INTENT_WINDOW_MS;

      const inGraceWindow = now < ignoreUntilRef.current;

      // Detect restore completion → extend grace
      const isRestoring = restoringRef.current;
      if (wasRestoringRef.current && !isRestoring) {
        ignoreUntilRef.current = now + GRACE_MS;
      }
      wasRestoringRef.current = isRestoring;

      console.log("[ownership check]", {
        scrollTop: currentScrollTop,
        delta,
        scrollingUp,
        significantMove,
        atBottom,
        restoring: isRestoring,
        userRecentlyInteracted,
        inGraceWindow,
      });

      // Suppress during machine restore
      if (isRestoring) return;

      /* ------------------------------------------------------------
         Case 1: Upward scroll WITH user intent + outside grace
      ------------------------------------------------------------ */

      if (
        !atBottom &&
        scrollingUp &&
        significantMove &&
        userRecentlyInteracted &&
        !inGraceWindow
      ) {
        if (lastAtBottomRef.current !== false) {
          lastAtBottomRef.current = false;
          send({ type: "USER_SCROLLED_UP" });
        }
        return;
      }

      /* ------------------------------------------------------------
         Case 2: Reached bottom
      ------------------------------------------------------------ */

      if (atBottom) {
        if (lastAtBottomRef.current !== true) {
          lastAtBottomRef.current = true;
          ignoreUntilRef.current = now + GRACE_MS; // small buffer
          send({ type: "USER_AT_BOTTOM" });
        }
      }
    };

    el.addEventListener("scroll", checkOwnership, { passive: true });

    lastScrollTopRef.current = el.scrollTop;
    lastAtBottomRef.current =
      el.scrollTop + el.clientHeight >= el.scrollHeight - 5;

    checkOwnership();

    return () => {
      el.removeEventListener("scroll", checkOwnership);
    };
  }, [send, scrollRef, restoringRef]);
}
