import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
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

const MODES = [
  { key: 'flow', label: 'Continuous Flow' },
  { key: 'canvas', label: 'Blank Canvas' },
  { key: 'manifest', label: 'Manifestation Matrix' },
];

// Bobs gently in place, forever — only disappears when tapped. No auto-timer.
function Bubble({ id, text, onPop, tone }) {
  const [drift] = useState(() => ({
    x: Math.random() * 40 - 20,
    left: 8 + Math.random() * 78,
    top: 10 + Math.random() * 60,
    duration: 4 + Math.random() * 3,
  }));

  return (
    <motion.button
      onClick={() => onPop(id)}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: [0, -18, 0],
        x: [0, drift.x, 0],
      }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{
        opacity: { duration: 0.4 },
        scale: { duration: 0.4 },
        y: { duration: drift.duration, repeat: Infinity, ease: 'easeInOut' },
        x: { duration: drift.duration * 1.3, repeat: Infinity, ease: 'easeInOut' },
      }}
      className="absolute px-5 py-3 rounded-full text-sm max-w-55 text-left leading-snug"
      style={{
        left: `${drift.left}%`,
        top: `${drift.top}%`,
        background: tone === 'manifest' ? 'var(--accent)' : 'var(--surface-strong)',
        border: '1px solid var(--card-border)',
        color: 'var(--text)',
        boxShadow: '0 8px 24px -10px rgba(0,0,0,0.25)',
      }}
    >
      {text}
    </motion.button>
  );
}

