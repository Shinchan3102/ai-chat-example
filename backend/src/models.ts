import {
  customProvider,
  wrapLanguageModel,
  addToolInputExamplesMiddleware,
  type LanguageModel,
} from "ai";
import { createBedrockAnthropic } from "@ai-sdk/amazon-bedrock/anthropic";

export const bedrockAnthropic = createBedrockAnthropic({
  apiKey: process.env.AWS_BEDROCK_API_KEY,
  region: process.env.AWS_BEDROCK_REGION ?? "us-east-1",
});

const LANGUAGE_MODELS = {
  "anthropic/claude-sonnet-4.6": bedrockAnthropic(
    "us.anthropic.claude-sonnet-4-6"
  ),
  "anthropic/claude-haiku-4.5": bedrockAnthropic(
    "us.anthropic.claude-haiku-4-5-20251001-v1:0"
  ),
} as const;

export const RW_MODELS = customProvider({
  languageModels: LANGUAGE_MODELS,
});

export type LanguageModelParam = Parameters<
  (typeof RW_MODELS)["languageModel"]
>[0];

export type ModelTier = "pro" | "lite";

export const MODEL_TIER_MAP: Record<ModelTier, LanguageModelParam> = {
  pro: "anthropic/claude-sonnet-4.6",
  lite: "anthropic/claude-haiku-4.5",
};

export const MODEL_TIER_EFFORT: Record<ModelTier, "high" | "medium" | "low"> = {
  pro: "high",
  lite: "medium",
};

export const withTracedModel = ({
  model,
}: {
  model: LanguageModelParam;
}): LanguageModel => {
  return wrapLanguageModel({
    model: RW_MODELS.languageModel(model),
    middleware: addToolInputExamplesMiddleware(),
  });
};
