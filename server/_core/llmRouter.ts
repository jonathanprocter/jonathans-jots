/**
 * LLM Router - Intelligent routing between Claude and GPT models
 * Uses the best model for each task to exceed Shortform quality standards
 */

import {
  invokeLLM as invokeOpenAI,
  type InvokeParams,
  type InvokeResult,
} from './llm.js';
import { invokeAnthropic, type LLMParams, type LLMResponse } from './anthropic.js';
import { resolveMaxOutputTokens } from './modelLimits.js';

// Model configuration
// Default models track the latest generally available releases that support
// the token budgets required for Jonathan's Jots calibre summaries.
const DEFAULT_ANTHROPIC_MODEL = 'claude-3-5-sonnet-20241022';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-2024-08-06';
const DEFAULT_OPENAI_FAST_MODEL = 'gpt-4o-mini-2024-07-18';

const MODELS = {
  CLAUDE_SONNET:
    process.env.ANTHROPIC_SUMMARY_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL,
  GPT4_LATEST:
    process.env.OPENAI_ROUTER_MODEL?.trim() || DEFAULT_OPENAI_MODEL,
  GPT4O_MINI:
    process.env.OPENAI_ROUTER_FAST_MODEL?.trim() || DEFAULT_OPENAI_FAST_MODEL,
};

/**
 * Task types for intelligent model selection
 */
export type TaskType =
  | 'summary_generation'      // Main summary generation - use Claude
  | 'document_processing'     // Extract text from documents - use GPT-4
  | 'research_synthesis'      // Synthesize research sources - use Claude
  | 'comparative_analysis'    // Compare books/concepts - use Claude
  | 'quick_analysis'          // Quick text analysis - use GPT-4
  | 'default';                // Default to Claude for quality

type Provider = 'anthropic' | 'openai';

const isClaudeModel = (model: string): boolean => {
  return model.startsWith('claude-');
};

const resolveProvider = (model: string): Provider =>
  isClaudeModel(model) ? 'anthropic' : 'openai';

const hasAnthropicApiKey = (): boolean => Boolean(process.env.ANTHROPIC_API_KEY?.trim());
const hasOpenAIApiKey = (): boolean => Boolean(process.env.OPENAI_API_KEY?.trim());

const findAvailableModel = (models: string[]): { model: string; provider: Provider } | null => {
  for (const candidate of models) {
    const provider = resolveProvider(candidate);
    if (provider === 'anthropic' && hasAnthropicApiKey()) {
      return { model: candidate, provider };
    }
    if (provider === 'openai' && hasOpenAIApiKey()) {
      return { model: candidate, provider };
    }
  }

  return null;
};

const TASK_MODEL_PREFERENCES: Record<TaskType, string[]> = {
  summary_generation: [MODELS.CLAUDE_SONNET, MODELS.GPT4_LATEST, MODELS.GPT4O_MINI],
  research_synthesis: [MODELS.CLAUDE_SONNET, MODELS.GPT4_LATEST, MODELS.GPT4O_MINI],
  comparative_analysis: [MODELS.CLAUDE_SONNET, MODELS.GPT4_LATEST],
  document_processing: [MODELS.GPT4_LATEST, MODELS.GPT4O_MINI, MODELS.CLAUDE_SONNET],
  quick_analysis: [MODELS.GPT4O_MINI, MODELS.GPT4_LATEST, MODELS.CLAUDE_SONNET],
  default: [MODELS.CLAUDE_SONNET, MODELS.GPT4_LATEST, MODELS.GPT4O_MINI],
};

const DEFAULT_MODEL_SEQUENCE = TASK_MODEL_PREFERENCES.default;

const selectModelForTask = (task: TaskType): { model: string; provider: Provider } => {
  const preferences = TASK_MODEL_PREFERENCES[task] ?? DEFAULT_MODEL_SEQUENCE;
  const selection = findAvailableModel(preferences);

  if (selection) {
    return selection;
  }

  const fallback = findAvailableModel(DEFAULT_MODEL_SEQUENCE);
  if (fallback) {
    console.warn(
      `[LLM Router] Preferred models unavailable for task "${task}". Falling back to ${fallback.model}.`,
    );
    return fallback;
  }

  throw new Error(
    '[LLM Router] No LLM providers are configured. Please set ANTHROPIC_API_KEY and/or OPENAI_API_KEY.',
  );
};

