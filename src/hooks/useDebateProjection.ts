import { useEffect, useState } from "react";
import type { Turn } from "../../shared/schemas";
import { bus } from "../bus";

/**
 * LayoutBlock
 *
 * UI-projected representation of a Turn.
 * Adds:
 * - stable unique id
 * - measured height (for mirrored panes)
 */
export type LayoutBlock = Turn & {
  id: string;
  height?: number;
};

/**
 * useDebateProjection
 *
 * Responsibility:
 * Project domain events (via bus) into renderable UI blocks.
 *
 * This is an event → view-model adapter.
 * It keeps UI concerns (ids, measured height)
 * separate from the state machine.
 */
export function useDebateProjection() {
  const [blocks, setBlocks] = useState<LayoutBlock[]>([]);

  useEffect(() => {
    // Clear projection on replay start
    function onStart() {
      setBlocks([]);
    }

    // Append new turn to projection
    function onAppend(turn: Turn) {
      setBlocks((prev) => [
        ...prev,
        {
          ...turn,
          id: crypto.randomUUID(), // stable render key
        },
      ]);
    }

    // Update measured height once bubble renders
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
