import React, { useEffect, useRef, useState } from "react";
import { Box, Button, Input, Text } from "@chakra-ui/react";
import {
  PromptRequestSchema,
  DialogueSchema,
  type Dialogue,
  type Turn,
} from "../shared/schemas";
import { replayDialogue } from "./replay/controller";
import { bus } from "./replay/bus";
import fixtureData from "./fixtures/dialogue.json";
import { MdxRenderer } from "./components/MdxRenderer";

const USE_STATIC_FIXTURE = true;

type LayoutBlock = {
  id: string;
  speaker: "security" | "application";
  mdx: string;
  height?: number;
};

function mapSpeaker(s: Turn["speaker"]): "security" | "application" {
  return s === "security_engineer" ? "security" : "application";
}

export function App() {
  const [prompt, setPrompt] = useState("Zero trust in microservices");
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<LayoutBlock[]>([]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);

    try {
      let parsed: Dialogue;

      if (USE_STATIC_FIXTURE) {
        parsed = DialogueSchema.parse(fixtureData);
      } else {
        const body = PromptRequestSchema.parse({
          prompt,
        });

        const resp = await fetch("/api/dialogue", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
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
    function onStart() {
      setBlocks([]);
    }

    function onAppend(turn: Turn) {
      setBlocks((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          speaker: mapSpeaker(turn.speaker),
          mdx: turn.mdx,
        },
      ]);
    }

    function onRendered({ id, height }: { id: string; height: number }) {
      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, height } : b)),
      );
    }

    bus.on("REPLAY_START", onStart);
    bus.on("APPEND_TURN", onAppend);
    bus.on("TURN_RENDERED", onRendered);

    return () => {
      bus.off("REPLAY_START", onStart);
      bus.off("APPEND_TURN", onAppend);
      bus.off("TURN_RENDERED", onRendered);
    };
  }, []);

  useEffect(() => {
    if (dialogue) {
      replayDialogue(dialogue);
    }
  }, [dialogue]);

  const lastAppendedIdRef = useRef<string | null>(null);

  useEffect(() => {
    function onStart() {
      setBlocks([]);
      lastAppendedIdRef.current = null;
    }

    function onAppend(turn: Turn) {
      const id = crypto.randomUUID();

      lastAppendedIdRef.current = id;

      setBlocks((prev) => [
        ...prev,
        {
          id,
          speaker: mapSpeaker(turn.speaker),
          mdx: turn.mdx,
        },
      ]);
    }

    function onRendered({ id, height }: { id: string; height: number }) {
      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, height } : b)),
      );
    }

    bus.on("REPLAY_START", onStart);
    bus.on("APPEND_TURN", onAppend);
    bus.on("TURN_RENDERED", onRendered);

    return () => {
      bus.off("REPLAY_START", onStart);
      bus.off("APPEND_TURN", onAppend);
      bus.off("TURN_RENDERED", onRendered);
    };
  }, []);

  useEffect(() => {
    if (!lastAppendedIdRef.current) return;

    const el = scrollRef.current;
    if (!el) return;

    requestAnimationFrame(() => {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [blocks]);

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

        <Button colorScheme="blue" onClick={generate} isLoading={loading}>
          Generate
        </Button>

        <Button variant="outline" onClick={replay} disabled={!dialogue}>
          Replay
        </Button>
      </Box>

      {/* Debate Surface */}
      <Box ref={scrollRef} flex="1" overflowY="auto" minH="0">
        {blocks.map((block) => (
          <TurnRow key={block.id} block={block} />
        ))}
      </Box>
    </Box>
  );
}

function TurnRow({ block }: { block: LayoutBlock }) {
  return (
    <Box display="grid" gridTemplateColumns="1fr 1fr" px="4" py="2">
      <Box>
        {block.speaker === "security" ? (
          <MeasuredBubble id={block.id} content={block.mdx} />
        ) : (
          <Box height={block.height ? `${block.height}px` : "0px"} />
        )}
      </Box>

      <Box>
        {block.speaker === "application" ? (
          <MeasuredBubble id={block.id} content={block.mdx} />
        ) : (
          <Box height={block.height ? `${block.height}px` : "0px"} />
        )}
      </Box>
    </Box>
  );
}

function MeasuredBubble({ id, content }: { id: string; content: string }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const el = ref.current;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;

        bus.emit("TURN_RENDERED", {
          id,
          height,
        });
      }
    });

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [id]);

  return (
    <Box
      ref={ref}
      maxW="90%"
      borderWidth="1px"
      borderRadius="md"
      px="3"
      py="2"
      fontSize="sm"
      lineHeight="1.5"
    >
      <MdxRenderer content={content} />
    </Box>
  );
}