export const hasLLMProvidersConfigured = (): boolean =>
  hasAnthropicApiKey() || hasOpenAIApiKey();

/**
 * Get the best model for a specific task
 */
export const getModelForTask = (task: TaskType): string => selectModelForTask(task).model;

/**
 * Convert InvokeParams to LLMParams for Anthropic
 */
const convertToAnthropicParams = (
  params: InvokeParams,
  model: string
): LLMParams => {
  const requestedMax = params.maxTokens || params.max_tokens;
  const maxTokens =
    resolveMaxOutputTokens(model, requestedMax, 8192) ?? 8192;

  return {
    messages: params.messages,
    maxTokens,
    temperature: 0.7, // Good balance for creative yet accurate summaries
    topP: 0.9,
  };
};

/**
 * Convert LLMResponse to InvokeResult for consistency
 */
const convertToInvokeResult = (response: LLMResponse): InvokeResult => {
  return {
    id: response.id,
    created: Date.now(),
    model: response.model,
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: response.content,
      },
      finish_reason: response.finishReason,
    }],
    usage: {
      prompt_tokens: response.usage.promptTokens,
      completion_tokens: response.usage.completionTokens,
      total_tokens: response.usage.totalTokens,
    },
  };
};

/**
 * Invoke LLM with intelligent model routing
 * Automatically selects the best model based on the task type
 */
export const invokeLLMWithRouting = async (
  params: InvokeParams,
  task: TaskType = 'default'
): Promise<InvokeResult> => {
  const { model, provider } = selectModelForTask(task);
  const fallbackMax = model.startsWith('claude-') ? 8192 : 4096;
  const maxTokens =
    resolveMaxOutputTokens(
      model,
      params.maxTokens || params.max_tokens,
      fallbackMax
    ) ?? fallbackMax;

  console.log(`[LLM Router] Task: ${task}, Selected model: ${model}, Max tokens: ${maxTokens}`);

  if (provider === 'anthropic') {
    // Use Claude via Anthropic API
    const anthropicParams: LLMParams = {
      ...convertToAnthropicParams(params, model),
      model,
      maxTokens,
    };

    const response = await invokeAnthropic(anthropicParams);
    return convertToInvokeResult(response);
  } else {
    // Use GPT via OpenAI-compatible API
    const openaiParams: InvokeParams = {
      ...params,
      model,
      maxTokens: maxTokens,
    };

    return await invokeOpenAI(openaiParams);
  }
};

/**
 * Invoke LLM with explicit model selection
 */
export const invokeLLMWithModel = async (
  params: InvokeParams,
  model: string
): Promise<InvokeResult> => {
  const provider = resolveProvider(model);

  if (provider === 'anthropic' && !hasAnthropicApiKey()) {
    throw new Error(
      `[LLM Router] Model ${model} requires ANTHROPIC_API_KEY, but it is not configured.`,
    );
  }

  if (provider === 'openai' && !hasOpenAIApiKey()) {
    throw new Error(
      `[LLM Router] Model ${model} requires OPENAI_API_KEY, but it is not configured.`,
    );
  }

  const fallbackMax = model.startsWith('claude-') ? 8192 : 4096;
  const maxTokens =
    resolveMaxOutputTokens(
      model,
      params.maxTokens || params.max_tokens,
      fallbackMax
    ) ?? fallbackMax;

  console.log(`[LLM Router] Explicit model: ${model}, Max tokens: ${maxTokens}`);

  if (provider === 'anthropic') {
    const anthropicParams: LLMParams = {
      ...convertToAnthropicParams(params, model),
      model,
      maxTokens,
    };

    const response = await invokeAnthropic(anthropicParams);
    return convertToInvokeResult(response);
  } else {
    const openaiParams: InvokeParams = {
      ...params,
      model,
      maxTokens: maxTokens,
    };

    return await invokeOpenAI(openaiParams);
  }
};

export default {
  invokeLLMWithRouting,
  invokeLLMWithModel,
  getModelForTask,
  MODELS,
  hasLLMProvidersConfigured,
};

