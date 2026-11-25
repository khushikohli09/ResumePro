// ---------------------------------------------------------------------------
// checkLlm.js - run `npm run check-llm` to find out whether your AI API key works.
// It reads backend/.env, shows which provider/key it found (the key itself is
// never printed), sends one tiny test request and reports the result.
// ---------------------------------------------------------------------------
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { askLLM } = require("../utils/llm");

// Show only the first 4 characters of a key so you can see its type (gsk_ = Groq, xai- = Grok)
const mask = (k) => (k ? `${k.slice(0, 4)}… (${k.length} chars)` : "not set");

(async () => {
  const provider = process.env.LLM_PROVIDER || "(auto-detect)";
  console.log("Provider setting :", provider);
  console.log("GROQ_API_KEY     :", mask(process.env.GROQ_API_KEY));
  console.log("GROK_API_KEY     :", mask(process.env.GROK_API_KEY || process.env.XAI_API_KEY));
  console.log("Sending a test request...\n");
  try {
    const out = await askLLM("Reply with JSON only.", 'Return exactly {"status":"working"}', { maxTokens: 50 });
    console.log("SUCCESS - the API key works. Model replied:", JSON.stringify(out));
  } catch (err) {
    console.log("FAILED -", err.message.slice(0, 400));
    // Plain-language hints for the most common problems
    if (/401|invalid.*key|incorrect api key/i.test(err.message)) console.log("Hint: the key is wrong, expired or revoked. Create a new one and update .env.");
    else if (/429|rate/i.test(err.message)) console.log("Hint: the key is valid but you hit a rate/quota limit. Wait a bit or check your plan.");
    else if (/404|model/i.test(err.message)) console.log("Hint: the model name in .env (GROQ_MODEL / GROK_MODEL) may not exist for your account.");
    else if (/fetch failed|ENOTFOUND|ECONN|ETIMEDOUT/i.test(err.message)) console.log("Hint: cannot reach the API - check your internet connection or firewall.");
    process.exitCode = 1;
  }
})();
