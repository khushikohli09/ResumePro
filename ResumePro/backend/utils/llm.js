// ---------------------------------------------------------------------------
// llm.js - one function (askLLM) that talks to whichever AI provider is set in
// .env (Groq, Grok/xAI, OpenAI or Anthropic) and always returns a parsed JSON object.
// Test your key with:  npm run check-llm
// ---------------------------------------------------------------------------
// Thin wrapper around whichever LLM provider is configured. All providers
// are prompted to return strict JSON so the rest of the app never has to
// care which one produced the response.

// Pull the JSON object out of the model's reply. Models sometimes wrap JSON in
// ```json fences or add chatter, so we strip fences and take everything from the
// first '{' to the last '}'. Throws if there is no JSON at all.
function extractJson(text) {
  if (!text || typeof text !== "string") {
    throw new Error("LLM response was empty or not text");
  }
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("LLM response did not contain JSON: " + text.slice(0, 150));
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

// Anthropic uses its own request format (x-api-key header, 'system' field,
// content blocks in the reply), so it has its own function.
async function callAnthropic(systemPrompt, userPrompt, maxTokens) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Anthropic API key is not configured. Set ANTHROPIC_API_KEY in .env");
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const block = data.content && data.content.find((b) => b.type === "text");
  return block ? block.text : "";
}

// Sends one chat request and returns the reply text. 'url', 'key' and 'model'
// pick the provider; 'providerName' is only used in error messages.
// OpenAI, Grok (xAI), and Groq share the OpenAI-compatible chat-completions wire format.
async function callOpenAICompatible({ url, key, model, providerName = "LLM" }, systemPrompt, userPrompt, maxTokens) {
  if (!key) {
    throw new Error(`${providerName} API key is missing. Please set ${providerName.toUpperCase()}_API_KEY in your backend .env file.`);
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`${providerName} API error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error(`${providerName} API returned an unexpected response structure`);
  }
  return data.choices[0].message.content;
}

// Main entry point used by the controllers.
//   systemPrompt: instructions for the model; userPrompt: the actual content.
// Provider choice: LLM_PROVIDER in .env wins; if unset we guess from the keys.
// Key prefixes tell the providers apart: 'gsk_' = Groq, 'xai-' = xAI Grok, so a
// key put under the 'wrong' name is still routed to the right API.
async function askLLM(systemPrompt, userPrompt, { maxTokens = 2500 } = {}) {
  // Provider detection: check LLM_PROVIDER or detect from configured keys
  const rawProvider = process.env.LLM_PROVIDER;
  let provider = (rawProvider || "").toLowerCase();

  const groqKey = process.env.GROQ_API_KEY;
  const grokKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;

  if (!provider) {
    if (groqKey || (grokKey && grokKey.startsWith("gsk_"))) {
      provider = "groq";
    } else {
      provider = "grok";
    }
  }

  let raw;

  if (provider === "groq") {
    const key = groqKey || grokKey;
    const isXaiKey = key && key.startsWith("xai-");

    if (isXaiKey) {
      // User provided an xAI key under groq configuration
      raw = await callOpenAICompatible(
        {
          url: "https://api.x.ai/v1/chat/completions",
          key,
          model: process.env.GROK_MODEL || "grok-2-latest",
          providerName: "Grok",
        },
        systemPrompt,
        userPrompt,
        maxTokens
      );
    } else {
      const groqModel =
        process.env.GROQ_MODEL ||
        (process.env.GROK_MODEL && !process.env.GROK_MODEL.includes("grok")
          ? process.env.GROK_MODEL
          : "openai/gpt-oss-120b");

      raw = await callOpenAICompatible(
        {
          url: "https://api.groq.com/openai/v1/chat/completions",
          key,
          model: groqModel,
          providerName: "Groq",
        },
        systemPrompt,
        userPrompt,
        maxTokens
      );
    }
  } else if (provider === "grok" || provider === "xai") {
    // Grok by xAI (with automatic fallback/recognition for Groq keys if user supplied Groq key)
    const key = grokKey || groqKey;
    const isGroqKey = key && key.startsWith("gsk_");

    if (isGroqKey) {
      // User provided a free GroqCloud key (gsk_...)
      const groqModel =
        process.env.GROQ_MODEL ||
        (process.env.GROK_MODEL && !process.env.GROK_MODEL.includes("grok")
          ? process.env.GROK_MODEL
          : "openai/gpt-oss-120b");
      raw = await callOpenAICompatible(
        {
          url: "https://api.groq.com/openai/v1/chat/completions",
          key,
          model: groqModel,
          providerName: "Groq",
        },
        systemPrompt,
        userPrompt,
        maxTokens
      );
    } else {
      // Standard xAI Grok
      raw = await callOpenAICompatible(
        {
          url: "https://api.x.ai/v1/chat/completions",
          key,
          model: process.env.GROK_MODEL || process.env.XAI_MODEL || "grok-2-latest",
          providerName: "Grok",
        },
        systemPrompt,
        userPrompt,
        maxTokens
      );
    }
  } else if (provider === "openai") {
    raw = await callOpenAICompatible(
      {
        url: "https://api.openai.com/v1/chat/completions",
        key: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        providerName: "OpenAI",
      },
      systemPrompt,
      userPrompt,
      maxTokens
    );
  } else {
    raw = await callAnthropic(systemPrompt, userPrompt, maxTokens);
  }

  return extractJson(raw);
}

module.exports = { askLLM, extractJson, callOpenAICompatible, callAnthropic };
