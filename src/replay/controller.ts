import type { Dialogue, Turn } from "../../shared/schemas";
import { bus, type Pane } from "./bus";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function paneForSpeaker(speaker: Turn["speaker"]): Pane {
  return speaker === "security_engineer" ? "security" : "application";
}

export async function replayDialogue(
  dialogue: Dialogue,
  opts?: { delayMs?: number },
) {
  const delayMs = opts?.delayMs ?? 350;

  bus.emit("REPLAY_START");

  for (const turn of dialogue.conversation) {
    const pane = paneForSpeaker(turn.speaker);

    for (const block of turn.blocks) {
      bus.emit("APPEND_BLOCK", { pane, block });
      await sleep(delayMs);
    }
  }

  // Give mermaid renderer a chance to re-render if you want to “pause” here:
  // (we'll emit MERMAID_READY from MermaidRenderer after it finishes)
  // await waitForMermaidReady();

  bus.emit("REPLAY_COMPLETE");
}
