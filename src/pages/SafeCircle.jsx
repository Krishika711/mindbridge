import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MoodBackground from '../components/MoodBackground';
import Header from '../components/Header';
import { HelpButton } from '../components/ui/Misc';
import { useMood } from '../context/MoodContext';

const SEED_CIRCLE = [
  { id: 1, name: 'Priya N.', role: 'Best friend', status: 'Available' },
  { id: 2, name: 'Arjun K.', role: 'Brother', status: 'Busy' },
  { id: 3, name: 'Dr. Mehta', role: 'Therapist', status: 'Available' },
];

export default function SafeCircle() {
  const navigate = useNavigate();
  const { theme, mode } = useMood();
  const [circle] = useState(SEED_CIRCLE);
  const [reachedOut, setReachedOut] = useState(null);

  const reachOut = (person) => {
    setReachedOut(person.id);
    setTimeout(() => setReachedOut(null), 2200);
  };

  return (
    <div className="app app-shell flex flex-col" data-theme={theme} data-mode={mode}>
      <MoodBackground showCelestial={false} />
      <Header showBack showMoodSwitcher />

      <main className="relative z-10 flex-1 flex flex-col items-center px-6 py-10">
        <div className="w-full max-w-2xl">
          <button onClick={() => navigate(-1)} className="text-sm mb-6" style={{ color: 'var(--text-soft)' }}>← Back</button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: 'var(--ink)', color: 'var(--ink-text)' }}>🤝</div>
            <h1 className="text-3xl" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Safe Circle</h1>
          </div>
          <p className="mb-2" style={{ color: 'var(--text-soft)' }}>Your trusted support network</p>
          <p className="mb-8 max-w-lg text-[15px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>
            Designate up to five people you trust completely. In difficult moments, reach out directly from the app. Your
            Safe Circle receives a gentle nudge — no alarm, no panic — just a quiet signal that you could use company.
          </p>

          <div className="rounded-3xl p-6 backdrop-blur-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <div className="text-[11px] font-semibold tracking-[1.4px] uppercase mb-4" style={{ color: 'var(--accent-deep)' }}>
              YOUR CIRCLE ({circle.length} OF 5)
            </div>

            <div className="flex flex-col gap-3">
              {circle.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-2xl p-4"
                  style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full" style={{ background: 'var(--card-border)' }} />
                    <div>
                      <div className="font-semibold text-[15px]">{p.name}</div>
                      <div className="text-xs" style={{ color: 'var(--text-faint)' }}>{p.role}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => reachOut(p)}
                    disabled={p.status !== 'Available'}
                    className="text-xs font-semibold px-3.5 py-1.5 rounded-full transition-opacity"
                    style={{
                      background: p.status === 'Available' ? 'var(--ink)' : 'transparent',
                      color: p.status === 'Available' ? 'var(--ink-text)' : 'var(--text-faint)',
                      border: p.status === 'Available' ? 'none' : '1px solid var(--card-border)',
                      cursor: p.status === 'Available' ? 'pointer' : 'default',
                    }}
                  >
                    {reachedOut === p.id ? 'Signal sent ✓' : p.status}
                  </button>
                </div>
              ))}
            </div>

            {circle.length < 5 && (
              <button
                className="mt-4 flex items-center gap-2 text-sm font-medium"
                style={{ color: 'var(--accent-deep)' }}
              >
                <span className="text-lg leading-none">+</span> Add person
              </button>
            )}
          </div>
        </div>
      </main>

      <HelpButton />
    </div>
  );
}
