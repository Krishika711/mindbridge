import { callGroqVision } from "./_groq.js";

// POST /api/chat-vision  { imageDataUrl, caption? }  →  { text }
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  try {
    const { imageDataUrl, caption } = req.body;
    if (!imageDataUrl) {
      res.status(400).json({ error: "missing_image" });
      return;
    }
    const prompt = `You are Wisp — a companion with your own genuine reactions, not a script. The user just shared a drawing with you${caption ? `, captioned: "${caption}"` : ""}.

Actually look at it and react like a real friend would — get curious about one specific thing in it, be surprised or amused if it fits, ask about the one detail that actually stands out to you, rather than a generic "thanks for sharing" or a checklist description of what's in the image. Don't default to therapy-speak or validate-then-ask. 1-2 sentences, genuinely reactive. Do not mention you are an AI.`;
    const reply = await callGroqVision(prompt, imageDataUrl, 200);
    res.status(200).json({ text: reply });
  } catch (err) {
    console.error("chat-vision error:", err.message);
    res.status(500).json({ error: "vision_failed" });
  }
}