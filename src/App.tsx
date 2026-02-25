// src/App.tsx
import React from "react";
import { Box, Button, Input } from "@chakra-ui/react";
import { useDebate } from "./hooks/useDebate";
import { useDebateProjection } from "./hooks/useDebateProjection";
import { useScrollOwnership } from "./hooks/useScrollOwnership";
import { MdxRenderer } from "./components/MdxRenderer";
import { bus } from "./bus";

export function App() {
  const { prompt, setPrompt, loading, state, send, generate, replay } =
    useDebate();

  const blocks = useDebateProjection();

  const { scrollRef, handleScroll } = useScrollOwnership(state, send, blocks);

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

function TurnRow({ block }: { block: any }) {
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
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!ref.current) return;

    const el = ref.current;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        bus.emit("TURN_RENDERED", {
          id,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
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
