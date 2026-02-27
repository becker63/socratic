import React from "react";
import { Box } from "@chakra-ui/react";
import { MarkdownHooks } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeMermaid from "rehype-mermaid";

export function MdxRenderer({ content }: { content: string }) {
  return (
    <Box
      css={{
        "& p": { marginBottom: "1rem", lineHeight: 1.8 },
        "& ul": { paddingLeft: "1.4rem", marginBottom: "1rem" },
        "& li": { marginBottom: "0.4rem" },
        "& pre": {
          background: "rgba(255,255,255,0.04)",
          padding: "1rem",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.06)",
          overflowX: "auto",
          fontSize: "0.9rem",
        },
        "& code": {
          background: "rgba(255,255,255,0.08)",
          padding: "0.2rem 0.4rem",
          borderRadius: "6px",
        },
        "& svg": {
          background: "rgba(255,255,255,0.03)",
          borderRadius: "12px",
          padding: "0.5rem",
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
