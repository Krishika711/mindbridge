import { createClient } from "@supabase/supabase-js";
import { generateWeeklyReport } from "../weekly-report.js";

// Vercel Hobby default timeout is 10s — this loops over every active user,
// so bump it. Hobby's actual ceiling for this may still be lower than 60;
// watch the function logs after the first real run.
export const config = {
  maxDuration: 60,
};

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Cron fires around Monday 00:00 IST. We want the week that just ENDED
// (previous Monday 00:00 IST -> this Monday 00:00 IST), not the week starting now.
function getCompletedWeekRange() {
  const now = new Date();
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);

  const day = istNow.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const thisMondayIST = new Date(istNow);
  thisMondayIST.setUTCDate(thisMondayIST.getUTCDate() + diff);
  thisMondayIST.setUTCHours(0, 0, 0, 0);

  const prevMondayIST = new Date(thisMondayIST);
  prevMondayIST.setUTCDate(prevMondayIST.getUTCDate() - 7);

  // Convert the IST-shifted marks back to real UTC instants for querying created_at.
  const rangeStart = new Date(prevMondayIST.getTime() - IST_OFFSET_MS);
  const rangeEnd = new Date(thisMondayIST.getTime() - IST_OFFSET_MS);
  const weekStartISO = prevMondayIST.toISOString().slice(0, 10);

  return { rangeStart, rangeEnd, weekStartISO };
}

function formatDateLabel(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

async function collectActiveUserIds(supabaseAdmin, rangeStart, rangeEnd) {
  const startISO = rangeStart.toISOString();
  const endISO = rangeEnd.toISOString();

  const [msgRes, moodRes, hopeRes] = await Promise.all([
    supabaseAdmin.from("messages").select("user_id").eq("from_role", "user").gte("created_at", startISO).lt("created_at", endISO),
    supabaseAdmin.from("mood_logs").select("user_id").gte("created_at", startISO).lt("created_at", endISO),
    supabaseAdmin.from("hope_vault_tapes").select("user_id").gte("created_at", startISO).lt("created_at", endISO),
  ]);

  if (msgRes.error) throw msgRes.error;
  if (moodRes.error) throw moodRes.error;
  if (hopeRes.error) throw hopeRes.error;

  const ids = new Set([
    ...(msgRes.data || []).map((r) => r.user_id),
    ...(moodRes.data || []).map((r) => r.user_id),
    ...(hopeRes.data || []).map((r) => r.user_id),
  ]);
  return [...ids];
}

async function buildReportForUser(supabaseAdmin, userId, rangeStart, rangeEnd) {
  const startISO = rangeStart.toISOString();
  const endISO = rangeEnd.toISOString();

  const [msgRes, moodRes, hopeRes] = await Promise.all([
    supabaseAdmin.from("messages").select("text, created_at").eq("user_id", userId).eq("from_role", "user")
      .gte("created_at", startISO).lt("created_at", endISO).order("created_at", { ascending: true }).limit(150),
    supabaseAdmin.from("mood_logs").select("mood, score, created_at").eq("user_id", userId)
      .gte("created_at", startISO).lt("created_at", endISO).order("created_at", { ascending: true }),
    supabaseAdmin.from("hope_vault_tapes").select("text_scrap, letter, voice_caption, created_at").eq("user_id", userId)
      .gte("created_at", startISO).lt("created_at", endISO).order("created_at", { ascending: true }),
  ]);

  if (msgRes.error) throw msgRes.error;
  if (moodRes.error) throw moodRes.error;
  if (hopeRes.error) throw hopeRes.error;

  const chats = (msgRes.data || []).map((m) => ({ text: m.text, date: formatDateLabel(m.created_at) }));
  const moods = (moodRes.data || []).map((m) => ({ mood: m.mood, score: m.score, date: formatDateLabel(m.created_at) }));
  const hopeEntries = (hopeRes.data || []).map((h) => ({
    text: h.text_scrap, letter: h.letter, hasVoice: !!h.voice_caption, date: formatDateLabel(h.created_at),
  }));

  const report = await generateWeeklyReport({ chats, moods, hopeEntries });
  return { report, activitySnapshot: { chats, moods, hopeEntries } };
}

export default async function handler(req, res) {
  // Vercel sends this header automatically on real cron invocations when
  // CRON_SECRET is set as an env var — blocks randoms from hitting this route
  // and burning Groq calls on your behalf.
  const authHeader = req.headers["authorization"];
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { rangeStart, rangeEnd, weekStartISO } = getCompletedWeekRange();

  try {
    const userIds = await collectActiveUserIds(supabaseAdmin, rangeStart, rangeEnd);

    let generated = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        const { report, activitySnapshot } = await buildReportForUser(supabaseAdmin, userId, rangeStart, rangeEnd);
        const { error: saveErr } = await supabaseAdmin
          .from("weekly_reports")
          .upsert(
            { user_id: userId, week_start: weekStartISO, report, activity_snapshot: activitySnapshot },
            { onConflict: "user_id,week_start" }
          );
        if (saveErr) throw saveErr;
        generated++;
      } catch (err) {
        console.error(`weekly report failed for user ${userId}:`, err.message);
        failed++;
      }
    }

    res.status(200).json({ ok: true, weekStart: weekStartISO, totalUsers: userIds.length, generated, failed });
  } catch (err) {
    console.error("weekly report cron error:", err.message);
    res.status(500).json({ error: "cron_failed" });
  }
}