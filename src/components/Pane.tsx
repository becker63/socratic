import React from "react";
import { Box, Text } from "@chakra-ui/react";
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
    el.scrollTo({ top: el.scrollHeight });
  }, [turns.length]);

  return (
    <Box
      display="flex"
      flexDirection="column"
      minH="0"
      borderRightWidth={kind === "security" ? "1px" : undefined}
    >
      {/* Title */}
      <Box px="4" py="2" borderBottomWidth="1px" flexShrink={0}>
        <Text
          fontSize="xs"
          textTransform="uppercase"
          letterSpacing="wide"
          color="fg.muted"
        >
          {title}
        </Text>
      </Box>

      {/* Content */}
      <Box ref={scrollRef} flex="1" minH="0" overflowY="auto" px="4" py="3">
        {turns.map((t, i) => (
          <Box key={`${t.speaker}-${i}`} mb="3">
            <MdxRenderer content={t.mdx} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
