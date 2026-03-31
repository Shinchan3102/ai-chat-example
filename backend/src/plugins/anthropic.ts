import type { AnthropicProviderOptions } from "@ai-sdk/anthropic";
import type { ModelMessage, JSONValue, LanguageModel, ToolSet } from "ai";

const isAnthropicModel = (model: LanguageModel): boolean => {
  if (typeof model === "string") {
    return model.includes("anthropic") || model.includes("claude");
  }
  return (
    model.provider === "anthropic" ||
    (model.provider?.includes("anthropic") ?? false) ||
    (model.modelId?.includes("anthropic") ?? false) ||
    (model.modelId?.includes("claude") ?? false)
  );
};

interface AddCacheBreakToMessagesParams {
  messages: ModelMessage[];
  model: LanguageModel;
}

const addCacheBreakToMessages = ({
  messages,
  model,
}: AddCacheBreakToMessagesParams): ModelMessage[] => {
  if (messages.length === 0) return messages;
  if (!isAnthropicModel(model)) return messages;

  return messages.map((message, index) => {
    if (index === messages.length - 1) {
      return {
        ...message,
        providerOptions: {
          ...message.providerOptions,
          anthropic: {
            ...(message.providerOptions?.anthropic as Record<string, JSONValue>),
            cacheControl: { type: "ephemeral", ttl: "5m" },
          },
          bedrock: {
            ...(message.providerOptions?.bedrock as Record<string, JSONValue>),
            cachePoint: { type: "default", ttl: "5m" },
          },
        },
      };
    }
    return message;
  });
};

const addCacheBreakToTools = (tools: ToolSet): ToolSet => {
  const keys = Object.keys(tools);
  const lastKey = keys.at(-1);

  if (!lastKey) return tools;

  return {
    ...tools,
    [lastKey]: {
      ...tools[lastKey],
      providerOptions: {
        ...tools[lastKey].providerOptions,
        anthropic: {
          ...tools[lastKey].providerOptions?.anthropic,
          cacheControl: { type: "ephemeral", ttl: "1h" },
        } satisfies AnthropicProviderOptions,
        bedrock: {
          ...tools[lastKey].providerOptions?.bedrock,
          cachePoint: { type: "default", ttl: "1h" },
        },
      },
    },
  };
};

export const Anthropic = {
  addCacheBreakToMessages,
  addCacheBreakToTools,
};
