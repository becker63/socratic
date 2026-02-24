// shared/schemas.ts
import { z } from "zod";

/**
 * Prompt Input
 */
export const PromptRequestSchema = z.object({
  prompt: z.string().min(1),
});

/**
 * Speakers
 */
export const SpeakerSchema = z.enum([
  "security_engineer",
  "application_engineer",
]);

export type Speaker = z.infer<typeof SpeakerSchema>;

/**
 * A single conversational turn.
 * mdx is markdown/MDX-ish content (we'll render as markdown).
 * Mermaid diagrams are expressed as ```mermaid code fences inside mdx.
 */
export const TurnSchema = z.object({
  speaker: SpeakerSchema,
  mdx: z.string().min(1),
});

export type Turn = z.infer<typeof TurnSchema>;

/**
 * Dialogue root
 */
export const DialogueSchema = z.object({
  topic: z.string().min(1),
  turns: z.array(TurnSchema).min(6).max(12),
});

export type Dialogue = z.infer<typeof DialogueSchema>;
