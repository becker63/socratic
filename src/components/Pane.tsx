import React from "react";
import { Box, Heading, VStack } from "@chakra-ui/react";
import type { Turn } from "../../shared/schemas";
import { bus, type Pane as PaneKind } from "../replay/bus";
import { MdxRenderer } from "./MdxRenderer";

function speakerMatches(kind: PaneKind, speaker: Turn["speaker"]) {
  return (
    (kind === "security" && speaker === "security_engineer") ||
    (kind === "application" && speaker === "application_engineer")
  );
}

export function Pane({ kind, title }: { kind: PaneKind; title: string }) {
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const onStart = () => setTurns([]);
    const onAppend = (turn: Turn) => {
      if (!speakerMatches(kind, turn.speaker)) return;
      setTurns((prev) => [...prev, turn]);
    };

    bus.on("REPLAY_START", onStart);
    bus.on("APPEND_TURN", onAppend);

    return () => {
      bus.off("REPLAY_START", onStart);
      bus.off("APPEND_TURN", onAppend);
    };
  }, [kind]);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns.length]);

  return (
    <Box borderWidth="1px" borderRadius="lg" overflow="hidden" height="520px">
      <Box
        px="4"
        py="3"
        borderBottomWidth="1px"
        position="sticky"
        top="0"
        bg="bg"
      >
        <Heading size="sm">{title}</Heading>
      </Box>

      <Box
        ref={scrollRef}
        px="4"
        py="4"
        overflowY="auto"
        height="calc(520px - 48px)"
      >
        <VStack align="stretch" gap="4">
          {turns.map((t, i) => (
            <MdxRenderer key={`${t.speaker}-${i}`} content={t.mdx} />
          ))}
        </VStack>
      </Box>
    </Box>
  );
}
