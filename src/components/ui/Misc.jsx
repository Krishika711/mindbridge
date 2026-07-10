import { useState } from 'react';
import { MOODS, useMood } from '../../context/MoodContext';

export function HelpButton() {
  return (
    <button
      className="fixed bottom-[22px] right-[22px] z-20 w-[38px] h-[38px] rounded-full backdrop-blur-md cursor-pointer font-semibold"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text)' }}
      aria-label="Help"
    >
      ?
    </button>
  );
}

export function MoodPicker({ onPick, activeMood, label = 'HOW ARE YOU FEELING RIGHT NOW?' }) {
  return (
    <section
      className="relative z-10 mx-auto mt-8 rounded-[22px] backdrop-blur-md p-6"
      style={{ width: 'min(920px, 92%)', background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: '0 20px 50px -20px rgba(0,0,0,0.25)' }}
    >
      <div className="text-[11px] font-semibold tracking-[1.6px] mb-3.5" style={{ color: 'var(--text-soft)' }}>
        {label}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {MOODS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => onPick?.(m.key)}
            className="relative flex flex-col items-center gap-2 py-4 px-1.5 rounded-2xl cursor-pointer transition-all duration-300 hover:-translate-y-1 group"
            style={{
              border: `1px solid ${activeMood === m.key ? 'var(--accent-deep)' : 'var(--card-border)'}`,
              background: activeMood === m.key ? 'var(--surface-strong)' : 'var(--surface)',
              boxShadow: activeMood === m.key ? '0 0 0 2px var(--accent-deep) inset, 0 8px 20px -10px var(--accent-deep)' : 'none',
            }}
          >
            <span className="text-2xl leading-none">{m.emoji}</span>
            <span
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[10.5px] font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
            >
              {m.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function useCurrentMoodMeta() {
  const { theme } = useMood();
  return MOODS.find((m) => m.key === theme) || null;
}

/**
 * Compact dropdown for changing mood/theme from anywhere post-login —
 * lives in the Header so it's always one tap away.
 */
export function MoodSwitcher() {
  const { theme, setMood } = useMood();
  const [open, setOpen] = useState(false);
  const current = MOODS.find((m) => m.key === theme);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-9 h-9 rounded-full flex items-center justify-center text-base cursor-pointer backdrop-blur-md"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        aria-label="Change mood"
      >
        {current ? current.emoji : '🎨'}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-11 z-40 rounded-2xl p-3 backdrop-blur-md flex flex-col gap-1"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: '0 20px 50px -20px rgba(0,0,0,0.35)', minWidth: 190 }}
          >
            <div className="text-[10.5px] font-semibold tracking-[1.2px] uppercase px-2 pb-1" style={{ color: 'var(--text-faint)' }}>
              Change mood
            </div>
            {MOODS.map((m) => (
              <button
                key={m.key}
                onClick={() => { setMood(m.key); setOpen(false); }}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm text-left"
                style={{ background: theme === m.key ? 'var(--surface)' : 'transparent', color: 'var(--text)' }}
              >
                <span>{m.emoji}</span>{m.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
