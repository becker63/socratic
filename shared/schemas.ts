// shared/schemas.ts
import { z } from "zod";

/* ============================================================
   Constants
============================================================ */

// Balanced for 12 turns (keeps latency reasonable)
const MAX_MDX_LENGTH = 850; // Slightly increased from 500
const MAX_MERMAID_BLOCK_LENGTH = 350; // Small bump for clarity
const MAX_TOPIC_LENGTH = 160;

/* ============================================================
   Prompt Input
============================================================ */

export const PromptRequestSchema = z.object({
  prompt: z.string().min(1).max(300),
});

/* ============================================================
   Speakers
============================================================ */

export const SpeakerSchema = z.enum([
  "security_engineer",
  "application_engineer",
]);

export type Speaker = z.infer<typeof SpeakerSchema>;

/* ============================================================
   Mermaid Validation
============================================================ */

function validateMermaidBlocks(text: string) {
  const blocks = text.match(/```mermaid[\s\S]*?```/g);
  if (!blocks) return true;

  return blocks.every((block) => {
    if (block.length > MAX_MERMAID_BLOCK_LENGTH) return false;

    if (!block.includes("flowchart LR")) return false;

    if (
      block.includes("click ") ||
      block.includes("classDef") ||
      block.includes("note over") ||
      block.includes("sequenceDiagram") ||
      block.includes("subgraph")
    ) {
      return false;
    }

    return true;
  });
}

/* ============================================================
   Turn Schema
============================================================ */

export const TurnSchema = z.object({
  speaker: SpeakerSchema,
  mdx: z.string().min(1).max(MAX_MDX_LENGTH).refine(validateMermaidBlocks, {
    message: "Invalid or oversized mermaid diagram block",
  }),
});

export type Turn = z.infer<typeof TurnSchema>;

/* ============================================================
   Dialogue Root
============================================================ */

export const DialogueSchema = z.object({
  topic: z.string().min(1).max(MAX_TOPIC_LENGTH),

  // Exactly 12 turns for a strong visual + narrative arc
  turns: z.array(TurnSchema).length(12),
});

export type Dialogue = z.infer<typeof DialogueSchema>;
