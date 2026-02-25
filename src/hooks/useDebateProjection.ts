import { useEffect, useState } from "react";
import type { Turn } from "../../shared/schemas";
import { bus } from "../bus";

export type LayoutBlock = {
  id: string;
  speaker: "security" | "application";
  mdx: string;
  height?: number;
};

function mapSpeaker(s: Turn["speaker"]): "security" | "application" {
  return s === "security_engineer" ? "security" : "application";
}

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
          id: crypto.randomUUID(),
          speaker: mapSpeaker(turn.speaker),
          mdx: turn.mdx,
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
