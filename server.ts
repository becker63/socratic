import { OpenAI } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { PromptRequestSchema, DialogueSchema } from "./shared/schemas";
import { mkdirSync, writeFileSync } from "fs";
import { dirname } from "path";

/* ============================================================
   HTTP-Level Instrumentation
============================================================ */

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  fetch: async (url, options) => {
    const httpStart = performance.now();
    console.log(`[http] → ${url}`);

    const res = await fetch(url, options);

    const httpDuration = performance.now() - httpStart;
    console.log(
      `[http] ← ${url} status=${res.status} duration=${Math.round(
        httpDuration,
      )}ms`,
    );

    return res;
  },
});

/* ============================================================
   System Prompt
============================================================ */

const SYSTEM = `
  You generate a structured architectural debate between two engineer archetypes.

  Return ONLY valid JSON that matches the provided schema exactly.

  STRUCTURE
  - topic: string
  - turns: array of 12 objects
      - speaker: "security_engineer" | "application_engineer"
      - mdx: string (valid markdown)

  CONVERSATION RULES
  - EXACTLY 12 turns.
  - First turn MUST be from "security_engineer".
  - Speakers MUST strictly alternate.
  - Each turn must directly respond to the previous one.
  - Let them disagree naturally.
  - They do not need to fully agree at the end.

  STYLE
  - Casual but thoughtful.
  - Sounds like two experienced engineers talking it through.
  - Avoid sounding like a design document.
  - Keep sentences short and natural.
  - No dramatic speeches.

  VISUAL FORMAT

  Across the 12 turns:

  - Include at least 3 fenced mermaid diagrams.
  - Include at least 3 fenced code blocks.
  - Distribute them naturally (not clustered together).
  - Only use them when they clarify a concrete example.

  Do not include a diagram or code block in every turn.
  Avoid decorative formatting.

  MERMAID RULES
  - Use fenced block with \`\`\`mermaid
  - Must begin with: flowchart LR
  - Max 6 nodes
  - Max 8 edges
  - No click directives
  - No classDef
  - No sequenceDiagram
  - No subgraph

  LENGTH
  - 250–450 characters per turn.
  - Keep ideas sharp and visual.
  - Formatting should improve clarity.

  PERSONAS

  Security Engineer:
  Has been burned before. Thinks about what breaks at 3am.
  Worries about hidden edge cases and long-term mess.
  Cares about guardrails, but doesn’t enjoy being the blocker.
  Talks in plain language and uses simple diagrams when needed.
  Sometimes feels like the boring one in the room.

  Application Engineer:
  Likes building things and getting feedback fast.
  Thinks some risks are fine if they’re visible and reversible.
  Cares about momentum and keeping systems flexible.
  Talks through examples and practical trade-offs.
  Gets frustrated when rules slow obvious progress.

`.trim();

/* ============================================================
   Utilities
============================================================ */

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

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

function memorySnapshot() {
  const mem = process.memoryUsage();
  return {
    rss_mb: Math.round(mem.rss / 1024 / 1024),
    heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
    heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
  };
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms),
    ),
  ]);
}

/* ============================================================
   Dialogue Handler
============================================================ */

async function handleDialogue(req: Request) {
  const requestId = crypto.randomUUID();
  const serverStart = performance.now();

  console.log(`\n==============================`);
  console.log(`[${requestId}] 📥 NEW REQUEST`);
  console.log(`[${requestId}] memory_at_start=`, memorySnapshot());

  const body = PromptRequestSchema.parse(await req.json());

  console.log(`[${requestId}] topic="${body.prompt}"`);
  console.log(`[${requestId}] prompt_chars=${body.prompt.length}`);
  console.log(`[${requestId}] system_chars=${SYSTEM.length}`);

  const approxInputTokens =
    estimateTokens(SYSTEM) + estimateTokens(body.prompt);

  console.log(`[${requestId}] approx_input_tokens=${approxInputTokens}`);

  /* ------------------------------------------------------------
     OpenAI Call
  ------------------------------------------------------------ */

  const openaiStart = performance.now();
  console.log(`[${requestId}] 🚀 calling OpenAI`);

  const openaiPromise = client.responses.parse({
    model: "gpt-5-mini",
    input: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Topic: ${body.prompt}` },
    ],
    text: {
      format: zodTextFormat(DialogueSchema, "dialogue"),
    },
  });

  type OpenAIResponse = Awaited<typeof openaiPromise>;

  let response: OpenAIResponse;

  try {
    response = await withTimeout(openaiPromise, 90_000);
  } catch (err) {
    console.error(`[${requestId}] ❌ OpenAI call failed`);
    console.error(err);
    throw err;
  }

  const openaiDuration = performance.now() - openaiStart;

  console.log(
    `[${requestId}] ✅ OpenAI finished in ${Math.round(openaiDuration)}ms`,
  );

  if (openaiDuration > 8000) {
    console.warn(
      `[${requestId}] ⚠️ slow_openai_call=${Math.round(openaiDuration)}ms`,
    );
  }

  /* ------------------------------------------------------------
     Schema Validation
  ------------------------------------------------------------ */

  const schemaStart = performance.now();
  const parsed = DialogueSchema.parse(response.output_parsed);
  const schemaDuration = performance.now() - schemaStart;

  console.log(
    `[${requestId}] 🧠 schema_validation_ms=${Math.round(schemaDuration)}`,
  );

  /* ------------------------------------------------------------
     Metrics
  ------------------------------------------------------------ */

  const usage = response.usage;

  const perTurnStats = parsed.turns.map((t, i) => ({
    index: i,
    speaker: t.speaker,
    chars: t.mdx.length,
    approx_tokens: estimateTokens(t.mdx),
    hasMermaid: t.mdx.includes("```mermaid"),
    hasCodeBlock: t.mdx.includes("```") && !t.mdx.includes("```mermaid"),
  }));

  const totalDuration = performance.now() - serverStart;

  console.log(
    JSON.stringify(
      {
        requestId,
        event: "openai_generation",
        model: response.model,
        timing: {
          openai_ms: Math.round(openaiDuration),
          schema_ms: Math.round(schemaDuration),
          total_ms: Math.round(totalDuration),
        },
        tokens: {
          input: usage?.input_tokens ?? null,
          output: usage?.output_tokens ?? null,
          total: usage?.total_tokens ?? null,
        },
        output_size_chars: JSON.stringify(parsed).length,
        turns: parsed.turns.length,
        avg_chars_per_turn: Math.round(
          parsed.turns.reduce((a, t) => a + t.mdx.length, 0) /
            parsed.turns.length,
        ),
        visual_counts: {
          mermaid: perTurnStats.filter((t) => t.hasMermaid).length,
          codeBlocks: perTurnStats.filter((t) => t.hasCodeBlock).length,
        },
        per_turn: perTurnStats,
        memory_at_end: memorySnapshot(),
      },
      null,
      2,
    ),
  );

  writeFixture(parsed);

  console.log(`[${requestId}] 🎉 COMPLETE`);
  console.log(`==============================\n`);

  return json(parsed);
}

/* ============================================================
   Bun Server
============================================================ */

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
        console.error("🔥 SERVER ERROR:");
        console.error(e);
        return json(
          { error: e instanceof Error ? e.message : String(e) },
          { status: 400 },
        );
      }
    }

    return new Response("Not Found", { status: 404 });
  },
});
