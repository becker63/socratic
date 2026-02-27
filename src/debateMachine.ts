// src/machines/debateMachine.ts
import { setup, assign, fromPromise } from "xstate";
import type { Dialogue } from "../shared/schemas";
import { replayDialogue } from "./replay";

/* ------------------------------------------------------------
   Utilities
------------------------------------------------------------ */

function now() {
  return typeof performance !== "undefined"
    ? performance.now().toFixed(2)
    : Date.now();
}

function emitTestEvent(type: string, payload?: any) {
  if (typeof window !== "undefined") {
    const w = window as any;
    if (w.__socratic?.onMachineEvent) {
      w.__socratic.onMachineEvent({ type, payload });
    }
  }
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

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

  /* ------------------------------------------------------------
     Global Instrumentation
  ------------------------------------------------------------ */

  actions: {
    logTransition: ({ context, event, self }) => {
      const snapshot = self.getSnapshot();

      const lifecycleState =
        typeof snapshot.value === "object" && "lifecycle" in snapshot.value
          ? snapshot.value.lifecycle
          : snapshot.value;

      const scrollState =
        typeof snapshot.value === "object" && "scroll" in snapshot.value
          ? snapshot.value.scroll
          : null;

      const logPayload = {
        t: now(),
        event: event.type,
        lifecycle: lifecycleState,
        scroll: scrollState,
        context: deepClone(context),
      };

      console.log("[machine transition]", logPayload);
      emitTestEvent("TRANSITION", logPayload);
    },

    logUserAtBottom: ({ context }) => {
      const payload = {
        t: now(),
        type: "USER_AT_BOTTOM",
        context: deepClone(context),
      };
      console.log("[machine] USER_AT_BOTTOM", payload);
      emitTestEvent("USER_AT_BOTTOM", payload);
    },

    logUserScrolledUp: ({ context }) => {
      const payload = {
        t: now(),
        type: "USER_SCROLLED_UP",
        context: deepClone(context),
      };
      console.log("[machine] USER_SCROLLED_UP", payload);
      emitTestEvent("USER_SCROLLED_UP", payload);
    },
  },

  actors: {
    replayActor: fromPromise(
      async ({ input }: { input: { dialogue: Dialogue } }) => {
        console.log("[machine] replayActor invoked", {
          t: now(),
          turns: input.dialogue.turns.length,
        });

        await replayDialogue(input.dialogue);

        console.log("[machine] replayActor completed", {
          t: now(),
        });
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
    lifecycle: {
      initial: "idle",

      states: {
        idle: {
          entry: "logTransition",

          on: {
            GENERATE: {
              target: "ready",
              actions: [
                assign({
                  dialogue: ({ event }) => event.dialogue,
                  error: () => null,
                }),
                "logTransition",
              ],
            },
          },
        },

        ready: {
          entry: "logTransition",

          on: {
            REPLAY: {
              target: "replaying",
              actions: "logTransition",
            },
          },
        },

        replaying: {
          entry: "logTransition",

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
              actions: "logTransition",
            },
            onError: {
              target: "error",
              actions: [
                assign({
                  error: ({ event }) => String(event.error),
                }),
                "logTransition",
              ],
            },
          },
        },

        complete: {
          entry: "logTransition",

          on: {
            REPLAY: {
              target: "replaying",
              actions: "logTransition",
            },
          },
        },

        error: {
          entry: "logTransition",

          on: {
            GENERATE: {
              target: "ready",
              actions: [
                assign({
                  dialogue: ({ event }) => event.dialogue,
                  error: () => null,
                }),
                "logTransition",
              ],
            },
          },
        },
      },
    },

    scroll: {
      initial: "machineOwned",

      states: {
        machineOwned: {
          entry: "logTransition",

          on: {
            USER_SCROLLED_UP: {
              target: "userOwned",
              actions: ["logUserScrolledUp", "logTransition"],
            },
          },
        },

        userOwned: {
          entry: "logTransition",

          on: {
            USER_AT_BOTTOM: {
              target: "machineOwned",
              actions: ["logUserAtBottom", "logTransition"],
            },
          },
        },
      },
    },
  },
});
