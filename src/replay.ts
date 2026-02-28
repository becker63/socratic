import type { Dialogue } from "../shared/schemas";
import { bus } from "./bus";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Global pacing control.
 * 1   = normal
 * 1.5 = slower
 * 2   = cinematic slow
 * 0.5 = fast
 */
const REPLAY_SPEED = 1.6;

function computeDelay(mdx: string) {
  const words = mdx.split(/\s+/).filter(Boolean).length;

  // Base reading rhythm
  const base = 1400; // initial pause before reading
  const perWord = 45; // reading pacing per word

  let delay = base + words * perWord;

  // Visual soak time
  if (mdx.includes("```mermaid")) {
    delay += 2000; // diagrams deserve longer pause
  }

  if (mdx.includes("```") && !mdx.includes("```mermaid")) {
    delay += 1400; // code blocks get extra time
  }

  return delay * REPLAY_SPEED;
}

export async function replayDialogue(dialogue: Dialogue) {
  bus.emit("REPLAY_START");

  for (const turn of dialogue.turns) {
    console.log("[bus] APPEND_TURN");
    bus.emit("APPEND_TURN", turn);

    const delay = computeDelay(turn.mdx);

    await sleep(delay);
  }

  bus.emit("REPLAY_COMPLETE");
}
