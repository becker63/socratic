import React from "react";
import {
  Box,
  Heading,
  VStack,
  Text,
  Code,
  ListRoot,
  ListItem,
} from "@chakra-ui/react";
import type { Block } from "../../shared/schemas";
import { bus, type Pane as PaneKind } from "../replay/bus";

function RenderBlock({ block }: { block: Block }) {
  if (block.type === "paragraph") {
    return <Text>{block.content}</Text>;
  }

  if (block.type === "code") {
    return (
      <Box>
        <Text fontSize="sm" opacity={0.8}>
          {block.language}
        </Text>
        <Code display="block" whiteSpace="pre" p="3" borderRadius="md">
          {block.content}
        </Code>
      </Box>
    );
  }

  return (
    <ListRoot as="ul" ps="5">
      {block.items?.map((it, i) => (
        <ListItem key={i}>{it}</ListItem>
      ))}
    </ListRoot>
  );
}

export function Pane({ kind, title }: { kind: PaneKind; title: string }) {
  const [blocks, setBlocks] = React.useState<Block[]>([]);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const onStart = () => setBlocks([]);
    const onAppend = (e: { pane: PaneKind; block: Block }) => {
      if (e.pane !== kind) return;
      setBlocks((prev) => [...prev, e.block]);
    };

    bus.on("REPLAY_START", onStart);
    bus.on("APPEND_BLOCK", onAppend);

    return () => {
      bus.off("REPLAY_START", onStart);
      bus.off("APPEND_BLOCK", onAppend);
    };
  }, [kind]);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [blocks.length]);

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
        <VStack align="stretch" gap="3">
          {blocks.map((b, i) => (
            <RenderBlock key={i} block={b} />
          ))}
        </VStack>
      </Box>
    </Box>
  );
}
