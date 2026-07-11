import { callGroq } from "./_groq.js";

// POST /api/score  { history: "User: ...\nAI: ..." }  →  { crisis_risk, theme, needs_alert }
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  try {
    const { history } = req.body;
    const raw = await callGroq(
      [
        {
          role: "system",
          content: `You are a silent crisis detection system. Analyze the conversation and return ONLY valid JSON, nothing else, no markdown:
{"crisis_risk": <0-10>, "theme": "<word>", "needs_alert": <true|false>}
crisis_risk 7+ and needs_alert true = explicit hopelessness, self-harm, or suicidal language detected.`,
        },
        { role: "user", content: history },
      ],
      120
    );
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { crisis_risk: 0, theme: "okay", needs_alert: false };
    }
    res.status(200).json(parsed);
  } catch (err) {
    console.error("score error:", err.message);
    res.status(200).json({ crisis_risk: 0, theme: "okay", needs_alert: false });
  }
}
