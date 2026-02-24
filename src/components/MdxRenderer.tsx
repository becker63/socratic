import React from "react";
import { Box } from "@chakra-ui/react";
import { MarkdownHooks } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeMermaid from "rehype-mermaid";

export function MdxRenderer({ content }: { content: string }) {
  return (
    <Box
      css={{
        "& p": { mb: 3, lineHeight: 1.7 },
        "& ul": { pl: 6, mb: 3 },
        "& li": { mb: 1.5 },
        "& pre": {
          bg: "surface",
          p: 4,
          borderRadius: "lg",
          borderWidth: "1px",
          overflowX: "auto",
        },
        "& code": {
          bg: "subtle",
          px: 2,
          py: 1,
          borderRadius: "md",
        },
        "& svg": {
          bg: "surface",
          borderRadius: "lg",
          p: 2,
        },
      }}
    >
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
