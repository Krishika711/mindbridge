import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import MoodBackground from '../components/MoodBackground';
import { HelpButton } from '../components/ui/Misc';
import { useMood, MOODS } from '../context/MoodContext';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MOOD_HEIGHT = { joyful: 92, neutral: 55, anxious: 40, sad: 25, numb: 15 };
const MOOD_COLOR = {
  joyful: '#E6A93A', neutral: '#8CA283', anxious: '#8593A3', sad: '#5B6E9A', numb: '#98A0BC',
};
const MOOD_LABEL = Object.fromEntries(MOODS.map((m) => [m.key, m.label.split(' & ')[0]]));

function startOfWeek(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - date.getDay()); // back to Sunday
  return date;
}

function dominantMood(moods) {
  if (!moods.length) return null;
  const counts = {};
  moods.forEach((m) => { counts[m] = (counts[m] || 0) + 1; });
  return Object.keys(counts).sort((a, b) => {
    if (counts[b] !== counts[a]) return counts[b] - counts[a];
    return MOOD_HEIGHT[b] - MOOD_HEIGHT[a]; // tie-break toward the "brighter" mood
  })[0];
}

export default function MoodInsights() {
  const navigate = useNavigate();
  const { theme, mode, moodHistory } = useMood();

  const thisWeekStart = useMemo(() => startOfWeek(new Date()), []);

  const weekBars = useMemo(() => {
    // one bucket per day of the current week, real entries only, no fake fill
    const bars = DAYS.map(() => []);
    moodHistory.forEach((h) => {
      const d = new Date(h.date);
      if (d < thisWeekStart) return;
      const dayIdx = d.getDay();
      bars[dayIdx].push(h.mood);
    });
    return bars.map((moods) => dominantMood(moods));
  }, [moodHistory, thisWeekStart]);

  const thisWeekMoods = weekBars.filter(Boolean);
  const avgMood = dominantMood(thisWeekMoods);
  const bestDayIdx = weekBars.reduce(
    (best, m, i) => (m && (weekBars[best] == null || MOOD_HEIGHT[m] > MOOD_HEIGHT[weekBars[best]]) ? i : best),
    -1
  );

  const pastWeeks = useMemo(() => {
    const byWeek = new Map();
    moodHistory.forEach((h) => {
      const d = new Date(h.date);
      const weekStart = startOfWeek(d);
      if (weekStart.getTime() >= thisWeekStart.getTime()) return; // exclude current week
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
        return {
          key: weekStartIso,
          label: `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
          mood: dominantMood(moods),
          count: moods.length,
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

          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: 'var(--ink)', color: 'var(--ink-text)' }}>📈</div>
            <h1 className="text-3xl" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Mood Insights</h1>
          </div>
          <p className="mb-2" style={{ color: 'var(--text-soft)' }}>Patterns, gently surfaced</p>
          <p className="mb-8 max-w-lg text-[15px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>
            Built from your real check-ins — no streaks, no scores, just the shape of your week.
          </p>

          <div className="rounded-3xl p-6 backdrop-blur-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <div className="text-[11px] font-semibold tracking-[1.4px] uppercase mb-6" style={{ color: 'var(--accent-deep)' }}>
              THIS WEEK
            </div>

            {thisWeekMoods.length === 0 ? (
              <div className="text-sm text-center py-10" style={{ color: 'var(--text-faint)' }}>
                No check-ins yet this week — they'll show up here as you go.
              </div>
            ) : (
              <>
                <div className="flex items-end justify-between gap-3 h-40 mb-3 px-2">
                  {weekBars.map((m, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                      {m ? (
                        <div
                          className="w-full rounded-t-lg transition-all duration-700"
                          style={{ height: `${MOOD_HEIGHT[m]}%`, background: MOOD_COLOR[m], opacity: i === bestDayIdx ? 1 : 0.7 }}
                          title={MOOD_LABEL[m]}
                        />
                      ) : (
                        <div className="w-full rounded-t-lg" style={{ height: '4%', background: 'var(--card-border)' }} />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between px-2 mb-6" style={{ borderTop: '1px solid var(--card-border)', paddingTop: 10 }}>
                  {DAYS.map((d) => (
                    <div key={d} className="flex-1 text-center text-xs" style={{ color: 'var(--text-faint)' }}>{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <StatCard label="Avg Mood" value={avgMood ? MOOD_LABEL[avgMood] : '—'} />
                  <StatCard label="Best Day" value={bestDayIdx >= 0 ? DAYS[bestDayIdx] : '—'} />
                  <StatCard label="Entries" value={String(moodHistory.length)} />
                </div>
              </>
            )}
          </div>

          {pastWeeks.length > 0 && (
            <div className="mt-8">
              <div className="text-[11px] font-semibold tracking-[1.4px] uppercase mb-3" style={{ color: 'var(--accent-deep)' }}>
                Past Weeks
              </div>
              <div className="flex flex-col gap-2.5">
                {pastWeeks.map((w) => (
                  <div key={w.key} className="flex items-center gap-3.5 rounded-2xl p-3.5" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
                    <div className="w-7 h-7 rounded-full flex-shrink-0" style={{ background: w.mood ? MOOD_COLOR[w.mood] : 'var(--card-border)' }} />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{w.label}</div>
                      <div className="text-xs" style={{ color: 'var(--text-faint)' }}>
                        {w.mood ? `Mostly ${MOOD_LABEL[w.mood]}` : 'Mixed'} · {w.count} check-in{w.count === 1 ? '' : 's'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <div key={m.key} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: MOOD_COLOR[m.key] }} />
                {m.label.split(' & ')[0]}
              </div>
            ))}
          </div>
        </div>
      </main>

      <HelpButton />
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
      <div className="text-xs mb-1" style={{ color: 'var(--text-faint)' }}>{label}</div>
      <div className="font-semibold text-lg">{value}</div>
    </div>
  );
}