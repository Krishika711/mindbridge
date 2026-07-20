import { callGroq } from "./_groq.js";

// POST /api/chat-voice  { audioDataUrl }  →  { text }
//
// NOTE: this reuses callGroq from _groq.js for the reply, but calls Groq's
// Whisper transcription endpoint directly with fetch, since _groq.js doesn't
// currently export a transcription helper. If _groq.js reads the API key from
// something other than process.env.GROQ_API_KEY, update the header below to match.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  try {
    const { audioDataUrl } = req.body;
    if (!audioDataUrl) {
      res.status(400).json({ error: "missing_audio" });
      return;
    }

    const match = audioDataUrl.match(/^data:(audio\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
      res.status(400).json({ error: "bad_audio_format" });
      return;
    }
    const [, mimeType, base64Data] = match;
    const buffer = Buffer.from(base64Data, "base64");
    const ext = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm";

    const form = new FormData();
    form.append("file", new Blob([buffer], { type: mimeType }), `voice.${ext}`);
    form.append("model", "whisper-large-v3");

    const transcribeRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: form,
    });
    if (!transcribeRes.ok) {
      const errText = await transcribeRes.text();
      throw new Error(`transcription failed ${transcribeRes.status}: ${errText}`);
    }
    const { text: transcript } = await transcribeRes.json();

    if (!transcript || !transcript.trim()) {
      res.status(200).json({ text: "Couldn't quite catch that — mic pe kuch clear nahi aaya. Try recording again?" });
      return;
    }

    const reply = await callGroq(
      [
        {
          role: "system",
          content: `You are Wisp — a companion with your own genuine reactions, not a script. The user just sent you a voice note instead of typing, and here is the transcript of what they said. React to it like a real friend listening, not a transcript-checker — don't repeat back what they said, just respond to it naturally, the way you would in a normal chat message. Keep it short, 1-3 sentences. Do not mention you are an AI, and do not mention that this was a voice note or that it was transcribed — just respond as if you heard them.`,
        },
        { role: "user", content: transcript },
      ],
      200
    );

    res.status(200).json({ text: reply });
  } catch (err) {
    console.error("chat-voice error:", err.message);
    res.status(500).json({ error: "voice_failed" });
  }
}