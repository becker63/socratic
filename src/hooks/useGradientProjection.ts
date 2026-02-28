import { useEffect, useRef, useState } from "react";

export function useGradientProjection(
  scrollRef: React.RefObject<HTMLDivElement | null>,
  layoutReady: boolean,
  scrollOwner: "machineOwned" | "userOwned",
  restoringRef: React.MutableRefObject<boolean>,
  maxDistance: number = 400,
) {
  const [intensity, setIntensity] = useState(1);

  const GRACE_MS = 200;

  const graceUntilRef = useRef<number>(0);
  const prevOwnerRef = useRef(scrollOwner);

  const intensityRef = useRef(1);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!layoutReady) return;

    const el = scrollRef.current;
    if (!el) return;

    const now = performance.now();

    // Detect ownership transition
    if (prevOwnerRef.current !== scrollOwner) {
      if (scrollOwner === "userOwned") {
        graceUntilRef.current = now + GRACE_MS;
      }
      prevOwnerRef.current = scrollOwner;
    }

    const lerpTo = (target: number, smoothing = 0.08) => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      const animate = () => {
        const current = intensityRef.current;
        const next = current + (target - current) * smoothing;

        intensityRef.current = next;
        setIntensity(next);

        if (Math.abs(next - target) > 0.002) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          intensityRef.current = target;
          setIntensity(target);
        }
      };

      rafRef.current = requestAnimationFrame(animate);
    };

    const update = () => {
      const now = performance.now();

      // 🔥 Machine override: snap to full intensity
      if (scrollOwner === "machineOwned") {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        intensityRef.current = 1;
        setIntensity(1);
        return;
      }

      // 🔥 Suppress fade during restore
      if (restoringRef.current) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        intensityRef.current = 1;
        setIntensity(1);
        return;
      }

      // 🔥 Grace window after ownership change
      if (now < graceUntilRef.current) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        intensityRef.current = 1;
        setIntensity(1);
        return;
      }

      // 🔥 Continuous geometric fade
      const distance = el.scrollHeight - (el.scrollTop + el.clientHeight);

      const normalized = Math.max(0, Math.min(distance / maxDistance, 1));

      const target = 1 - normalized;

      // Smoothly approach target
      lerpTo(target);
    };

    update();
    el.addEventListener("scroll", update, { passive: true });

    return () => {
      el.removeEventListener("scroll", update);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [layoutReady, scrollOwner, scrollRef, restoringRef, maxDistance]);

  return { intensity };
}
