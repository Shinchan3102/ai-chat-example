import {
  smoothStream,
  stepCountIs,
  streamText,
  type LanguageModel,
  type UIMessage,
} from "ai";
import type { AnthropicProviderOptions } from "@ai-sdk/anthropic";
import {
  type LanguageModelParam,
  type ModelTier,
  MODEL_TIER_EFFORT,
} from "./models";
import { Anthropic } from "./plugins/anthropic";
import { tools } from "./tools";

const ADAPTIVE_THINKING_MODELS = new Set([
  "anthropic/claude-sonnet-4.6",
]);

const buildProviderOptions = (
  modelId: LanguageModelParam,
  modelTier: ModelTier
) => {
  const supportsAdaptive = ADAPTIVE_THINKING_MODELS.has(modelId);
  const thinkingBudget = supportsAdaptive ? undefined : 8000;
  const effort = MODEL_TIER_EFFORT[modelTier];

  const anthropic: AnthropicProviderOptions = supportsAdaptive
    ? { toolStreaming: true, thinking: { type: "adaptive" }, effort }
    : {
        toolStreaming: true,
        thinking: { type: "enabled", budgetTokens: thinkingBudget },
      };

  const bedrock = supportsAdaptive
    ? { type: "adaptive" as const, maxReasoningEffort: effort }
    : { type: "enabled" as const, budgetTokens: thinkingBudget };

  return { anthropic, bedrock };
};

interface AgentOptions {
  model: LanguageModel;
  modelId: LanguageModelParam;
  modelTier: ModelTier;
  messages: UIMessage[];
  abortSignal: AbortSignal;
}

export const agent = async ({
  model,
  modelId,
  modelTier,
  messages,
  abortSignal,
}: AgentOptions) => {
  const { anthropic, bedrock } = buildProviderOptions(modelId, modelTier);

  const initialMessages = await (await import("ai")).convertToModelMessages(
    messages
  );

  const result = streamText({
    model,
    system: {
      role: "system" as const,
      content:
        "You are a helpful assistant with access to a wide range of tools. Use them proactively when relevant: weather lookups, math calculations, web searches, code execution, text analysis, unit conversions, JSON transforms, date/time operations, hashing, UUID generation, regex testing, HTTP requests, data aggregation, cron parsing, text diffs, encoding/decoding, and token generation. Be concise and friendly.",
      providerOptions: {
        anthropic: {
          cacheControl: { ttl: "1h" as const, type: "ephemeral" as const },
          ...anthropic,
        } satisfies AnthropicProviderOptions,
        bedrock: {
          cachePoint: { type: "default", ttl: "1h" },
          reasoningConfig: bedrock,
        },
      },
    },
    tools: Anthropic.addCacheBreakToTools(tools),
    messages: Anthropic.addCacheBreakToMessages({
      messages: initialMessages,
      model,
    }),
    abortSignal,
    experimental_transform: smoothStream({ delayInMs: 20, chunking: "line" }),
    stopWhen: [stepCountIs(10)],
  });

  return result.toUIMessageStream({
    messageMetadata: () => undefined,
  });
};
