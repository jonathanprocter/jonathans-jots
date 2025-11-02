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
const MODELS = {
  // Claude 3.5 Sonnet - Best for long-form comprehensive summaries
  CLAUDE_SONNET:
    process.env.ANTHROPIC_SUMMARY_MODEL?.trim() || 'claude-3-5-sonnet-20241022',
  // GPT-4.1 - Latest OpenAI reasoning model for high fidelity tasks
  GPT4_LATEST:
    process.env.OPENAI_ROUTER_MODEL?.trim() || 'gpt-4.1',
  // GPT-4o mini - Efficient, high-context model for faster iterations
  GPT4O_MINI:
    process.env.OPENAI_ROUTER_FAST_MODEL?.trim() || 'gpt-4o-mini',
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

/**
 * Get the best model for a specific task
 */
export const getModelForTask = (task: TaskType): string => {
  switch (task) {
    case 'summary_generation':
    case 'research_synthesis':
    case 'comparative_analysis':
      return MODELS.CLAUDE_SONNET; // Best for comprehensive, long-form content

    case 'document_processing':
      return MODELS.GPT4_LATEST; // Most capable OpenAI reasoning model
    case 'quick_analysis':
      return MODELS.GPT4O_MINI; // Fast and accurate for processing

    case 'default':
    default:
      return MODELS.CLAUDE_SONNET; // Default to Claude for quality
  }
};

/**
 * Check if a model is a Claude model
 */
const isClaudeModel = (model: string): boolean => {
  return model.startsWith('claude-');
};

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
  const model = getModelForTask(task);
  const fallbackMax = model.startsWith('claude-') ? 8192 : 4096;
  const maxTokens =
    resolveMaxOutputTokens(
      model,
      params.maxTokens || params.max_tokens,
      fallbackMax
    ) ?? fallbackMax;

  console.log(`[LLM Router] Task: ${task}, Selected model: ${model}, Max tokens: ${maxTokens}`);

  if (isClaudeModel(model)) {
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
  const fallbackMax = model.startsWith('claude-') ? 8192 : 4096;
  const maxTokens =
    resolveMaxOutputTokens(
      model,
      params.maxTokens || params.max_tokens,
      fallbackMax
    ) ?? fallbackMax;

  console.log(`[LLM Router] Explicit model: ${model}, Max tokens: ${maxTokens}`);

  if (isClaudeModel(model)) {
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
};

