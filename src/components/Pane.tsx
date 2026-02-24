import React, { useEffect, useRef } from "react";
import { Box, Text } from "@chakra-ui/react";
import { MdxRenderer } from "./MdxRenderer";
import { bus } from "../replay/bus";

export type LayoutBlock = {
  id: string;
  speaker: "security" | "application";
  mdx: string;
  height?: number;
};

export function Pane({
  kind,
  title,
  blocks,
}: {
  kind: "security" | "application";
  title: string;
  blocks: LayoutBlock[];
}) {
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
      <Box flex="1" minH="0" px="4" py="3">
        {blocks.map((block) => {
          const isMine = block.speaker === kind;

          return (
            <Box key={block.id} mb="3">
              {isMine ? (
                <MeasuredBubble id={block.id} content={block.mdx} />
              ) : (
                // Spacer mirrors measured height
                <Box height={block.height ? `${block.height}px` : "0px"} />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function MeasuredBubble({ id, content }: { id: string; content: string }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const height = ref.current.offsetHeight;

    bus.emit("TURN_RENDERED", {
      id,
      height,
    });
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
