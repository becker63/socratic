import React, { useEffect } from "react";
import { Box, Button, Input } from "@chakra-ui/react";
import {
  PromptRequestSchema,
  DialogueSchema,
  type Dialogue,
} from "../shared/schemas";
import { Pane } from "./components/Pane";
import { replayDialogue } from "./replay/controller";
import fixtureData from "./fixtures/dialogue.json";

const USE_STATIC_FIXTURE = true;

export function App() {
  const [prompt, setPrompt] = React.useState("Zero trust in microservices");
  const [dialogue, setDialogue] = React.useState<Dialogue | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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

      setDialogue(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDialogue(null);
    } finally {
      setLoading(false);
    }
  }

  async function replay() {
    if (!dialogue) return;
    await replayDialogue(dialogue);
  }

  useEffect(() => {
    if (dialogue) {
      replayDialogue(dialogue);
    }
  }, [dialogue]);

  useEffect(() => {
    if (error) {
      console.error(error);
    }
  }, [error]);

  return (
    <Box
      height="100vh"
      display="flex"
      flexDirection="column"
      bg="bg"
      color="fg"
    >
      {/* Prompt Bar */}
      <Box
        px="6"
        py="3"
        borderBottomWidth="1px"
        display="flex"
        gap="3"
        flexShrink={0}
      >
        <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} />

        <Button colorScheme="blue" onClick={generate} loading={loading}>
          Generate
        </Button>

        <Button variant="outline" onClick={replay} disabled={!dialogue}>
          Replay
        </Button>
      </Box>

      {/* Debate Surface */}
      <Box flex="1" display="grid" gridTemplateColumns="1fr 1fr" minH="0">
        <Pane kind="security" title="Security Engineer" />
        <Pane kind="application" title="Application Engineer" />
      </Box>
    </Box>
  );
}
