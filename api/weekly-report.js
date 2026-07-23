import { callGroq } from "./_groq.js";

function extractJson(raw) {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

// POST /api/weekly-report
// body: { chats: [{text, date}], moods: [{mood, score, date}], hopeEntries: [{text, letter, hasVoice, date}] }
// → { report: {...} }
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  try {
    const { chats = [], moods = [], hopeEntries = [] } = req.body;

    const chatBlock = chats.length
      ? chats.map((c) => `- ${c.text}`).join("\n")
      : "No chat messages this week.";
    const moodBlock = moods.length
      ? moods.map((m) => `- ${m.mood} (score ${m.score}) on ${m.date}`).join("\n")
      : "No mood check-ins this week.";
    const hopeBlock = hopeEntries.length
      ? hopeEntries
          .map((h) => `- ${h.text || h.letter || (h.hasVoice ? "[voice note]" : "[entry]")}`)
          .join("\n")
      : "No Hope Vault entries this week.";

    const raw = await callGroq(
      [
        {
          role: "system",
          content: `You analyze one week of a college student's activity in a wellness app and produce a short, honest weekly report as JSON. You are not a therapist and must not diagnose or name any clinical condition. Base every claim only on the data given — never invent details.

Return ONLY a JSON object with this exact shape, nothing else, no markdown fences:
{
  "summary": "2-3 sentence plain-language overview of the week",
  "moodPattern": "1-2 sentences describing the mood trend across the week",
  "chatThemes": ["short theme", "short theme", "short theme"],
  "hopeVaultActivity": "1 sentence on Hope Vault activity this week, or note if empty",
  "suggestions": ["one concrete suggestion", "one concrete suggestion"],
  "concern": { "flagged": true or false, "note": "one sentence only if flagged, else null" }
}

Set concern.flagged to true only if the data shows a clear pattern of sustained low mood, crisis language, or repeated distress across multiple entries — not from a single bad day. If flagged, the note should gently suggest reaching out to a trusted person or professional, never a clinical label.`,
        },
        {
          role: "user",
          content: `MOOD CHECK-INS THIS WEEK:\n${moodBlock}\n\nCHAT MESSAGES THIS WEEK (user's own words only):\n${chatBlock}\n\nHOPE VAULT ENTRIES THIS WEEK:\n${hopeBlock}`,
        },
      ],
      700,
      { response_format: { type: "json_object" } }
    );

    const report = extractJson(raw);
    if (!report) {
      console.error("weekly report parse failed, raw output:", raw);
      res.status(502).json({ error: "report_parse_failed" });
      return;
    }

    res.status(200).json({ report });
  } catch (err) {
    console.error("weekly report error:", err.message);
    res.status(500).json({ error: "weekly_report_failed" });
  }
}