import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import MoodBackground from '../components/MoodBackground';
import { HelpButton } from '../components/ui/Misc';
import { useMood } from '../context/MoodContext';
import { supabase } from '../lib/supabaseClient';

const MOOD_COLOR = {
  joyful: '#E6A93A', neutral: '#B8B0A0', anxious: '#8593A3', sad: '#4A5578', numb: '#7B8399',
};
const MOOD_Y = { joyful: 18, neutral: 45, anxious: 55, sad: 82, numb: 65 };
const MOOD_LABEL = { joyful: 'Bright & Energized', neutral: 'Calm & Balanced', anxious: 'Quiet & Reflective', sad: 'Heavy & Overwhelmed', numb: 'Burnt Out & Unclear' };

function dominantMood(moods) {
  if (!moods.length) return null;
  const counts = {};
  moods.forEach((m) => { counts[m] = (counts[m] || 0) + 1; });
  return Object.keys(counts).sort((a, b) => {
    if (counts[b] !== counts[a]) return counts[b] - counts[a];
    return MOOD_Y[a] - MOOD_Y[b]; // tie-break toward the "brighter" (lower Y) mood
  })[0];
}

function HeartbeatSpectrum({ moodHistory }) {
  const [hover, setHover] = useState(null);

  // One point per calendar day, last 7 days — never per raw check-in.
  // This is what actually prevents same-day rapid check-ins from stacking on top of each other.
  const points = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push(d);
    }

    const byDay = days.map((day) => {
      const dayEntries = moodHistory.filter((h) => {
        const t = new Date(h.date);
        return t.toDateString() === day.toDateString();
      });
      return { day, moods: dayEntries.map((e) => e.mood), count: dayEntries.length };
    });

    const withData = byDay
      .map((b, i) => ({ ...b, dayIndex: i }))
      .filter((b) => b.moods.length > 0);

    return withData.map((b) => ({
      x: (b.dayIndex / 6) * 92 + 4, // even spacing by day slot, not by timestamp
      y: MOOD_Y[dominantMood(b.moods)],
      mood: dominantMood(b.moods),
      jitter: dominantMood(b.moods) === 'sad',
      day: b.day,
      count: b.count,
    }));
  }, [moodHistory]);

  if (points.length === 0) {
    return (
      <div className="text-sm text-center py-12" style={{ color: 'var(--text-faint)' }}>
        No check-ins in the last 7 days yet — your pulse line appears here as you go.
      </div>
    );
  }

  const pathPoints = [];
  points.forEach((p) => {
    if (p.jitter) {
      pathPoints.push({ x: p.x - 1.2, y: p.y - 8 });
      pathPoints.push({ x: p.x - 0.4, y: p.y + 6 });
      pathPoints.push({ x: p.x + 0.4, y: p.y - 5 });
    }
    pathPoints.push({ x: p.x, y: p.y });
  });

  const d = pathPoints.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = pathPoints[i - 1];
    const midX = (prev.x + p.x) / 2;
    return `${acc} Q ${midX} ${prev.y}, ${p.x} ${p.y}`;
  }, '');

  return (
    <div className="relative" style={{ height: 200 }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id="pulseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            {points.map((p, i) => (
              <stop key={i} offset={`${p.x}%`} stopColor={MOOD_COLOR[p.mood]} />
            ))}
          </linearGradient>
        </defs>
        <path d={d} fill="none" stroke="url(#pulseGrad)" strokeWidth="1.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>

      {points.map((p, i) => (
        <div
          key={i}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
          className="absolute w-3.5 h-3.5 rounded-full -translate-x-1/2 -translate-y-1/2 cursor-pointer"
          style={{ left: `${p.x}%`, top: `${p.y}%`, background: MOOD_COLOR[p.mood], border: '2px solid var(--card-bg)' }}
        />
      ))}

      {hover !== null && (
        <div
          className="absolute -translate-x-1/2 rounded-xl px-3 py-2 text-xs backdrop-blur-md z-10 whitespace-nowrap"
          style={{
            left: `${points[hover].x}%`,
            top: `${Math.max(points[hover].y - 22, 4)}%`,
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            boxShadow: '0 8px 20px -8px rgba(0,0,0,0.3)',
          }}
        >
          <div className="font-semibold">{points[hover].day.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
          <div style={{ color: 'var(--text-soft)' }}>{MOOD_LABEL[points[hover].mood]}</div>
          {points[hover].count > 1 && (
            <div style={{ color: 'var(--text-faint)' }}>{points[hover].count} check-ins, showing the most common</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { theme, mode, session, userName, moodHistory, signOut } = useMood();
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [savedTick, setSavedTick] = useState(false);

  useEffect(() => {
    if (!session) return;
    supabase
      .from('emergency_contacts')
      .select('contact_name, contact_email')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) { console.error('emergency contact load failed:', error.message); return; }
        if (data) {
          setContactName(data.contact_name || '');
          setContactEmail(data.contact_email || '');
        }
      });
  }, [session]);

  const saveEmergencyContact = async () => {
    if (!session || !contactName.trim() || !contactEmail.trim()) return;
    const { error } = await supabase.from('emergency_contacts').upsert({
      user_id: session.user.id,
      contact_name: contactName.trim(),
      contact_email: contactEmail.trim(),
      updated_at: new Date().toISOString(),
    });
    if (error) { console.error('emergency contact save failed:', error.message); return; }
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1800);
  };

  return (
    <div className="app app-shell flex flex-col" data-theme={theme} data-mode={mode}>
      <MoodBackground showCelestial={false} />
      <Header showBack onSignOut={() => { signOut(); navigate('/'); }} />

      <main className="relative z-10 flex-1 flex flex-col items-center px-6 py-10">
        <div className="w-full max-w-2xl">
          <button onClick={() => navigate(-1)} className="text-sm mb-6" style={{ color: 'var(--text-soft)' }}>← Back</button>

          <h1 className="text-3xl mb-8" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Profile</h1>

          <div className="rounded-3xl p-6 mb-6 backdrop-blur-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <div className="text-[11px] font-semibold tracking-[1.4px] uppercase mb-4" style={{ color: 'var(--accent-deep)' }}>Account</div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-semibold" style={{ background: 'var(--surface-strong)', border: '1px solid var(--card-border)' }}>
                {(userName || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-lg">{userName}</div>
                <div className="text-sm" style={{ color: 'var(--text-faint)' }}>{session?.user.email}</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl p-6 mb-6 backdrop-blur-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <div className="text-[11px] font-semibold tracking-[1.4px] uppercase mb-1" style={{ color: 'var(--accent-deep)' }}>Mood Insight</div>
            <p className="text-xs mb-4" style={{ color: 'var(--text-faint)' }}>Your last 7 days, as a pulse — hover any point.</p>
            <HeartbeatSpectrum moodHistory={moodHistory} />
            <button onClick={() => navigate('/mood-insights')} className="mt-3 text-xs font-semibold" style={{ color: 'var(--accent-deep)' }}>
              View full breakdown →
            </button>
          </div>

          <div className="rounded-3xl p-6 backdrop-blur-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <div className="text-[11px] font-semibold tracking-[1.4px] uppercase mb-2" style={{ color: 'var(--accent-deep)' }}>Emergency Contact</div>
            <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--text-faint)' }}>
              If high-risk language is detected in your chat, this person gets a real email alert — not a symbolic nudge. Different from Safe Circle, which is for gentle everyday support.
            </p>
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              onBlur={saveEmergencyContact}
              placeholder="Contact name (e.g. Maa, Rohan)"
              className="w-full text-[13px] rounded-xl px-3.5 py-2.5 outline-none mb-2"
              style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text)' }}
            />
            <input
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              onBlur={saveEmergencyContact}
              placeholder="their@email.com"
              type="email"
              className="w-full text-[13px] rounded-xl px-3.5 py-2.5 outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text)' }}
            />
            {savedTick && <div className="text-xs mt-2" style={{ color: 'var(--accent-deep)' }}>Saved ✓</div>}
          </div>
        </div>
      </main>

      <HelpButton />
    </div>
  );
}