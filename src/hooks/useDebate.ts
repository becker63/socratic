import { useState, useEffect, useMemo } from "react";
import { useMachine } from "@xstate/react";
import {
  PromptRequestSchema,
  DialogueSchema,
  type Dialogue,
} from "../../shared/schemas";
import fixtureData from "../fixtures/dialogue.json";
import { debateMachine } from "../debateMachine";

const USE_STATIC_FIXTURE = true;

export function useDebate(inspect?: any) {
  const [prompt, setPrompt] = useState("Zero trust in microservices");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // actor is the authoritative runtime instance
  const [state, originalSend, actor] = useMachine(debateMachine, {
    inspect,
  });

  /* ------------------------------------------------------------
     Pre-Transition Logging (Event Boundary)
  ------------------------------------------------------------ */

  // Wrap send so we log every event entering the machine
  const send = useMemo(() => {
    return (event: Parameters<typeof originalSend>[0]) => {
      const before = actor.getSnapshot();

      const payload = {
        t: performance.now(),
        phase: "event",
        event: event.type,
        value: before.value,
        context: before.context,
      };

      console.log("[machine event]", payload);

      if (typeof window !== "undefined") {
        const w = window as any;
        w.__socratic?.onMachineEvent?.(payload);
      }

      originalSend(event);
    };
  }, [originalSend, actor]);

  /* ------------------------------------------------------------
     Post-Transition Logging (State Boundary)
  ------------------------------------------------------------ */

  useEffect(() => {
    if (!actor) return;

    const sub = actor.subscribe((snapshot) => {
      const payload = {
        t: performance.now(),
        phase: "transition",
        value: snapshot.value,
        context: snapshot.context,
      };

      console.log("[machine transition]", payload);

      if (typeof window !== "undefined") {
        const w = window as any;
        w.__socratic?.onMachineEvent?.(payload);
      }
    });

    return () => sub.unsubscribe();
  }, [actor]);

  /* ------------------------------------------------------------
     Domain Commands
  ------------------------------------------------------------ */

  async function generate() {
    setLoading(true);
    setError(null);

    try {
      let parsed: Dialogue;

      if (USE_STATIC_FIXTURE) {
        parsed = DialogueSchema.parse(fixtureData);
      } else {
        const body = PromptRequestSchema.parse({ prompt });

        const resp = await fetch("/api/dialogue", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!resp.ok) throw new Error(await resp.text());

        parsed = DialogueSchema.parse(await resp.json());
      }

      send({ type: "GENERATE", dialogue: parsed });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function replay() {
    send({ type: "REPLAY" });
  }

  return {
    prompt,
    setPrompt,
    loading,
    error,
    send, // wrapped send (instrumented)
    state,
    generate,
    replay,
  };
}
