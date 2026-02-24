import { z } from "zod";

export const PromptRequestSchema = z.object({
  prompt: z.string().min(1),
});

export const DialogueSchema = z.object({
  topic: z.string(),
  conversation: z.array(
    z.object({
      speaker: z.enum(["security_engineer", "application_engineer"]),
      message: z.string(),
    }),
  ),
  mermaid: z.string(),
});

export type Dialogue = z.infer<typeof DialogueSchema>;
