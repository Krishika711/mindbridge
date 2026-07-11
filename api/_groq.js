// Shared helper for the serverless functions in this folder.
// GROQ_API_KEY lives only in Vercel's server-side environment variables —
// it is never sent to or readable by the browser.
const MODEL = "llama-3.3-70b-versatile";

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
