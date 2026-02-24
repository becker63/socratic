import mitt from "mitt";
import type { Block } from "../../shared/schemas";

export type Pane = "security" | "application";

export type Events = {
  REPLAY_START: void;
  APPEND_BLOCK: { pane: Pane; block: Block };
  REPLAY_COMPLETE: void;
  MERMAID_READY: void;
};

export const bus = mitt<Events>();
