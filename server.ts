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

OUTPUT RULES (strict):
- Output MUST match the provided JSON schema exactly. Do not add extra keys.
- conversation must alternate speakers. Start with security_engineer.
- Each speaker must appear 3–5 turns total (6–10 turns overall).
- Each turn must have 1–3 blocks.
- Blocks must be one of:
  - paragraph: concise, specific, no fluff
  - bullet_list: concrete steps, risks, constraints
  - code: short config/snippet if helpful (language must be set)

CONTENT RULES:
- Enforce real disagreement and trade-offs (security vs developer friction).
- Avoid generic statements. Always cite concrete mechanisms (e.g., mTLS/SPIFFE, OPA, gateways, rollout modes, failure cases).
- Mermaid diagram MUST reflect the architecture discussed.
- mermaid field MUST contain raw Mermaid syntax only (no backticks, no markdown fences).

BLOCK RULES:
- For type="paragraph": set content to a string, language=null, items=null.
- For type="code": set content to string, language to a string, items=null.
- For type="bullet_list": set items to array of strings, content=null, language=null.
- All keys must be present in every block.
`.trim();

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function writeFixture(dialogue: unknown) {
  const path = "./src/fixtures/dialogue.json";

  try {
    // Ensure directory exists
    mkdirSync(dirname(path), { recursive: true });

    writeFileSync(path, JSON.stringify(dialogue, null, 2), "utf-8");
    console.log(`💾 Fixture written to ${path}`);
  } catch (err) {
    console.error("❌ Failed to write fixture:", err);
  }
}

async function handleDialogue(req: Request) {
  const requestStart = performance.now();
  console.log("\n==============================");
  console.log("📥 Incoming /api/dialogue request");

  const body = PromptRequestSchema.parse(await req.json());
  console.log("📝 Prompt:", body.prompt);

  const openaiStart = performance.now();
  console.log("🚀 Calling OpenAI...");

  let response;
  try {
    response = await client.responses.parse({
      model: "gpt-5-mini",
      input: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Topic: ${body.prompt}` },
      ],
      text: {
        format: zodTextFormat(DialogueSchema, "dialogue"),
      },
    });
  } catch (err) {
    console.error("❌ OpenAI call failed:", err);
    throw err;
  }

  const openaiEnd = performance.now();
  console.log("✅ OpenAI response received");
  console.log(`⏱ OpenAI latency: ${(openaiEnd - openaiStart).toFixed(1)} ms`);

  // Usage logging (if available)
  if (response.usage) {
    console.log("📊 Token usage:", response.usage);
  } else {
    console.log("📊 No usage data returned");
  }

  // Raw output length
  const rawText =
    typeof response.output_text === "string"
      ? response.output_text
      : JSON.stringify(response.output_text);

  console.log(`📦 Raw output size: ${rawText.length} chars`);

  const validationStart = performance.now();

  let parsed;
  try {
    parsed = DialogueSchema.parse(response.output_parsed);
  } catch (err) {
    console.error("❌ Zod validation failed");
    console.error(err);
    console.log("🔍 Raw parsed output:", response.output_parsed);
    throw err;
  }

  const validationEnd = performance.now();

  console.log(
    `🛡 Schema validation time: ${(validationEnd - validationStart).toFixed(
      1,
    )} ms`,
  );

  console.log(
    `🏁 Total request time: ${(validationEnd - requestStart).toFixed(1)} ms`,
  );

  console.log("==============================\n");

  writeFixture(parsed);

  return json(parsed);
}

Bun.serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/api/dialogue") {
      if (req.method !== "POST")
        return new Response("Method Not Allowed", { status: 405 });

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
