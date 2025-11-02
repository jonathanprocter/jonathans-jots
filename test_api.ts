import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

async function testAPIs() {
  console.log("=== Testing API Configurations ===\n");

  // Test OpenAI GPT-4o
  try {
    console.log("Testing OpenAI GPT-4o...");
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const openaiResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Say 'OpenAI GPT-4o is working!' in exactly those words." }],
      max_tokens: 50,
    });

    console.log("✓ OpenAI Response:", openaiResponse.choices[0].message.content);
    console.log("✓ Model used:", openaiResponse.model);
    console.log("✓ Tokens used:", openaiResponse.usage?.total_tokens);
  } catch (error: any) {
    console.error("✗ OpenAI Error:", error.message);
  }

  console.log("\n---\n");

  // Test Anthropic Claude Sonnet 4.5
  try {
    console.log("Testing Anthropic Claude Sonnet 4.5...");
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const anthropicResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 100,
      messages: [{ role: "user", content: "Say 'Claude Sonnet 4.5 is working!' in exactly those words." }],
    });

    const content = anthropicResponse.content[0];
    if (content.type === "text") {
      console.log("✓ Anthropic Response:", content.text);
    }
    console.log("✓ Model used:", anthropicResponse.model);
    console.log("✓ Tokens used:", anthropicResponse.usage.input_tokens + anthropicResponse.usage.output_tokens);
  } catch (error: any) {
    console.error("✗ Anthropic Error:", error.message);
  }

  console.log("\n=== Test Complete ===");
}

testAPIs();
