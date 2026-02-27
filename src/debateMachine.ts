// src/machines/debateMachine.ts
import { setup, assign, fromPromise } from "xstate";
import type { Dialogue } from "../shared/schemas";
import { replayDialogue } from "./replay";

/* ------------------------------------------------------------
   Machine
------------------------------------------------------------ */

export const debateMachine = setup({
  types: {
    context: {} as {
      dialogue: Dialogue | null;
      error: string | null;
    },
    events: {} as
      | { type: "GENERATE"; dialogue: Dialogue }
      | { type: "REPLAY" }
      | { type: "USER_SCROLLED_UP" }
      | { type: "USER_AT_BOTTOM" }
      | { type: "FAIL"; error: string },
  },

  actors: {
    replayActor: fromPromise(
      async ({ input }: { input: { dialogue: Dialogue } }) => {
        await replayDialogue(input.dialogue);
      },
    ),
  },
}).createMachine({
  id: "debate",
  type: "parallel",

  context: {
    dialogue: null,
    error: null,
  },

  states: {
    /* ------------------------------------------------------------
       Lifecycle Control Plane
    ------------------------------------------------------------ */

    lifecycle: {
      initial: "idle",

      states: {
        idle: {
          on: {
            GENERATE: {
              target: "ready",
              actions: assign({
                dialogue: ({ event }) => event.dialogue,
                error: () => null,
              }),
            },
          },
        },

        ready: {
          on: {
            REPLAY: {
              target: "replaying",
            },
          },
        },

        replaying: {
          invoke: {
            src: "replayActor",
            input: ({ context }) => {
              if (!context.dialogue) {
                throw new Error("No dialogue available");
              }
              return { dialogue: context.dialogue };
            },
            onDone: {
              target: "complete",
            },
            onError: {
              target: "error",
              actions: assign({
                error: ({ event }) => String(event.error),
              }),
            },
          },
        },

        complete: {
          on: {
            REPLAY: {
              target: "replaying",
            },
          },
        },

        error: {
          on: {
            GENERATE: {
              target: "ready",
              actions: assign({
                dialogue: ({ event }) => event.dialogue,
                error: () => null,
              }),
            },
          },
        },
      },
    },

    /* ------------------------------------------------------------
       Scroll Ownership Control Plane
    ------------------------------------------------------------ */

    scroll: {
      initial: "machineOwned",

      states: {
        machineOwned: {
          on: {
            USER_SCROLLED_UP: {
              target: "userOwned",
            },
          },
        },

        userOwned: {
          on: {
            USER_AT_BOTTOM: {
              target: "machineOwned",
            },
          },
        },
      },
    },
  },
});
