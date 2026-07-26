import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import MoodBackground from '../components/MoodBackground';
import { HelpButton } from '../components/ui/Misc';
import { useMood, MOODS } from '../context/MoodContext';
import { supabase } from '../lib/supabaseClient';

const MOOD_COLOR = {
  joyful: '#E6A93A', neutral: '#8CA283', anxious: '#8593A3', sad: '#5B6E9A', numb: '#98A0BC',
};
const MOOD_LABEL = Object.fromEntries(MOODS.map((m) => [m.key, m.label.split(' & ')[0]]));
// left-to-right order for the spectrum bar, brightest to heaviest
const SPECTRUM_ORDER = ['joyful', 'neutral', 'anxious', 'sad', 'numb'];

const REFLECTION_TEMPLATES = {
  joyful: 'This week leaned bright — you spent most of it in a lighter, more energized place. Worth noticing what made that possible.',
  neutral: 'This week stayed mostly steady and balanced. Not every week needs a story — sometimes even is the win.',
  anxious: 'This week had a quieter, more reflective edge to it. It looks like you needed space to process things at your own pace.',
  sad: 'This week carried some real weight. You showed up through the heavier days — that is worth acknowledging, not rushing past.',
  numb: 'This week felt more distant or unclear for a lot of it. That is its own kind of tired, and it is okay to just note it without needing to explain it.',
  none: "No check-ins yet this week — once you log a mood, this space will start reflecting it back to you.",
};

function startOfWeek(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - date.getDay());
  return date;
}

function dominantMood(moods) {
  if (!moods.length) return null;
  const counts = {};
  moods.forEach((m) => { counts[m] = (counts[m] || 0) + 1; });
  return Object.keys(counts).sort((a, b) => {
    if (counts[b] !== counts[a]) return counts[b] - counts[a];
    return SPECTRUM_ORDER.indexOf(a) - SPECTRUM_ORDER.indexOf(b);
  })[0];
}

