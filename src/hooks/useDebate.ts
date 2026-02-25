import { useState } from "react";
import { useMachine } from "@xstate/react";
import {
  PromptRequestSchema,
  DialogueSchema,
  type Dialogue,
} from "../../shared/schemas";
import fixtureData from "../fixtures/dialogue.json";
import { debateMachine } from "../debateMachine";

const USE_STATIC_FIXTURE = true;

export function useDebate() {
  const [prompt, setPrompt] = useState("Zero trust in microservices");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [state, send] = useMachine(debateMachine);

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
    send,
    state,
    generate,
    replay,
  };
}
