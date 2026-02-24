import type { Dialogue } from "../../shared/schemas";
import { bus } from "./bus";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function computeDelay(mdx: string) {
  const words = mdx.split(/\s+/).length;

  // Base delay + reading time
  const base = 800; // minimum pause
  const perWord = 25; // reading pacing

  return base + words * perWord;
}

export async function replayDialogue(dialogue: Dialogue) {
  bus.emit("REPLAY_START");

  for (const turn of dialogue.turns) {
    bus.emit("APPEND_TURN", turn);

    const delay = computeDelay(turn.mdx);

    await sleep(delay);
  }

  bus.emit("REPLAY_COMPLETE");
}
