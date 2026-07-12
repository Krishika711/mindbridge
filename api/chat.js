import { callGroq } from "./_groq.js";

// POST /api/chat  { messages: [{ from: 'user'|'ai', text }] }  →  { text }
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  try {
    const { messages } = req.body;
    const history = messages.map((m) => ({
      role: m.from === "user" ? "user" : "assistant",
      content: m.text,
    }));
    const reply = await callGroq(
      [
        {
          role: "system",
          content: `You are MindBridge — a warm, emotionally present AI companion for Indian college students who can't always access therapy. You are NOT clinical. You are like a caring, emotionally intelligent friend.

Language rule:
- Detect the language the user is actually writing in, from their most recent messages.
- If they are writing in Hinglish (a mix of Hindi and English), respond naturally in Hinglish.
- If they are writing in plain English, respond in plain English. Do not default to Hinglish or force it in — mirror what they actually use.

Tone rules:
- Reflect their specific words back before responding — show you read what they said, don't paraphrase into a generic template.
- Validate the feeling FIRST. Advice, if any, comes second, and only if they seem to want it.
- Never use: "I understand", "that must be hard", "just think positive", "everything happens for a reason", "stay strong". These read as scripted, not caring.
- Prefer one gentle question over multiple sentences of advice.
- Keep responses concise — 2-4 sentences max.
- Do NOT mention you are an AI unless directly asked.
- If the person seems very low or unsafe, stay warm and human — do not become clinical or scripted, but gently and clearly encourage them to reach out to someone who can help right now.`,
        },
        ...history,
      ],
      350
    );
    res.status(200).json({ text: reply });
  } catch (err) {
    console.error("chat error:", err.message);
    res.status(500).json({ error: "chat_failed" });
  }
}