import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MoodBackground from '../components/MoodBackground';
import Header from '../components/Header';
import { HelpButton } from '../components/ui/Misc';
import { useMood } from '../context/MoodContext';
import { supabase } from '../lib/supabaseClient';

function formatDateLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) {
    return `Today, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function CalmSpace() {
  const navigate = useNavigate();
  const { theme, mode, session, isGuest } = useMood();
  const [flowMode, setFlowMode] = useState(false);
  const [text, setText] = useState('');
  const [entries, setEntries] = useState([]);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!session) return;
    supabase
      .from('notes')
      .select('id, text, created_at')
      .eq('user_id', session.user.id)
      .eq('source', 'calm_space')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (error) { console.error('calm space entries load failed:', error.message); return; }
        setEntries(data || []);
      });
  }, [session]);

  const handleKeyDown = (e) => {
    if (flowMode && (e.key === 'Backspace' || e.key === 'Delete')) {
      e.preventDefault();
    }
  };

  const handleFinish = async () => {
    const trimmed = text.trim();
    setFlowMode(false);
    setText('');
    if (!trimmed) return;

    if (!session) return; // guest: nothing to save to, matches existing guest behavior elsewhere

    setSaving(true);
    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id: session.user.id, text: trimmed, source: 'calm_space' })
      .select('id, text, created_at')
      .single();
    setSaving(false);
    if (error) { console.error('calm space save failed:', error.message); return; }
    setEntries((e) => [data, ...e]);
  };

  return (
    <div className="app app-shell flex flex-col" data-theme={theme} data-mode={mode}>
      <MoodBackground showCelestial={false} />
      <Header showBack showMoodSwitcher />

      <main className="relative z-10 flex-1 flex flex-col items-center px-6 py-10">
        <div className="w-full max-w-2xl">
          <button onClick={() => navigate(-1)} className="text-sm mb-6" style={{ color: 'var(--text-soft)' }}>← Back</button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: 'var(--ink)', color: 'var(--ink-text)' }}>🌙</div>
            <h1 className="text-3xl" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Calm Space</h1>
          </div>
          <p className="mb-8 max-w-lg text-[15px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>
            Continuous Flow Mode is built for overthinking and writer's block. Once you turn it on, backspace is
            disabled — a pure, unfiltered release. When you finish, it's saved so you can look back on it later.
          </p>

          {!flowMode ? (
            <div className="rounded-3xl p-10 flex flex-col items-center gap-5 text-center backdrop-blur-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              <p className="text-sm max-w-xs" style={{ color: 'var(--text-soft)' }}>
                Ready to let it out without stopping to edit or judge?
              </p>
              <button
                onClick={() => { setFlowMode(true); setTimeout(() => textareaRef.current?.focus(), 50); }}
                className="px-7 py-3 rounded-full text-sm font-medium"
                style={{ background: 'var(--ink)', color: 'var(--ink-text)' }}
              >
                Start Continuous Flow
              </button>
            </div>
          ) : (
            <div className="rounded-3xl p-8 backdrop-blur-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              <div className="text-xs mb-4" style={{ color: 'var(--text-faint)' }}>Backspace is off. Just keep going.</div>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Start typing and don't stop…"
                className="w-full resize-none outline-none border-none bg-transparent italic text-xl leading-relaxed min-h-[220px]"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
              />
              <button
                onClick={handleFinish}
                disabled={saving}
                className="mt-4 px-6 py-2.5 rounded-full text-[13.5px] font-semibold"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text)', opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Saving…' : 'Release & Finish'}
              </button>
            </div>
          )}

          {!flowMode && (
            <div className="mt-10">
              <div className="text-[11px] font-bold tracking-[1.4px] uppercase mb-3" style={{ color: 'var(--accent-deep)' }}>Past Releases</div>
              {isGuest && (
                <div className="text-xs" style={{ color: 'var(--text-faint)' }}>Sign in to save and revisit what you write here.</div>
              )}
              {!isGuest && entries.length === 0 && (
                <div className="text-xs" style={{ color: 'var(--text-faint)' }}>Nothing released yet — it'll show up here once you do.</div>
              )}
              <div className="flex flex-col gap-2.5">
                {entries.map((e) => (
                  <div key={e.id} className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
                    <div className="text-xs mb-1.5" style={{ color: 'var(--text-faint)' }}>{formatDateLabel(e.created_at)}</div>
                    <p className="text-sm italic leading-relaxed" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
                      {e.text.length > 200 ? e.text.slice(0, 200) + '…' : e.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <HelpButton />
    </div>
  );
}