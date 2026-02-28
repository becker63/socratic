import { OpenAI } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { PromptRequestSchema, DialogueSchema } from "./shared/schemas";
import { mkdirSync, writeFileSync } from "fs";
import { dirname } from "path";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM = `
You generate a structured architectural debate between two engineer archetypes.

Return JSON that matches the provided schema exactly.

STRUCTURE:
- topic: string
- turns: array of objects
    - speaker: "security_engineer" | "application_engineer"
    - mdx: string (valid markdown / MDX content)

CONVERSATION RULES:
- The first turn must be from "security_engineer".
- Speakers must strictly alternate.
- Each speaker must contribute 3–4 turns.
- Total turns: 6–8.
- The debate must include real disagreement and visible trade-offs.
- Avoid generic agreement or polite convergence too early.

CONTENT RULES:
- The "mdx" field must contain valid markdown.
- Allowed constructs:
    - short paragraphs
    - bullet lists (max 3 per turn)
    - headings
    - fenced code blocks
    - fenced mermaid diagrams
- Do not include markdown fences outside the mdx string.
- Do not include commentary outside the JSON response.
- Do not include extra keys.

RESPONSE LENGTH RULES:
- Each turn must be under 500 characters.
- Keep ideas focused and tight.
- Avoid dense implementation detail unless directly relevant.
- Formatting (headings, bullets, diagrams) is encouraged — but must improve clarity, not increase length.

MERMAID RULES:
- Use fenced code block with language "mermaid".
- Must begin with: flowchart LR
- Keep diagrams minimal (≤6 nodes, ≤8 edges).
- No nested subgraphs.
- Do not use:
    - click directives
    - classDef
    - note over
    - sequenceDiagram

STYLE AND TONE:

- Write like two senior engineers debating at a whiteboard.
- Conversational, sharp, and opinionated.
- Avoid sounding like a design document or compliance checklist.
- Use MDX formatting creatively to make ideas visually clear.
- Avoid long, dense bullet lists.
- Avoid stacking acronyms (max 2 per turn unless essential).

DIALOGUE DYNAMICS:

- Each turn must directly respond to the previous turn.
- Maintain tension; do not converge too quickly.
- Make the philosophical difference clear.
- The final turn may propose compromise, but preserve worldview contrast.

CHARACTERIZATION:

Security Engineer:
- Thinks in terms of blast radius and worst-case scenarios.
- Pushes for principled, uniform guardrails.
- Often asks “what happens when…” or says “assume compromise.”

Application Engineer:
- Thinks in terms of velocity and developer experience.
- Pushes for incremental, pragmatic solutions.
- Often asks “can we…” or “do we really need…”
`.trim();

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function writeFixture(dialogue: unknown) {
  const path = "./src/fixtures/dialogue.json";
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(dialogue, null, 2), "utf-8");
}

async function handleDialogue(req: Request) {
  const body = PromptRequestSchema.parse(await req.json());

  const start = performance.now();

  const response = await client.responses.parse({
    model: "gpt-5",
    input: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Topic: ${body.prompt}` },
    ],
    text: {
      format: zodTextFormat(DialogueSchema, "dialogue"),
    },
  });

  const duration = performance.now() - start;

  const parsed = DialogueSchema.parse(response.output_parsed);

  // Minimal but useful logging
  console.log(
    `[openai] model=${response.model} ` +
      `latency=${duration.toFixed(0)}ms ` +
      `tokens=${response.usage?.total_tokens ?? "?"}`,
  );

  writeFixture(parsed);

  return json(parsed);
}

Bun.serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/api/dialogue") {
      if (req.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }

      try {
        return await handleDialogue(req);
      } catch (e) {
        return json(
          { error: e instanceof Error ? e.message : String(e) },
          { status: 400 },
        );
      }
    }

    return new Response("Not Found", { status: 404 });
  },
});
