/**
 * Centralised model capability metadata used across providers.
 *
 * The limits below are sourced from the public OpenAI and Anthropic
 * documentation (as of October 2024) and intentionally grouped by
 * family so that newly suffixed releases automatically inherit sane
 * defaults. The goal is to ensure we always request the maximum number
 * of completion tokens supported by a model without exceeding the
 * provider-imposed caps.
 *
 * Latest models:
 * - OpenAI: gpt-4o-2024-08-06 (16K output tokens)
 * - Anthropic: claude-3-5-sonnet-20241022 (8K output tokens)
 */

type ModelLimitRule = {
  test: (model: string) => boolean;
  maxOutputTokens: number;
};

const MODEL_LIMIT_RULES: ModelLimitRule[] = [
  // Anthropic Claude 3.x family
  {
    test: model => /^claude-3-5-sonnet/i.test(model),
    maxOutputTokens: 8192,
  },
  {
    test: model => /^claude-3-5-haiku/i.test(model),
    maxOutputTokens: 4096,
  },
  {
    test: model => /^claude-3-7-sonnet/i.test(model),
    maxOutputTokens: 8192,
  },
  {
    test: model => /^claude-3-opus/i.test(model),
    maxOutputTokens: 4096,
  },
  {
    test: model => /^claude-3-sonnet/i.test(model),
    maxOutputTokens: 4096,
  },
  {
    test: model => /^claude-3-haiku/i.test(model),
    maxOutputTokens: 4096,
  },
  // OpenAI GPT-4o + 4.1 families
  {
    test: model => /^gpt-4\.1-mini/i.test(model),
    maxOutputTokens: 12288,
  },
  {
    test: model => /^gpt-4\.1/i.test(model),
    maxOutputTokens: 16384,
  },
  {
    test: model => /^gpt-4o-mini/i.test(model),
    maxOutputTokens: 16384,
  },
  {
    test: model => /^gpt-4o/i.test(model),
    maxOutputTokens: 16384,
  },
  {
    test: model => /^o3-mini/i.test(model),
    maxOutputTokens: 8192,
  },
  {
    test: model => /^gpt-4-turbo/i.test(model),
    maxOutputTokens: 8192,
  },
  {
    test: model => /^gpt-4/i.test(model),
    maxOutputTokens: 8192,
  },
  {
    test: model => /^gpt-3\.5-turbo/i.test(model),
    maxOutputTokens: 4096,
  },
];

/**
 * Return the documented maximum number of output tokens for a model.
 */
export const getMaxOutputTokens = (model: string): number | undefined => {
  if (!model) return undefined;

  const trimmed = model.trim();
  if (!trimmed) return undefined;

  for (const rule of MODEL_LIMIT_RULES) {
    try {
      if (rule.test(trimmed)) {
        return rule.maxOutputTokens;
      }
    } catch (error) {
      console.warn(
        `[modelLimits] Failed to evaluate model rule for ${trimmed}:`,
        error
      );
    }
  }

  return undefined;
};

/**
 * Resolve the appropriate max completion tokens for a request, clamping
 * the caller-provided value so that we never exceed the underlying model
 * capabilities while still allowing lower, caller-specified ceilings.
 */
export const resolveMaxOutputTokens = (
  model: string,
  requested?: number,
  fallback?: number
): number | undefined => {
  const limit = getMaxOutputTokens(model);
  if (typeof requested === "number" && Number.isFinite(requested)) {
    return limit ? Math.min(requested, limit) : requested;
  }

  if (limit) {
    return limit;
  }

  return fallback;
};

