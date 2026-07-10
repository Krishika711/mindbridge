import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MoodBackground from '../components/MoodBackground';
import Header from '../components/Header';
import { HelpButton } from '../components/ui/Misc';
import { useMood, MOODS } from '../context/MoodContext';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MOOD_HEIGHT = { joyful: 92, neutral: 55, anxious: 40, sad: 25, numb: 15 };
const MOOD_COLOR = {
  joyful: '#E6A93A', neutral: '#8CA283', anxious: '#8593A3', sad: '#5B6E9A', numb: '#98A0BC',
};

// deterministic demo data so the chart always tells a coherent story
const DEMO_WEEK = ['neutral', 'joyful', 'anxious', 'joyful', 'joyful', 'neutral', 'numb'];

export default function MoodInsights() {
  const navigate = useNavigate();
  const { theme, mode, moodHistory } = useMood();

  const week = useMemo(() => {
    // blend real history in if present, else fall back to demo data
    const source = moodHistory.length ? moodHistory.slice(-7).map((h) => h.mood) : DEMO_WEEK;
    while (source.length < 7) source.unshift('neutral');
    return source;
  }, [moodHistory]);

  const bestDayIdx = week.reduce((best, m, i) => (MOOD_HEIGHT[m] > MOOD_HEIGHT[week[best]] ? i : best), 0);

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
            Over time, your check-ins and journal entries paint a picture. Mood Insights shows you weekly and monthly
            trends, highlights recurring triggers, and celebrates streaks of stability — without judgment.
          </p>

          <div className="rounded-3xl p-6 backdrop-blur-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <div className="text-[11px] font-semibold tracking-[1.4px] uppercase mb-6" style={{ color: 'var(--accent-deep)' }}>
              THIS WEEK
            </div>

            <div className="flex items-end justify-between gap-3 h-40 mb-3 px-2">
              {week.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div
                    className="w-full rounded-t-lg transition-all duration-700"
                    style={{ height: `${MOOD_HEIGHT[m]}%`, background: MOOD_COLOR[m], opacity: i === bestDayIdx ? 1 : 0.7 }}
                    title={m}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between px-2 mb-6" style={{ borderTop: '1px solid var(--card-border)', paddingTop: 10 }}>
              {DAYS.map((d) => (
                <div key={d} className="flex-1 text-center text-xs" style={{ color: 'var(--text-faint)' }}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Avg Mood" value="Neutral" />
              <StatCard label="Best Day" value={DAYS[bestDayIdx]} />
              <StatCard label="Entries" value={String(12 + moodHistory.length)} />
            </div>
          </div>

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
