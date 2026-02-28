// shared/schemas.ts
import { z } from "zod";

/* ============================================================
   Constants
============================================================ */

const MAX_MDX_LENGTH = 500; // Hard cap per turn (tight + demo-safe)
const MAX_MERMAID_BLOCK_LENGTH = 300; // Diagram can never dominate the turn
const MAX_TOPIC_LENGTH = 160; // Enough for specificity, prevents rambling

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
    // Size constraint
    if (block.length > MAX_MERMAID_BLOCK_LENGTH) return false;

    // Must begin with flowchart LR
    if (!block.includes("flowchart LR")) return false;

    // Basic forbidden constructs
    if (
      block.includes("click ") ||
      block.includes("classDef") ||
      block.includes("note over") ||
      block.includes("sequenceDiagram")
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

  // Tighten to match system prompt (6–10)
  turns: z.array(TurnSchema).min(6).max(10),
});

export type Dialogue = z.infer<typeof DialogueSchema>;
