import { callGroq } from "./_groq.js";
import { requireAppAccess } from "./_guestAuth.js";
import { isRateLimited, getClientIp } from "./_rateLimit.js";

// POST /api/score  { history: "User: ...\nAI: ..." }  →  { crisis_risk, theme, needs_alert }
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  if (!(await requireAppAccess(req, res))) return;

  if (isRateLimited(`score:${getClientIp(req)}`, { limit: 20, windowMs: 60_000 })) {
    res.status(429).json({ error: "rate_limited" });
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
    } catch (parseErr) {
      // A malformed reply is a real failure, not a safe score — the client
      // needs to see it as one (non-200) so it retries instead of trusting it.
      console.error("score parse failed:", parseErr.message, raw);
      res.status(502).json({ error: "score_parse_failed" });
      return;
    }
    res.status(200).json(parsed);
  } catch (err) {
    console.error("score error:", err.message);
    res.status(500).json({ error: "score_failed" });
  }
}