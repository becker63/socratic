import React from "react";
import {
  Box,
  Button,
  Heading,
  Input,
  Text,
  VStack,
  Grid,
} from "@chakra-ui/react";
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
  const [validated, setValidated] = React.useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    setValidated(false);

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
      setValidated(true);
      queueMicrotask(() => replayDialogue(parsed));
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

  return (
    <Box p="6">
      <VStack align="stretch" gap="4">
        <Heading size="lg">Socratic</Heading>

        <Box display="flex" gap="3">
          <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <Button onClick={generate} loading={loading}>
            Generate
          </Button>
          <Button onClick={replay} disabled={!dialogue}>
            Replay
          </Button>
        </Box>

        {validated && <Text fontSize="sm">✅ Schema Validated Output</Text>}
        {error && <Text color="red.500">{error}</Text>}

        <Grid templateColumns="1fr 1fr" gap="4">
          <Pane kind="security" title="Security Engineer" />
          <Pane kind="application" title="Application Engineer" />
        </Grid>
      </VStack>
    </Box>
  );
}
