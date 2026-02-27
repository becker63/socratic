import { useEffect, useState } from "react";

export function useViewportHeight(
  scrollRef: React.RefObject<HTMLElement | null>,
) {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => setHeight(el.clientHeight);

    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);

    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [scrollRef]);

  return height;
}
