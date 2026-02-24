import { z } from "zod";

export const PromptRequestSchema = z.object({
  prompt: z.string().min(1),
});

export const BlockSchema = z.object({
  type: z.enum(["paragraph", "code", "bullet_list"]),

  // required fields, nullable when unused
  content: z.union([z.string(), z.null()]),
  language: z.union([z.string(), z.null()]),
  items: z.union([z.array(z.string()), z.null()]),
});

export type Block = z.infer<typeof BlockSchema>;

export const SpeakerSchema = z.enum([
  "security_engineer",
  "application_engineer",
]);

export const TurnSchema = z.object({
  speaker: SpeakerSchema,
  blocks: z.array(BlockSchema).min(1),
});

export type Turn = z.infer<typeof TurnSchema>;

export const DialogueSchema = z.object({
  topic: z.string(),
  conversation: z.array(TurnSchema).min(6).max(10),
  mermaid: z.string(),
});

export type Dialogue = z.infer<typeof DialogueSchema>;