export default function CalmSpace() {
  const navigate = useNavigate();
  const { theme, mode, session, isGuest } = useMood();
  const [tab, setTab] = useState('flow');

  const [flowActive, setFlowActive] = useState(false);
  const [flowText, setFlowText] = useState('');
  const [flowSaving, setFlowSaving] = useState(false);
  const [entries, setEntries] = useState([]);
  const textareaRef = useRef(null);

  const [canvasDraft, setCanvasDraft] = useState('');
  const [bubbles, setBubbles] = useState([]);

  const [manifestDraft, setManifestDraft] = useState('');
  const [manifestBubbles, setManifestBubbles] = useState([]);
  const [placed, setPlaced] = useState([]);

  useEffect(() => {
    if (!session) return;
    supabase
      .from('notes')
      .select('id, text, source, created_at')
      .eq('user_id', session.user.id)
      .in('source', ['calm_space', 'manifestation'])
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (error) { console.error('calm space entries load failed:', error.message); return; }
        setEntries(data || []);
      });
  }, [session]);

  // Synthesized pop sound — created fresh per pop since browsers require
  // AudioContext to originate from a real user interaction (the tap itself).
  const playPop = () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  };

  const handleFlowKeyDown = (e) => {
    if (flowActive && (e.key === 'Backspace' || e.key === 'Delete')) e.preventDefault();
  };

  const handleFlowFinish = async () => {
    const trimmed = flowText.trim();
    setFlowActive(false);
    setFlowText('');
    if (!trimmed || !session) return;
    setFlowSaving(true);
    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id: session.user.id, text: trimmed, source: 'calm_space' })
      .select('id, text, source, created_at')
      .single();
    setFlowSaving(false);
    if (error) { console.error('calm space save failed:', error.message); return; }
    setEntries((e) => [data, ...e]);
  };

  const spawnBubble = () => {
    const text = canvasDraft.trim();
    if (!text) return;
    setBubbles((b) => [...b, { id: Date.now(), text }]);
    setCanvasDraft('');
  };
  const popBubble = (id) => {
    playPop();
    setBubbles((b) => b.filter((x) => x.id !== id));
  };

  const spawnManifestBubble = () => {
    if (placed.length >= 3) return;
    const text = manifestDraft.trim();
    if (!text) return;
    setManifestBubbles((b) => [...b, { id: Date.now(), text }]);
    setManifestDraft('');
  };

  const resolveManifestBubble = async (id) => {
    playPop();
    const bubble = manifestBubbles.find((b) => b.id === id);
    setManifestBubbles((b) => b.filter((x) => x.id !== id));
    if (!bubble) return;

    setPlaced((p) => [...p, bubble]);
    if (session) {
      const { data, error } = await supabase
        .from('notes')
        .insert({ user_id: session.user.id, text: bubble.text, source: 'manifestation' })
        .select('id, text, source, created_at')
        .single();
      if (error) { console.error('manifestation save failed:', error.message); return; }
      setEntries((e) => [data, ...e]);
    }
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

          <div className="flex gap-2 mb-6 flex-wrap">
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => setTab(m.key)}
                className="px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold"
                style={
                  tab === m.key
                    ? { background: 'var(--ink)', color: 'var(--ink-text)' }
                    : { border: '1px solid var(--card-border)', color: 'var(--text-soft)' }
                }
              >
                {m.label}
              </button>
            ))}
          </div>

          {tab === 'flow' && (
            <>
              <p className="mb-6 max-w-lg text-[15px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>
                Backspace is disabled once you start — a pure, unfiltered release. Saved when you finish.
              </p>
              {!flowActive ? (
                <div className="rounded-3xl p-10 flex flex-col items-center gap-5 text-center backdrop-blur-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                  <p className="text-sm max-w-xs" style={{ color: 'var(--text-soft)' }}>Ready to let it out without stopping to edit or judge?</p>
                  <button
                    onClick={() => { setFlowActive(true); setTimeout(() => textareaRef.current?.focus(), 50); }}
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
                    value={flowText}
                    onChange={(e) => setFlowText(e.target.value)}
                    onKeyDown={handleFlowKeyDown}
                    placeholder="Start typing and don't stop…"
                    className="w-full resize-none outline-none border-none bg-transparent italic text-xl leading-relaxed min-h-[220px]"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
                  />
                  <button
                    onClick={handleFlowFinish}
                    disabled={flowSaving}
                    className="mt-4 px-6 py-2.5 rounded-full text-[13.5px] font-semibold"
                    style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text)', opacity: flowSaving ? 0.6 : 1 }}
                  >
                    {flowSaving ? 'Saving…' : 'Release & Finish'}
                  </button>
                </div>
              )}
            </>
          )}

          {tab === 'canvas' && (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[15px]" style={{ color: 'var(--text-soft)' }}>Type a thought, press enter, watch it float.</p>
                <div className="text-xs px-2.5 py-1 rounded-full shrink-0" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text-faint)' }}>
                  {bubbles.length} bubble{bubbles.length === 1 ? '' : 's'}
                </div>
              </div>
              <div className="relative rounded-3xl overflow-hidden backdrop-blur-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', height: 420 }}>
                <AnimatePresence>
                  {bubbles.map((b) => (
                    <Bubble key={b.id} id={b.id} text={b.text} onPop={popBubble} tone="canvas" />
                  ))}
                </AnimatePresence>
                <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center gap-2.5" style={{ borderTop: '1px solid var(--card-border)', background: 'var(--card-bg)' }}>
                  <input
                    value={canvasDraft}
                    onChange={(e) => setCanvasDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && spawnBubble()}
                    placeholder="Type what's on your mind, then press enter…"
                    className="flex-1 bg-transparent outline-none border-none text-sm"
                    style={{ color: 'var(--text)' }}
                  />
                </div>
                <div className="absolute bottom-16 left-0 right-0 text-center text-xs" style={{ color: 'var(--text-faint)' }}>
                  bubbles float here until you tap one away
                </div>
              </div>
              <p className="text-xs mt-3" style={{ color: 'var(--text-faint)' }}>
                Nothing here is saved — that's the point. It's meant to pass through, not stay.
              </p>
            </>
          )}

          {tab === 'manifest' && (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[15px]" style={{ color: 'var(--text-soft)' }}>
                  Write 3 present-tense affirmations. Tap each bubble to send it to your dashboard.
                </p>
                <div className="text-xs px-2.5 py-1 rounded-full shrink-0" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text-faint)' }}>
                  {placed.length} / 3 placed
                </div>
              </div>
              <div className="relative rounded-3xl overflow-hidden backdrop-blur-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', height: 420 }}>
                <AnimatePresence>
                  {manifestBubbles.map((b) => (
                    <Bubble key={b.id} id={b.id} text={b.text} onPop={resolveManifestBubble} tone="manifest" />
                  ))}
                </AnimatePresence>

                <div className="absolute top-4 right-4 w-52 rounded-2xl p-3.5" style={{ background: 'var(--surface-strong)', border: '1px solid var(--card-border)' }}>
                  <div className="text-xs font-bold mb-1.5" style={{ color: 'var(--accent-deep)' }}>✨ Manifestation Dashboard</div>
                  {placed.length === 0 ? (
                    <div className="text-[11px]" style={{ color: 'var(--text-faint)' }}>Nothing placed yet.</div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {placed.map((p) => (
                        <div key={p.id} className="text-[11px] leading-snug" style={{ color: 'var(--text)' }}>• {p.text}</div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center gap-2.5" style={{ borderTop: '1px solid var(--card-border)', background: 'var(--card-bg)' }}>
                  <input
                    value={manifestDraft}
                    onChange={(e) => setManifestDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && spawnManifestBubble()}
                    placeholder={placed.length >= 3 ? 'All 3 placed for today ✨' : 'e.g. I am completely capable of handling today…'}
                    disabled={placed.length >= 3}
                    className="flex-1 bg-transparent outline-none border-none text-sm"
                    style={{ color: 'var(--text)' }}
                  />
                </div>
                <div className="absolute bottom-16 left-0 right-0 text-center text-xs" style={{ color: 'var(--text-faint)' }}>
                  bubbles float here — tap one to place it on your dashboard
                </div>
              </div>
            </>
          )}

          <div className="mt-10">
            <div className="text-[11px] font-bold tracking-[1.4px] uppercase mb-3" style={{ color: 'var(--accent-deep)' }}>Past Releases</div>
            {isGuest && <div className="text-xs" style={{ color: 'var(--text-faint)' }}>Sign in to save and revisit what you write here.</div>}
            {!isGuest && entries.length === 0 && (
              <div className="text-xs" style={{ color: 'var(--text-faint)' }}>Nothing saved yet — Continuous Flow releases and placed affirmations show up here.</div>
            )}
            <div className="flex flex-col gap-2.5">
              {entries.map((e) => (
                <div key={e.id} className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="text-xs" style={{ color: 'var(--text-faint)' }}>{formatDateLabel(e.created_at)}</div>
                    {e.source === 'manifestation' && (
                      <div className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--accent)', color: 'var(--ink)' }}>✨ affirmation</div>
                    )}
                  </div>
                  <p className="text-sm italic leading-relaxed" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
                    {e.text.length > 200 ? e.text.slice(0, 200) + '…' : e.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <HelpButton />
    </div>
  );
}