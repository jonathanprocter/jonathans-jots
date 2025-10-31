/**
 * LLM Router - Intelligent routing between Claude and GPT models
 * Uses the best model for each task to exceed Shortform quality standards
 */

import { invokeLLM as invokeOpenAI, type InvokeParams, type InvokeResult } from './llm.js';
import { invokeAnthropic, type LLMParams, type LLMResponse } from './anthropic.js';
import type { Message } from './llm.js';

// Model configuration
const MODELS = {
  // Claude 3.5 Sonnet - Best for long-form comprehensive summaries
  CLAUDE_SONNET: 'claude-3-5-sonnet-20241022',
  // GPT-4 Turbo - Fast and accurate for document processing
  GPT4_TURBO: 'gpt-4-turbo-2024-04-09',
  // GPT-4o - Latest OpenAI model with vision
  GPT4O: 'gpt-4o-2024-11-20',
};

// Max tokens configuration - MAXIMIZED for comprehensive 20-page summaries
const MAX_TOKENS = {
  CLAUDE: 8192,   // Claude 3.5 Sonnet's maximum output (produces ~6,000-6,500 words = 12-13 pages)
  GPT4: 16384,    // GPT-4o's maximum output (produces ~12,000-13,000 words = 24-26 pages)
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
 * Updated to use GPT-4o for summaries to achieve 20-page target length
 */
export const getModelForTask = (task: TaskType): string => {
  switch (task) {
    case 'summary_generation':
      return MODELS.GPT4O; // GPT-4o for maximum length (16,384 tokens = ~20 pages)

    case 'research_synthesis':
    case 'comparative_analysis':
      return MODELS.CLAUDE_SONNET; // Claude for deep analysis and research

    case 'document_processing':
    case 'quick_analysis':
      return MODELS.GPT4O; // Fast and accurate for processing

    case 'default':
    default:
      return MODELS.CLAUDE_SONNET; // Default to Claude for quality
  }
};

/**
 * Get maximum output tokens for a model
 */
export const getMaxTokensForModel = (model: string): number => {
  if (model.startsWith('claude-')) {
    return MAX_TOKENS.CLAUDE;
  } else {
    return MAX_TOKENS.GPT4;
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
const convertToAnthropicParams = (params: InvokeParams): LLMParams => {
  return {
    messages: params.messages,
    maxTokens: params.maxTokens || params.max_tokens || MAX_TOKENS.CLAUDE,
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
  const maxTokens = getMaxTokensForModel(model);

  console.log(`[LLM Router] Task: ${task}, Selected model: ${model}, Max tokens: ${maxTokens}`);

  if (isClaudeModel(model)) {
    // Use Claude via Anthropic API
    const anthropicParams: LLMParams = {
      ...convertToAnthropicParams(params),
      model,
      maxTokens,
    };
    
    const response = await invokeAnthropic(anthropicParams);
    return convertToInvokeResult(response);
  } else {
    // Use GPT via OpenAI-compatible API
    const openaiParams: InvokeParams = {
      ...params,
      maxTokens: maxTokens,
    };
    
    // Override model in environment temporarily
    const originalModel = process.env.OPENAI_MODEL;
    process.env.OPENAI_MODEL = model;
    
    try {
      return await invokeOpenAI(openaiParams);
    } finally {
      // Restore original model
      if (originalModel) {
        process.env.OPENAI_MODEL = originalModel;
      } else {
        delete process.env.OPENAI_MODEL;
      }
    }
  }
};

/**
 * Invoke LLM with explicit model selection
 */
export const invokeLLMWithModel = async (
  params: InvokeParams,
  model: string
): Promise<InvokeResult> => {
  const maxTokens = getMaxTokensForModel(model);

  console.log(`[LLM Router] Explicit model: ${model}, Max tokens: ${maxTokens}`);

  if (isClaudeModel(model)) {
    const anthropicParams: LLMParams = {
      ...convertToAnthropicParams(params),
      model,
      maxTokens,
    };
    
    const response = await invokeAnthropic(anthropicParams);
    return convertToInvokeResult(response);
  } else {
    const openaiParams: InvokeParams = {
      ...params,
      maxTokens: maxTokens,
    };
    
    const originalModel = process.env.OPENAI_MODEL;
    process.env.OPENAI_MODEL = model;
    
    try {
      return await invokeOpenAI(openaiParams);
    } finally {
      if (originalModel) {
        process.env.OPENAI_MODEL = originalModel;
      } else {
        delete process.env.OPENAI_MODEL;
      }
    }
  }
};

export default {
  invokeLLMWithRouting,
  invokeLLMWithModel,
  getModelForTask,
  getMaxTokensForModel,
  MODELS,
};

