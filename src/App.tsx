// src/App.tsx
import React, { useEffect, useRef, useState } from "react";
import { Box, Button, Input } from "@chakra-ui/react";
import { useMachine } from "@xstate/react";
import {
  PromptRequestSchema,
  DialogueSchema,
  type Dialogue,
  type Turn,
} from "../shared/schemas";
import fixtureData from "./fixtures/dialogue.json";
import { bus } from "./replay/bus";
import { MdxRenderer } from "./components/MdxRenderer";
import { debateMachine } from "./machines/debateMachine";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<LayoutBlock[]>([]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [state, send] = useMachine(debateMachine);

  // ========================
  // GENERATE
  // ========================
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

  // ========================
  // REPLAY
  // ========================
  function replay() {
    send({ type: "REPLAY" });
  }

  // ========================
  // BUS PROJECTION
  // ========================
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

  // ========================
  // SCROLL OWNERSHIP DETECTION
  // ========================
  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;

    const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 5;

    if (!isAtBottom) {
      send({ type: "USER_SCROLLED_UP" });
    } else {
      send({ type: "USER_AT_BOTTOM" });
    }
  }

  // ========================
  // AUTO SCROLL (machine-owned only)
  // ========================
  useEffect(() => {
    if (!state.matches({ scroll: "machineOwned" })) return;

    const el = scrollRef.current;
    if (!el) return;

    requestAnimationFrame(() => {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [blocks, state]);

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

        <Button
          variant="outline"
          onClick={replay}
          disabled={!state.context.dialogue}
        >
          Replay
        </Button>
      </Box>

      {/* Debate Surface */}
      <Box
        ref={scrollRef}
        flex="1"
        overflowY="auto"
        minH="0"
        onScroll={handleScroll}
      >
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
