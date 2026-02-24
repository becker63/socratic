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
- Each speaker must contribute 3–5 turns.
- Total turns: 6–10.
- The debate must include real disagreement and trade-offs.
- Avoid generic statements.

CONTENT RULES:
- The "mdx" field must contain valid markdown.
- Allowed markdown constructs:
    - paragraphs
    - bullet lists
    - headings
    - fenced code blocks
    - mermaid fenced diagrams
- Do not include markdown fences outside the mdx string.
- Do not include commentary outside the JSON response.
- Do not include extra keys.

MERMAID RULES:
- If including a diagram, use a fenced code block with language "mermaid".
- Always begin diagrams with: flowchart LR
- Keep diagrams minimal.
- Do not use:
    - click directives
    - classDef
    - note over
    - sequenceDiagram
- Ensure valid Mermaid syntax.

STYLE:
- Technical but concise.
- Cite concrete mechanisms (e.g., SPIFFE, OPA, gateways, rollout modes, failure cases).
- Each turn should respond directly to the previous one.
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
    model: "gpt-5-mini",
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
