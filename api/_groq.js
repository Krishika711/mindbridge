// Shared helper for the serverless functions in this folder.
// GROQ_API_KEY lives only in Vercel's server-side environment variables —
// it is never sent to or readable by the browser.
const MODEL = "openai/gpt-oss-120b"; // migrated off llama-3.3-70b-versatile, deprecated Aug 2026
const VISION_MODEL = "qwen/qwen3.6-27b"; // Groq's current multimodal option — preview tier, not production-grade

export async function callGroq(messages, maxTokens) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    throw new Error("Missing GROQ_API_KEY environment variable on the server.");
  }
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// Same as callGroq, but for messages that include an image content block.
// imageDataUrl must be a full "data:image/png;base64,..." string.
export async function callGroqVision(textPrompt, imageDataUrl, maxTokens) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    throw new Error("Missing GROQ_API_KEY environment variable on the server.");
  }
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      max_tokens: maxTokens,
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageDataUrl } },
            { type: "text", text: textPrompt },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq vision API error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}