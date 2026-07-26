// Shared helper for the serverless functions in this folder.
// GROQ_API_KEY lives only in Vercel's server-side environment variables —
// it is never sent to or readable by the browser.
const MODEL = "openai/gpt-oss-120b"; // migrated off llama-3.3-70b-versatile, deprecated Aug 2026
const VISION_MODEL = "qwen/qwen3.6-27b"; // Groq's current multimodal option — preview tier, not production-grade

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Wraps a fetch-to-Groq call with retry-with-backoff specifically for 429
// (rate limited) responses — this is what most often bites when several
// people are using the app at the same time and hit Groq's per-minute cap.
async function fetchGroqWithRetry(body, maxRetries = 3) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    throw new Error("Missing GROQ_API_KEY environment variable on the server.");
  }

  let lastErrText = "";
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (res.ok) return res.json();

    lastErrText = await res.text();

    // Only retry on 429 (rate limited) or 503 (temporarily overloaded) — anything
    // else (bad request, auth failure, etc.) won't fix itself by waiting.
    if ((res.status === 429 || res.status === 503) && attempt < maxRetries) {
      const retryAfterHeader = res.headers.get("retry-after");
      const waitMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 500 * 2 ** attempt;
      console.warn(`Groq ${res.status}, retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
      await sleep(waitMs);
      continue;
    }

    throw new Error(`Groq API error ${res.status}: ${lastErrText}`);
  }

  throw new Error(`Groq API error after ${maxRetries} retries: ${lastErrText}`);
}

export async function callGroq(messages, maxTokens, options = {}) {
  const data = await fetchGroqWithRetry({ model: MODEL, max_tokens: maxTokens, messages, ...options });
  return data.choices?.[0]?.message?.content ?? "";
}

// Same as callGroq, but for messages that include an image content block.
// imageDataUrl must be a full "data:image/png;base64,..." string.
export async function callGroqVision(textPrompt, imageDataUrl, maxTokens) {
  const data = await fetchGroqWithRetry({
    model: VISION_MODEL,
    max_tokens: maxTokens,
    // qwen3.6-27b is a reasoning model — without this it prints its raw
    // <think>...</think> chain-of-thought as the visible reply content.
    // We just want a short in-character reaction, not chain-of-thought.
    reasoning_effort: "none",
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageDataUrl } },
          { type: "text", text: textPrompt },
        ],
      },
    ],
  });
  return data.choices?.[0]?.message?.content ?? "";
}