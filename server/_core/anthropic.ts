/**
 * Anthropic Claude API Service
 * Provides Claude Sonnet 4.5 integration for high-quality long-form content generation
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Message, MessageContent } from './llm.js';
import { resolveMaxOutputTokens } from './modelLimits.js';

// Define types for Anthropic service
export type LLMParams = {
  messages: Message[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
};

export type LLMResponse = {
  id: string;
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
};

const ENV = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  anthropicDefaultModel:
    process.env.ANTHROPIC_SUMMARY_MODEL?.trim() || 'claude-sonnet-4-5-20250929',
};

// Latest Claude model with best performance
const DEFAULT_CLAUDE_MODEL = ENV.anthropicDefaultModel;
const DEFAULT_MAX_OUTPUT_TOKENS =
  resolveMaxOutputTokens(DEFAULT_CLAUDE_MODEL, undefined, 64000) ?? 64000;
const MAX_CONTEXT_TOKENS = 200000; // Claude's 200K context window

/**
 * Initialize Anthropic client
 */
const getAnthropicClient = () => {
  if (!ENV.anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }
  
  return new Anthropic({
    apiKey: ENV.anthropicApiKey,
  });
};

/**
 * Convert OpenAI-style messages to Anthropic format
 */
const convertToAnthropicFormat = (messages: Message[]): {
  system?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
} => {
  const systemMessages: string[] = [];
  const conversationMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      // Extract system message
      const content = Array.isArray(msg.content)
        ? msg.content.map(c => (typeof c === 'string' ? c : c.type === 'text' ? c.text : '')).join('\n')
        : typeof msg.content === 'string' ? msg.content : msg.content.type === 'text' ? msg.content.text : '';
      systemMessages.push(content);
    } else if (msg.role === 'user' || msg.role === 'assistant') {
      // Convert content to string
      const content = Array.isArray(msg.content)
        ? msg.content.map(c => (typeof c === 'string' ? c : c.type === 'text' ? c.text : '')).join('\n')
        : typeof msg.content === 'string' ? msg.content : msg.content.type === 'text' ? msg.content.text : '';
      
      conversationMessages.push({
        role: msg.role,
        content,
      });
    }
  }

  return {
    system: systemMessages.length > 0 ? systemMessages.join('\n\n') : undefined,
    messages: conversationMessages,
  };
};

/**
 * Convert Anthropic response to OpenAI format
 */
const convertFromAnthropicFormat = (response: Anthropic.Message): LLMResponse => {
  const content = response.content
    .filter(block => block.type === 'text')
    .map(block => (block as Anthropic.TextBlock).text)
    .join('\n');

  return {
    id: response.id,
    content,
    model: response.model,
    usage: {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    },
    finishReason: response.stop_reason === 'end_turn' ? 'stop' : response.stop_reason || 'stop',
  };
};

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on final attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Check if error is retryable
      const isRetryable = 
        lastError.message.includes('rate_limit') ||
        lastError.message.includes('overloaded') ||
        lastError.message.includes('timeout') ||
        lastError.message.includes('503') ||
        lastError.message.includes('429');
      
      if (!isRetryable) {
        break;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(`[Anthropic] Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms`);
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Invoke Claude API with retry logic
 */
export const invokeAnthropic = async (params: LLMParams): Promise<LLMResponse> => {
  const client = getAnthropicClient();
  const { system, messages } = convertToAnthropicFormat(params.messages);

  const model = params.model || DEFAULT_CLAUDE_MODEL;
  const maxTokens =
    resolveMaxOutputTokens(model, params.maxTokens, DEFAULT_MAX_OUTPUT_TOKENS) ??
    DEFAULT_MAX_OUTPUT_TOKENS;

  console.log(
    `[Anthropic] Invoking ${model} with ${messages.length} messages (max ${maxTokens} tokens)`
  );

  const response = await withRetry(async () => {
    return await client.messages.create({
      model,
      max_tokens: maxTokens,
      messages,
      system,
      temperature: params.temperature ?? 0.7,
      top_p: params.topP,
    });
  });

  console.log(`[Anthropic] Response received: ${response.usage.output_tokens} tokens`);

  return convertFromAnthropicFormat(response);
};

/**
 * Check if a model is a Claude model
 */
export const isClaudeModel = (model?: string): boolean => {
  return model?.startsWith('claude-') ?? false;
};

/**
 * Get the best Claude model for a specific task
 */
export const getClaudeModelForTask = (task: 'summary' | 'analysis' | 'research'): string => {
  // Always use Claude Sonnet 4.5 (latest and best)
  return DEFAULT_CLAUDE_MODEL;
};

/**
 * Get maximum output tokens for Claude
 */
export const getClaudeMaxTokens = (): number => {
  return DEFAULT_MAX_OUTPUT_TOKENS;
};

/**
 * Get maximum context tokens for Claude
 */
export const getClaudeContextLimit = (): number => {
  return MAX_CONTEXT_TOKENS;
};

export default {
  invokeAnthropic,
  isClaudeModel,
  getClaudeModelForTask,
  getClaudeMaxTokens,
  getClaudeContextLimit,
};

