import { useState } from 'react';
import { MOODS, useMood } from '../../context/MoodContext';

const HELP_SECTIONS = [
  {
    title: 'Chat with Wisp',
    body: "Talk any time, about anything. Wisp isn't a script — it reacts like a companion who's actually listening.",
    Icon: (p) => <svg {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  },
  {
    title: 'Mood check-in',
    body: 'Log how you\u2019re feeling in a few seconds. Every check-in feeds your Mood Insights over time.',
    Icon: (p) => <svg {...p}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" /></svg>,
  },
  {
    title: 'Journal \u2014 Quiet Mode',
    body: 'Pause the chat and write, draw, or record a voice note, just for yourself.',
    Icon: (p) => <svg {...p}><path d="M4 6h16M4 12h10M4 18h13" /></svg>,
  },
  {
    title: 'Hope Vault',
    body: 'Save a memory, a photo, a voice note, or a letter \u2014 something to look back on.',
    Icon: (p) => <svg {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7.5a4 4 0 0 1 8 0V11" /></svg>,
  },
  {
    title: 'Mood Insights',
    body: 'See your week as a spectrum, plus an AI report generated automatically every Monday.',
    Icon: (p) => <svg {...p}><path d="M4 19V10M10 19V5M16 19v-7M22 19V3" /></svg>,
  },
  {
    title: 'History',
    body: 'Everything you\u2019ve saved \u2014 written, drawn, recorded, or photographed \u2014 kept in one place.',
    Icon: (p) => <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.2 2" /></svg>,
  },
  {
    title: 'SafeCircle',
    body: 'Choose someone you trust. If things ever get hard, they\u2019re quietly notified so you\u2019re not alone in it.',
    Icon: (p) => <svg {...p}><path d="M12 2 4 5v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5z" /></svg>,
  },
];

export function HelpButton() {
  const [open, setOpen] = useState(false);
  const iconProps = { viewBox: '0 0 24 24', width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5.5 right-5.5 z-20 w-9.5 h-9.5 rounded-full backdrop-blur-md cursor-pointer font-semibold"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text)' }}
        aria-label="Help"
      >
        ?
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl p-6"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>About MindBridge+</div>
              <button onClick={() => setOpen(false)} className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0" style={{ color: 'var(--text-faint)' }}>✕</button>
            </div>
            <p className="text-xs mb-5 leading-relaxed" style={{ color: 'var(--text-faint)' }}>
              A quiet space built for college life — here's what's inside and how to use it.
            </p>

            <div className="flex flex-col gap-4">
              {HELP_SECTIONS.map((s) => (
                <div key={s.title} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--accent-deep)' }}>
                    <s.Icon {...iconProps} />
                  </div>
                  <div>
                    <div className="text-[13.5px] font-semibold mb-0.5" style={{ color: 'var(--text)' }}>{s.title}</div>
                    <div className="text-[12.5px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>{s.body}</div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center text-xs italic mt-6 pt-4" style={{ borderTop: '1px solid var(--card-border)', color: 'var(--text-faint)', fontFamily: 'var(--font-display)' }}>
              No streaks. No scores. Just a space that's yours.
            </p>
          </div>
        </div>
      )}
    </>
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