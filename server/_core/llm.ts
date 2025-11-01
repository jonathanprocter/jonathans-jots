import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

const resolveApiUrl = () => {
  // Use explicitly configured URL if available
  if (ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0) {
    const url = ENV.forgeApiUrl.replace(/\/$/, "");
    // If it's an Anthropic URL, don't add /v1/chat/completions
    if (url.includes('anthropic.com')) {
      return `${url}/v1/messages`;
    }
    return `${url}/v1/chat/completions`;
  }

  // Auto-detect based on which API key is set
  if (process.env.ANTHROPIC_API_KEY) {
    return "https://api.anthropic.com/v1/messages";
  }

  if (process.env.OPENAI_API_KEY) {
    return "https://api.openai.com/v1/chat/completions";
  }

  // Last resort fallback
  throw new Error("No API endpoint configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY");
};

const assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    console.error('[LLM] API key not found. Checked environment variables:');
    console.error('  - BUILT_IN_FORGE_API_KEY:', process.env.BUILT_IN_FORGE_API_KEY ? '✓ SET' : '✗ NOT SET');
    console.error('  - OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✓ SET' : '✗ NOT SET');
    console.error('  - ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? '✓ SET' : '✗ NOT SET');
    console.error('[LLM] Please set one of these environment variables in Replit Secrets or .env file');
    throw new Error("API key is not configured. Please set OPENAI_API_KEY, ANTHROPIC_API_KEY, or BUILT_IN_FORGE_API_KEY in your environment variables.");
  }

  const endpoint = resolveApiUrl();
  const provider = endpoint.includes('anthropic.com') ? 'Anthropic Claude' :
                   endpoint.includes('openai.com') ? 'OpenAI' : 'Custom';
  console.log(`[LLM] ✓ API key found, using ${provider} endpoint: ${endpoint}`);
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
      
      // Check if error is retryable (e.g., network errors, rate limits)
      const isRetryable = lastError.message.includes('rate limit') || 
                         lastError.message.includes('timeout') ||
                         lastError.message.includes('503') ||
                         lastError.message.includes('502');
      
      if (!isRetryable) {
        throw lastError;
      }
      
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`LLM request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  
  throw lastError;
}

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  assertApiKey();

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  return withRetry(async () => {
    // Auto-detect model based on which API is being used
    let defaultModel = "gpt-4-turbo-preview";
    if (process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
      defaultModel = "claude-3-5-sonnet-20241022";
    }

    const payload: Record<string, unknown> = {
      model: process.env.OPENAI_MODEL || defaultModel,
      messages: messages.map(normalizeMessage),
    };

    if (tools && tools.length > 0) {
      payload.tools = tools;
    }

    const normalizedToolChoice = normalizeToolChoice(
      toolChoice || tool_choice,
      tools
    );
    if (normalizedToolChoice) {
      payload.tool_choice = normalizedToolChoice;
    }

    payload.max_tokens = params.maxTokens || params.max_tokens || 32768;
    
    // Only add thinking budget if model supports it
    const model = String(payload.model);
    if (model.includes('gemini') || model.includes('thinking')) {
      payload.thinking = {
        "budget_tokens": parseInt(process.env.LLM_THINKING_BUDGET || "128", 10)
      };
    }

    const normalizedResponseFormat = normalizeResponseFormat({
      responseFormat,
      response_format,
      outputSchema,
      output_schema,
    });

    if (normalizedResponseFormat) {
      payload.response_format = normalizedResponseFormat;
    }

    const controller = new AbortController();
    const timeout = parseInt(process.env.LLM_TIMEOUT || "60000", 10);
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const apiUrl = resolveApiUrl();
    const isAnthropicApi = apiUrl.includes('anthropic.com');

    // Build headers based on API provider
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };

    if (isAnthropicApi) {
      headers["x-api-key"] = ENV.forgeApiKey;
      headers["anthropic-version"] = "2023-06-01";
    } else {
      headers["authorization"] = `Bearer ${ENV.forgeApiKey}`;
    }

    // Convert payload for Anthropic if needed
    let requestPayload = payload;
    if (isAnthropicApi) {
      requestPayload = {
        model: payload.model,
        max_tokens: payload.max_tokens,
        messages: payload.messages,
      };
    }

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[LLM] API request failed:', response.status, response.statusText);
        console.error('[LLM] Error response:', errorText);
        throw new Error(
          `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
        );
      }

      const result = await response.json();

      // Convert Anthropic response to OpenAI format if needed
      if (isAnthropicApi) {
        return {
          id: result.id,
          created: Date.now(),
          model: result.model,
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: result.content[0]?.text || '',
            },
            finish_reason: result.stop_reason,
          }],
          usage: {
            prompt_tokens: result.usage?.input_tokens || 0,
            completion_tokens: result.usage?.output_tokens || 0,
            total_tokens: (result.usage?.input_tokens || 0) + (result.usage?.output_tokens || 0),
          },
        } as InvokeResult;
      }

      return result as InvokeResult;
    } finally {
      clearTimeout(timeoutId);
    }
  }, parseInt(process.env.LLM_MAX_RETRIES || "3", 10));
}