// Monday-based — matches the AI weekly report / cron job, intentionally
// different from startOfWeek() above which the native mood-color widget uses.
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function WeeklyReport({ session }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [hasEnoughData, setHasEnoughData] = useState(null);

  const weekStart = useMemo(() => getWeekStart(), []);
  const weekStartISO = useMemo(() => toISODate(weekStart), [weekStart]);

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error: fetchErr } = await supabase
        .from('weekly_reports')
        .select('report')
        .eq('user_id', session.user.id)
        .eq('week_start', weekStartISO)
        .maybeSingle();
      if (cancelled) return;
      if (fetchErr) console.error('weekly report load failed:', fetchErr.message);
      if (data?.report) setReport(data.report);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [session, weekStartISO]);

  const generateReport = async () => {
    if (!session) return;
    setGenerating(true);
    setError('');
    try {
      const weekStartTS = weekStart.toISOString();

      const [{ data: msgRows, error: msgErr }, { data: moodRows, error: moodErr }, { data: hopeRows, error: hopeErr }] = await Promise.all([
        supabase
          .from('messages')
          .select('text, created_at')
          .eq('user_id', session.user.id)
          .eq('from_role', 'user')
          .gte('created_at', weekStartTS)
          .order('created_at', { ascending: true })
          .limit(150),
        supabase
          .from('mood_logs')
          .select('mood, score, created_at')
          .eq('user_id', session.user.id)
          .gte('created_at', weekStartTS)
          .order('created_at', { ascending: true }),
        supabase
          .from('hope_vault_tapes')
          .select('text_scrap, letter, voice_caption, created_at')
          .eq('user_id', session.user.id)
          .gte('created_at', weekStartTS)
          .order('created_at', { ascending: true }),
      ]);
      if (msgErr) throw msgErr;
      if (moodErr) throw moodErr;
      if (hopeErr) throw hopeErr;

      if (!(msgRows?.length) && !(moodRows?.length) && !(hopeRows?.length)) {
        setHasEnoughData(false);
        setGenerating(false);
        return;
      }

      const chats = (msgRows || []).map((m) => ({ text: m.text, date: formatDateLabel(m.created_at) }));
      const moods = (moodRows || []).map((m) => ({ mood: m.mood, score: m.score, date: formatDateLabel(m.created_at) }));
      const hopeEntries = (hopeRows || []).map((h) => ({
        text: h.text_scrap, letter: h.letter, hasVoice: !!h.voice_caption, date: formatDateLabel(h.created_at),
      }));

      const res = await fetch('/api/weekly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chats, moods, hopeEntries }),
      });
      if (!res.ok) throw new Error(`weekly report request failed: ${res.status}`);
      const { report: newReport } = await res.json();

      const { error: saveErr } = await supabase
        .from('weekly_reports')
        .upsert(
          {
            user_id: session.user.id,
            week_start: weekStartISO,
            report: newReport,
            activity_snapshot: { chats, moods, hopeEntries },
          },
          { onConflict: 'user_id,week_start' }
        );
      if (saveErr) console.error('weekly report save failed:', saveErr.message);

      setReport(newReport);
      setHasEnoughData(true);
    } catch (err) {
      console.error('weekly report generation failed:', err.message);
      setError('Report ban nahi paya — dobara try kar.');
    } finally {
      setGenerating(false);
    }
  };

  if (!session) return null;

  if (loading) {
    return <div className="text-xs mb-8" style={{ color: 'var(--text-faint)' }}>Loading this week's report…</div>;
  }

  if (report) {
    return (
      <div className="rounded-3xl p-8 backdrop-blur-md mb-8" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        <div className="text-[11px] font-semibold tracking-[1.4px] uppercase mb-3.5" style={{ color: 'var(--accent-deep)' }}>
          This week's AI report
        </div>
        <p className="text-sm mb-4 leading-relaxed">{report.summary}</p>

        <div className="mb-4">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-faint)' }}>Mood pattern</div>
          <p className="text-sm leading-relaxed">{report.moodPattern}</p>
        </div>

        {report.chatThemes?.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-faint)' }}>What came up in chats</div>
            <div className="flex flex-wrap gap-2">
              {report.chatThemes.map((t, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-faint)' }}>Hope Vault</div>
          <p className="text-sm leading-relaxed">{report.hopeVaultActivity}</p>
        </div>

        {report.suggestions?.length > 0 && (
          <div className="mb-1">
            <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-faint)' }}>Worth trying</div>
            <ul className="text-sm leading-relaxed pl-4" style={{ listStyle: 'disc' }}>
              {report.suggestions.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}

        {report.concern?.flagged && (
          <div className="mt-4 text-xs rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--accent-deep)' }}>
            {report.concern.note}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-3xl p-8 backdrop-blur-md mb-8 text-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      {hasEnoughData === false ? (
        <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Is hafte abhi kuch activity nahi hai report banane ke liye.</p>
      ) : (
        <>
          <p className="text-xs mb-3" style={{ color: 'var(--text-faint)' }}>
            Reports Monday raat auto-generate hote hain. Is hafte ka abhi nahi bana.
          </p>
          {error && <p className="text-xs mb-2" style={{ color: '#C0523A' }}>{error}</p>}
          <button
            onClick={generateReport}
            disabled={generating}
            className="px-5 py-2.5 rounded-full text-[13px] font-semibold"
            style={{ background: 'var(--ink)', color: 'var(--ink-text)', opacity: generating ? 0.6 : 1 }}
          >
            {generating ? 'Analyzing…' : 'Generate now instead'}
          </button>
        </>
      )}
    </div>
  );
}

function PastReports({ session }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('weekly_reports')
        .select('id, week_start, report')
        .eq('user_id', session.user.id)
        .order('week_start', { ascending: false })
        .limit(11); // current week + up to 10 past weeks
      if (cancelled) return;
      if (error) console.error('past reports load failed:', error.message);
      setReports((data || []).slice(1)); // drop current week — WeeklyReport already shows it above
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [session]);

  if (!session || loading || reports.length === 0) return null;

  return (
    <>
      <div className="text-lg mb-3" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Past AI reports</div>
      <div className="flex flex-col gap-2.5 mb-8">
        {reports.map((r) => {
          const isOpen = expandedId === r.id;
          const start = new Date(r.week_start);
          const end = new Date(start);
          end.setDate(start.getDate() + 6);
          const label = `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
          const preview = r.report?.summary || '';
          return (
            <div key={r.id} className="rounded-2xl p-3.5" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
              <button onClick={() => setExpandedId(isOpen ? null : r.id)} className="w-full flex items-center justify-between text-left gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs truncate" style={{ color: 'var(--text-faint)' }}>
                    {preview.length > 70 ? `${preview.slice(0, 70)}…` : preview}
                  </div>
                </div>
                <span className="text-xs shrink-0" style={{ color: 'var(--text-faint)' }}>{isOpen ? '−' : '+'}</span>
              </button>
              {isOpen && (
                <div className="mt-3 pt-3 text-sm leading-relaxed" style={{ borderTop: '1px solid var(--card-border)' }}>
                  <p className="mb-2">{r.report?.summary}</p>
                  <p className="mb-2" style={{ color: 'var(--text-faint)' }}>{r.report?.moodPattern}</p>
                  {r.report?.suggestions?.length > 0 && (
                    <ul className="pl-4" style={{ listStyle: 'disc' }}>
                      {r.report.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function MoodInsights() {
  const navigate = useNavigate();
  const { theme, mode, moodHistory, session } = useMood();

  const thisWeekStart = useMemo(() => startOfWeek(new Date()), []);
  const thisWeekEnd = useMemo(() => {
    const d = new Date(thisWeekStart);
    d.setDate(d.getDate() + 6);
    return d;
  }, [thisWeekStart]);

  const weekDays = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => ({ label: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i], mood: null }));
    moodHistory.forEach((h) => {
      const d = new Date(h.date);
      if (d < thisWeekStart || d > thisWeekEnd) return;
      days[d.getDay()].mood = h.mood;
    });
    return days;
  }, [moodHistory, thisWeekStart, thisWeekEnd]);

  const weekMoods = weekDays.map((d) => d.mood).filter(Boolean);
  const weekDominant = dominantMood(weekMoods) || 'none';
  const spectrumPercent = weekDominant === 'none' ? 50 : (SPECTRUM_ORDER.indexOf(weekDominant) / (SPECTRUM_ORDER.length - 1)) * 100;

  const pastWeeks = useMemo(() => {
    const byWeek = new Map();
    moodHistory.forEach((h) => {
      const d = new Date(h.date);
      const weekStart = startOfWeek(d);
      if (weekStart.getTime() >= thisWeekStart.getTime()) return;
      const key = weekStart.toISOString();
      if (!byWeek.has(key)) byWeek.set(key, []);
      byWeek.get(key).push(h.mood);
    });
    return Array.from(byWeek.entries())
      .sort((a, b) => new Date(b[0]) - new Date(a[0]))
      .slice(0, 5)
      .map(([weekStartIso, moods]) => {
        const start = new Date(weekStartIso);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        const dom = dominantMood(moods);
        return {
          key: weekStartIso,
          label: `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
          mood: dom,
          caption: dom ? `Mostly ${MOOD_LABEL[dom]}` : 'A mixed week',
        };
      });
  }, [moodHistory, thisWeekStart]);

  return (
    <div className="app app-shell flex flex-col" data-theme={theme} data-mode={mode}>
      <MoodBackground showCelestial={false} />
      <Header showBack showMoodSwitcher />

      <main className="relative z-10 flex-1 flex flex-col items-center px-6 py-10">
        <div className="w-full max-w-2xl">
          <button onClick={() => navigate(-1)} className="text-sm mb-6" style={{ color: 'var(--text-soft)' }}>← Back</button>

          <div className="text-xs mb-1.5" style={{ color: 'var(--text-faint)' }}>
            {thisWeekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — {thisWeekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: 'var(--ink)', color: 'var(--ink-text)' }}>📈</div>
            <h1 className="text-3xl" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Your weekly mirror</h1>
          </div>

          {/* Reflection canvas */}
          <div className="rounded-3xl p-8 backdrop-blur-md mb-8" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <div className="text-[11px] font-semibold tracking-[1.4px] uppercase mb-3.5" style={{ color: 'var(--accent-deep)' }}>
              This week, in words
            </div>
            <p className="italic text-lg leading-relaxed mb-8" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
              {REFLECTION_TEMPLATES[weekDominant]}
            </p>

            <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--text-faint)' }}>
              <span>Sun</span><span>Mood spectrum</span><span>Sat</span>
            </div>
            <div
              className="h-4 rounded-full relative"
              style={{ background: `linear-gradient(90deg, ${SPECTRUM_ORDER.map((k) => MOOD_COLOR[k]).join(', ')})` }}
            >
              {weekDominant !== 'none' && (
                <div
                  className="absolute -top-1.5 w-7 h-7 rounded-full"
                  style={{ left: `calc(${spectrumPercent}% - 14px)`, background: 'var(--ink)', border: '2px solid var(--card-bg)' }}
                />
              )}
            </div>

            <div className="flex justify-between mt-4">
              {weekDays.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ background: d.mood ? MOOD_COLOR[d.mood] : 'var(--card-border)' }}
                    title={d.mood ? MOOD_LABEL[d.mood] : 'No entry'}
                  />
                  <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{d.label}</span>
                </div>
              ))}
            </div>
          </div>

          <WeeklyReport session={session} />
          <PastReports session={session} />

          {/* Past weeks archive */}
          {pastWeeks.length > 0 && (
            <>
              <div className="text-lg mb-3" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Past reflections</div>
              <div className="flex flex-col gap-2.5 mb-8">
                {pastWeeks.map((w) => (
                  <div key={w.key} className="flex items-center gap-3.5 rounded-2xl p-3.5" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
                    <div
                      className="w-7 h-7 rounded-full shrink-0"
                      style={{ background: w.mood ? `linear-gradient(135deg, ${MOOD_COLOR[w.mood]}, ${MOOD_COLOR[w.mood]}aa)` : 'var(--card-border)' }}
                    />
                    <div>
                      <div className="text-sm font-medium">{w.label}</div>
                      <div className="text-xs" style={{ color: 'var(--text-faint)' }}>{w.caption}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <p className="text-center text-sm italic" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-faint)' }}>
            No streaks. No scores. Just the shape of your week.
          </p>
        </div>
      </main>

      <HelpButton />
    </div>
  );
}