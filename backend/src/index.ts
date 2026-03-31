import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { withTracedModel, type ModelTier } from "./models";
import { agent } from "./agent";

const app = new Hono();

app.use("*", cors());

const MODEL_ID = "anthropic/claude-sonnet-4.6" as const;
const MODEL_TIER: ModelTier = "pro";

app.post("/api/chat", async (c) => {
  try {
    const { messages } = (await c.req.json()) as { messages: UIMessage[] };

    console.log("Received messages:", JSON.stringify(messages.length));

    const model = withTracedModel({ model: MODEL_ID });

    const abortController = new AbortController();

    const uiStream = createUIMessageStream({
      generateId: () => crypto.randomUUID(),
      execute: async ({ writer }) => {
        console.log("Starting agent...");
        const stream = await agent({
          model,
          modelId: MODEL_ID,
          modelTier: MODEL_TIER,
          messages,
          abortSignal: abortController.signal,
        });

        console.log("Agent returned stream, merging...");
        writer.merge(stream);
      },
      onFinish: async ({ responseMessage }) => {
        console.log(
          "Stream finished, assistant message id:",
          responseMessage.id
        );
      },
      originalMessages: messages,
    });

    return createUIMessageStreamResponse({ stream: uiStream });
  } catch (error) {
    console.error("Chat endpoint error:", error);
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/health", (c) => c.json({ status: "ok" }));

const port = 3001;
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Backend running at http://localhost:${info.port}`);
});
