const assert = require("assert");
const { askLLM, extractJson, callOpenAICompatible } = require("../utils/llm");

const originalFetch = global.fetch;
let passed = 0;
const check = (name, fn) => {
  try {
    fn();
    passed++;
    console.log("  ✓", name);
  } catch (e) {
    console.log("  ✗", name, "\n     ", e.message);
    process.exitCode = 1;
  }
};

(async () => {
  console.log("\nTesting LLM module with Grok provider:");

  // Test 1: extractJson extracts JSON from markdown fences and raw text
  check("extractJson cleans markdown code blocks", () => {
    const raw = "```json\n{\"test\": 123}\n```";
    assert.deepStrictEqual(extractJson(raw), { test: 123 });
  });

  check("extractJson handles preamble and trailing commentary", () => {
    const raw = "Here is your JSON:\n{\"message\": \"ok\"}\nHope this helps!";
    assert.deepStrictEqual(extractJson(raw), { message: "ok" });
  });

  // Test 2: Grok provider routing to xAI endpoint
  let capturedUrl = null;
  let capturedHeaders = null;
  let capturedBody = null;

  global.fetch = async (url, init) => {
    capturedUrl = url;
    capturedHeaders = init.headers;
    capturedBody = JSON.parse(init.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: '{"result": "success", "provider": "grok"}',
            },
          },
        ],
      }),
      text: async () => '{"result": "success"}',
    };
  };

  process.env.LLM_PROVIDER = "grok";
  process.env.GROK_API_KEY = "xai-test-key-12345";
  process.env.GROK_MODEL = "grok-2-latest";

  const res = await askLLM("You are a helper", "Hello Grok");

  check("Grok calls xAI API endpoint", () => {
    assert.strictEqual(capturedUrl, "https://api.x.ai/v1/chat/completions");
  });

  check("Grok passes Authorization header with Bearer token", () => {
    assert.strictEqual(capturedHeaders.Authorization, "Bearer xai-test-key-12345");
  });

  check("Grok sends grok-2-latest model and prompts", () => {
    assert.strictEqual(capturedBody.model, "grok-2-latest");
    assert.strictEqual(capturedBody.messages[0].content, "You are a helper");
    assert.strictEqual(capturedBody.messages[1].content, "Hello Grok");
  });

  check("Grok parses JSON response correctly", () => {
    assert.strictEqual(res.result, "success");
    assert.strictEqual(res.provider, "grok");
  });

  // Test 3: Auto-detection if user provides a Groq key (starts with "gsk_")
  process.env.LLM_PROVIDER = "grok";
  process.env.GROK_API_KEY = "gsk_groq_key_999";
  delete process.env.GROK_MODEL;

  const resGroqAuto = await askLLM("System prompt", "User prompt");
  check("Auto-detects GroqCloud key (gsk_...) and routes to api.groq.com", () => {
    assert.strictEqual(capturedUrl, "https://api.groq.com/openai/v1/chat/completions");
    assert.strictEqual(capturedHeaders.Authorization, "Bearer gsk_groq_key_999");
    assert.strictEqual(capturedBody.model, "openai/gpt-oss-120b");
  });

  // Test 3b: Explicit Groq provider with GROQ_API_KEY
  process.env.LLM_PROVIDER = "groq";
  delete process.env.GROK_API_KEY;
  process.env.GROQ_API_KEY = "gsk_groq_explicit_123";
  process.env.GROQ_MODEL = "openai/gpt-oss-120b";

  await askLLM("System prompt", "User prompt");
  check("Explicit Groq provider routes to api.groq.com with GROQ_API_KEY", () => {
    assert.strictEqual(capturedUrl, "https://api.groq.com/openai/v1/chat/completions");
    assert.strictEqual(capturedHeaders.Authorization, "Bearer gsk_groq_explicit_123");
    assert.strictEqual(capturedBody.model, "openai/gpt-oss-120b");
  });

  // Test 4: Missing key error message
  delete process.env.GROK_API_KEY;
  delete process.env.XAI_API_KEY;
  delete process.env.GROQ_API_KEY;
  process.env.LLM_PROVIDER = "grok";

  let threw = false;
  try {
    await askLLM("Sys", "User");
  } catch (err) {
    threw = true;
    check("Missing API key throws descriptive error", () => {
      assert.ok(err.message.includes("Grok API key is missing"));
    });
  }
  check("Missing key throws error", () => assert.strictEqual(threw, true));

  global.fetch = originalFetch;
  console.log(`\n${passed} checks passed${process.exitCode ? " (with failures)" : ""}`);
  process.exit(process.exitCode ? 1 : 0);
})();
