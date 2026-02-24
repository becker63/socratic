import mitt from "mitt";
import type { Turn } from "../../shared/schemas";

export type Pane = "security" | "application";

export type Events = {
  REPLAY_START: void;
  APPEND_TURN: Turn;
  REPLAY_COMPLETE: void;
};

export const bus = mitt<Events>();
