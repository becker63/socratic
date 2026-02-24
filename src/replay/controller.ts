import type { Dialogue } from "../../shared/schemas";
import { bus } from "./bus";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function replayDialogue(
  dialogue: Dialogue,
  opts?: { delayMs?: number },
) {
  const delayMs = opts?.delayMs ?? 350;

  bus.emit("REPLAY_START");

  for (const turn of dialogue.turns) {
    bus.emit("APPEND_TURN", turn);
    await sleep(delayMs);
  }

  bus.emit("REPLAY_COMPLETE");
}
