import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

type ModuleExports = typeof import("../llmRouter");

const ORIGINAL_ENV = { ...process.env };

const loadRouter = async (): Promise<ModuleExports> => {
  return await import("../llmRouter");
};

const resetEnv = () => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.ANTHROPIC_SUMMARY_MODEL;
  delete process.env.OPENAI_ROUTER_MODEL;
  delete process.env.OPENAI_ROUTER_FAST_MODEL;
};

describe("llmRouter model selection", () => {
  beforeEach(() => {
    vi.resetModules();
    resetEnv();
  });

  afterEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  it("prefers Claude for summary tasks when both providers are available", async () => {
    process.env.ANTHROPIC_API_KEY = "test";
    process.env.OPENAI_API_KEY = "test";

    const { getModelForTask } = await loadRouter();
    expect(getModelForTask("summary_generation")).toBe("claude-3-5-sonnet-20241022");
  });

  it("falls back to OpenAI when Anthropic is unavailable", async () => {
    process.env.OPENAI_API_KEY = "test";

    const { getModelForTask } = await loadRouter();
    expect(getModelForTask("summary_generation")).toBe("gpt-4o-2024-08-06");
  });

  it("falls back to Claude when OpenAI is unavailable for document processing", async () => {
    process.env.ANTHROPIC_API_KEY = "test";

    const { getModelForTask } = await loadRouter();
    expect(getModelForTask("document_processing")).toMatch(/^claude-/);
  });

  it("throws a descriptive error when no providers are configured", async () => {
    const { getModelForTask } = await loadRouter();
    expect(() => getModelForTask("summary_generation")).toThrow(
      /No LLM providers are configured/
    );
  });
});
