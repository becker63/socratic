import React from "react";
import { Box } from "@chakra-ui/react";
import { MarkdownHooks } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeMermaid from "rehype-mermaid";

export function MdxRenderer({ content }: { content: string }) {
  return (
    <Box>
      <MarkdownHooks
        key={content}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeMermaid, { strategy: "inline-svg" }]]}
      >
        {content}
      </MarkdownHooks>
    </Box>
  );
}
