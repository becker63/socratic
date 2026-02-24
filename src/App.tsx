import React from "react";
import { Box, Button, Heading, Input, Text, VStack } from "@chakra-ui/react";
import {
  PromptRequestSchema,
  DialogueSchema,
  type Dialogue,
} from "../shared/schemas";

export function App() {
  const [prompt, setPrompt] = React.useState("Zero trust in microservices");
  const [data, setData] = React.useState<Dialogue | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const body = PromptRequestSchema.parse({ prompt });

      const resp = await fetch("/api/dialogue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await resp.json();
      const parsed = DialogueSchema.parse(json);
      setData(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box p="6">
      <VStack align="stretch" gap="4">
        <Heading size="lg">Security vs Application Engineer</Heading>
        <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <Button onClick={run} loading={loading}>
          Generate
        </Button>

        {error && <Text color="red.500">{error}</Text>}

        {data && (
          <Box>
            {data.conversation.map((m, i) => (
              <Text key={i}>
                <strong>{m.speaker}:</strong> {m.message}
              </Text>
            ))}
            <Box mt="4">
              <Heading size="sm">Mermaid Diagram</Heading>
              <pre>{data.mermaid}</pre>
            </Box>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
