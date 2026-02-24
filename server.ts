import { OpenAI } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { PromptRequestSchema, DialogueSchema } from "./shared/schemas";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" },
    ...init,
  });
}

async function handleDialogue(req: Request) {
  const body = PromptRequestSchema.parse(await req.json());

  const response = await client.responses.parse({
    model: "gpt-5-mini", // swap to gpt-5.2 later if desired
    input: [
      {
        role: "system",
        content:
          "Return JSON that exactly matches the schema. The mermaid field must contain raw mermaid syntax only.",
      },
      {
        role: "user",
        content: `Model a conversation between a security engineer and application engineer about: ${body.prompt}`,
      },
    ],
    text: {
      format: zodTextFormat(DialogueSchema, "dialogue"),
    },
  });

  const parsed = DialogueSchema.parse(response.output_parsed);
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
