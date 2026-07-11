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
          content: `You are MindBridge — a warm, empathetic AI companion for Indian college students who can't always access therapy.
You speak in natural Hinglish (mix of Hindi and English). You are NOT clinical. You are like a caring, emotionally intelligent friend.
Rules:
- Always acknowledge the feeling FIRST before anything else
- Never say "I understand" as your opener — show it instead
- Never suggest "just think positive" or give empty advice
- If the person seems very low, gently remind them they're not alone and people care
- Keep responses concise — 2-4 sentences max
- Do NOT mention you are an AI unless directly asked`,
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
