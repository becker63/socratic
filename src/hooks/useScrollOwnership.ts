import { useEffect, useRef } from "react";
import type { AnyActorRef } from "xstate";

export function useScrollOwnership(
  state: any,
  send: AnyActorRef["send"],
  dependency: unknown,
) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;

    const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 5;

    if (!isAtBottom) {
      send({ type: "USER_SCROLLED_UP" });
    } else {
      send({ type: "USER_AT_BOTTOM" });
    }
  }

  useEffect(() => {
    if (state.value.scroll !== "machineOwned") return;

    const el = scrollRef.current;
    if (!el) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.scrollTo({
          top: el.scrollHeight,
          behavior: "smooth",
        });
      });
    });
  }, [state.value.scroll, dependency]);

  return { scrollRef, handleScroll };
}
