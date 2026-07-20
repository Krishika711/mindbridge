import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import MoodBackground from '../components/MoodBackground';
import { HelpButton } from '../components/ui/Misc';
import { useMood, MOODS } from '../context/MoodContext';

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

export default function MoodInsights() {
  const navigate = useNavigate();
  const { theme, mode, moodHistory } = useMood();

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