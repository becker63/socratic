import { useEffect, useState } from "react";
import type { Turn } from "../../shared/schemas";
import { bus } from "../bus";

export type LayoutBlock = Turn & {
  id: string;
  height?: number;
};

export function useDebateProjection() {
  const [blocks, setBlocks] = useState<LayoutBlock[]>([]);

  useEffect(() => {
    function onStart() {
      setBlocks([]);
    }

    function onAppend(turn: Turn) {
      setBlocks((prev) => [
        ...prev,
        {
          ...turn,
          id: crypto.randomUUID(),
        },
      ]);
    }

    function onRendered({ id, height }: { id: string; height: number }) {
      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, height } : b)),
      );
    }

    bus.on("REPLAY_START", onStart);
    bus.on("APPEND_TURN", onAppend);
    bus.on("TURN_RENDERED", onRendered);

    return () => {
      bus.off("REPLAY_START", onStart);
      bus.off("APPEND_TURN", onAppend);
      bus.off("TURN_RENDERED", onRendered);
    };
  }, []);

  return blocks;
}
