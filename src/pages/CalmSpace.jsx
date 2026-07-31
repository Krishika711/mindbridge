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
  { key: 'priority', label: '50-to-1 Filter' },
  { key: 'manifest', label: 'Manifestation Matrix' },
];

// Deliberately mild — everyday stress language only. Anything closer to real
// crisis language is already handled by the app's actual crisis-detection
// flow elsewhere; this is just a light, skippable, non-clinical nudge.
const STRESS_WORDS = ['stressed', 'stress', 'overwhelmed', 'anxious', 'exhausted', 'so tired', 'too much', "can't keep up", 'burnt out', 'burned out'];
function hasStressLanguage(text) {
  const lower = text.toLowerCase();
  return STRESS_WORDS.some((w) => lower.includes(w));
}

function priorityInstruction(count) {
  if (count > 30) return 'Look at everything you\u2019ve typed. Pop about 10 things you can easily live without doing this month.';
  if (count > 15) return 'Pop the ones that don\u2019t match your current energy.';
  if (count > 5) return 'Pop anything that isn\u2019t truly, fully yours.';
  if (count > 1) return 'You\u2019re close. Keep popping until only the one that matters most is left.';
  return null;
}

// Bobs gently in place, forever — only disappears when tapped. No auto-timer.
function Bubble({ id, text, onPop, tone, pastel }) {
  const [drift] = useState(() => ({
    x: Math.random() * 40 - 20,
    left: 8 + Math.random() * 78,
    top: 10 + Math.random() * 60,
    duration: 4 + Math.random() * 3,
  }));

  return (
    <motion.button
      onClick={() => onPop(id, drift)}
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
        background: { duration: 0.6 },
      }}
      className="absolute px-5 py-3 rounded-full text-sm max-w-55 text-left leading-snug"
      style={{
        left: `${drift.left}%`,
        top: `${drift.top}%`,
        background: pastel ? 'rgba(250, 210, 225, 0.6)' : tone === 'manifest' ? 'var(--accent)' : 'var(--surface-strong)',
        border: '1px solid var(--card-border)',
        color: 'var(--text)',
        boxShadow: '0 8px 24px -10px rgba(0,0,0,0.25)',
      }}
    >
      {text}
    </motion.button>
  );
}

// Small watercolor-ish splash of dots that fans out and fades where a bubble popped.
function PopSplash({ left, top }) {
  const particles = useState(() =>
    Array.from({ length: 7 }, (_, i) => ({
      id: i,
      angle: (i / 7) * Math.PI * 2 + Math.random() * 0.5,
      dist: 22 + Math.random() * 20,
      size: 4 + Math.random() * 5,
    }))
  )[0];

  return (
    <div className="absolute pointer-events-none" style={{ left: `${left}%`, top: `${top}%`, zIndex: 5 }}>
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{ opacity: 0.8, scale: 1, x: 0, y: 0 }}
          animate={{ opacity: 0, scale: 0.3, x: Math.cos(p.angle) * p.dist, y: Math.sin(p.angle) * p.dist }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="absolute rounded-full"
          style={{ width: p.size, height: p.size, background: 'var(--accent)' }}
        />
      ))}
    </div>
  );
}

function SmileOverlay({ countdown, onDismiss, total = 10 }) {
  const progress = countdown / total;
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center backdrop-blur-md" style={{ background: 'rgba(255,255,255,0.3)' }}>
      <div className="rounded-3xl px-8 py-7 flex flex-col items-center gap-4 text-center" style={{ background: 'var(--surface-strong)', border: '1px solid var(--card-border)', boxShadow: '0 20px 50px -20px rgba(0,0,0,0.3)', maxWidth: 300 }}>
        <div className="relative w-20 h-20 flex items-center justify-center">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: 'var(--accent)', opacity: 0.25 }}
            animate={{ scale: [1, 1.35, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(var(--accent-deep) ${(1 - progress) * 360}deg, transparent 0deg)`,
              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))',
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))',
              transition: 'background 0.9s linear',
            }}
          />
          <motion.div
            className="text-3xl relative"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            🙂
          </motion.div>
        </div>
        <div>
          <div className="text-[13.5px] font-medium leading-snug" style={{ color: 'var(--text)' }}>Try smiling, even a little — just for a few seconds.</div>
          <div className="text-[11px] mt-1" style={{ color: 'var(--text-faint)' }}>{countdown}s</div>
        </div>
        <button onClick={onDismiss} className="text-[11.5px]" style={{ color: 'var(--text-faint)' }}>Not now</button>
      </div>
    </div>
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

  const [priorityDraft, setPriorityDraft] = useState('');
  const [priorityBubbles, setPriorityBubbles] = useState([]);
  const [priorityPhase, setPriorityPhase] = useState('collect'); // 'collect' | 'eliminate' | 'done' | 'empty'
  const [corePillar, setCorePillar] = useState(null);
  const [pillarSaving, setPillarSaving] = useState(false);

  const [manifestDraft, setManifestDraft] = useState('');
  const [manifestBubbles, setManifestBubbles] = useState([]);
  const [placed, setPlaced] = useState([]);

  const [popEffects, setPopEffects] = useState([]);

  // Shared "smile trigger" behavior — mild stress language or fast typing
  // nudges a skippable pause. Fires at most once per visit to this page.
  const [smileTrigger, setSmileTrigger] = useState(false);
  const [smileCountdown, setSmileCountdown] = useState(10);
  const [pastelMode, setPastelMode] = useState(false);
  const smileShownRef = useRef(false);
  const keystrokeTimesRef = useRef([]);

  const checkFastTyping = () => {
    const now = Date.now();
    keystrokeTimesRef.current.push(now);
    keystrokeTimesRef.current = keystrokeTimesRef.current.filter((t) => now - t < 1500);
    return keystrokeTimesRef.current.length > 12; // sustained >8 keystrokes/sec over 1.5s
  };

  const maybeTriggerSmile = (text) => {
    if (smileShownRef.current || smileTrigger) return;
    if (checkFastTyping() || hasStressLanguage(text)) {
      smileShownRef.current = true;
      setSmileTrigger(true);
    }
  };

  useEffect(() => {
    if (!smileTrigger) return;
    setSmileCountdown(10);
    setPastelMode(true);
    const interval = setInterval(() => {
      setSmileCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          setSmileTrigger(false);
          setTimeout(() => setPastelMode(false), 1200);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [smileTrigger]);

  const dismissSmile = () => { setSmileTrigger(false); setPastelMode(false); };

  useEffect(() => {
    if (!session) return;
    supabase
      .from('notes')
      .select('id, text, source, created_at')
      .eq('user_id', session.user.id)
      .in('source', ['calm_space', 'manifestation', 'core_pillar'])
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

  const triggerSplash = (drift) => {
    const splashId = Date.now() + Math.random();
    setPopEffects((p) => [...p, { id: splashId, left: drift.left, top: drift.top }]);
    setTimeout(() => setPopEffects((p) => p.filter((s) => s.id !== splashId)), 600);
  };

  const spawnBubble = () => {
    const text = canvasDraft.trim();
    if (!text) return;
    maybeTriggerSmile(text);
    setBubbles((b) => [...b, { id: Date.now(), text }]);
    setCanvasDraft('');
  };
  const popBubble = (id, drift) => {
    playPop();
    triggerSplash(drift);
    setBubbles((b) => b.filter((x) => x.id !== id));
  };

  const spawnPriorityBubble = () => {
    if (priorityBubbles.length >= 50) return;
    const text = priorityDraft.trim();
    if (!text) return;
    maybeTriggerSmile(text);
    setPriorityBubbles((b) => [...b, { id: Date.now(), text }]);
    setPriorityDraft('');
  };

  const beginElimination = () => setPriorityPhase('eliminate');

  const popPriorityBubble = async (id) => {
    playPop();
    const remaining = priorityBubbles.filter((b) => b.id !== id);
    setPriorityBubbles(remaining);

    if (remaining.length === 0) {
      setPriorityPhase('empty');
      return;
    }
    if (remaining.length === 1) {
      setPriorityPhase('done');
      setCorePillar(remaining[0]);
    }
  };

  const saveCorePillar = async () => {
    if (!corePillar || !session) return;
    setPillarSaving(true);
    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id: session.user.id, text: corePillar.text, source: 'core_pillar' })
      .select('id, text, source, created_at')
      .single();
    setPillarSaving(false);
    if (error) { console.error('core pillar save failed:', error.message); return; }
    setEntries((e) => [data, ...e]);
  };

  const resetPriority = () => {
    setPriorityBubbles([]);
    setPriorityDraft('');
    setPriorityPhase('collect');
    setCorePillar(null);
  };

  const spawnManifestBubble = () => {
    if (placed.length >= 3) return;
    const text = manifestDraft.trim();
    if (!text) return;
    maybeTriggerSmile(text);
    setManifestBubbles((b) => [...b, { id: Date.now(), text }]);
    setManifestDraft('');
  };

  const resolveManifestBubble = async (id, drift) => {
    playPop();
    triggerSplash(drift);
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
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: 'var(--ink)', color: 'var(--ink-text)' }}>😌</div>
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
                {smileTrigger && <SmileOverlay countdown={smileCountdown} onDismiss={dismissSmile} />}
                <AnimatePresence>
                  {bubbles.map((b) => (
                    <Bubble key={b.id} id={b.id} text={b.text} onPop={popBubble} tone="canvas" pastel={pastelMode} />
                  ))}
                </AnimatePresence>
                {popEffects.map((s) => <PopSplash key={s.id} left={s.left} top={s.top} />)}
                <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center gap-2.5" style={{ borderTop: '1px solid var(--card-border)', background: 'var(--card-bg)' }}>
                  <input
                    value={canvasDraft}
                    onChange={(e) => { setCanvasDraft(e.target.value); maybeTriggerSmile(e.target.value); }}
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

          {tab === 'priority' && (
            <>
              {priorityPhase === 'collect' && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[15px] max-w-md" style={{ color: 'var(--text-soft)' }}>
                      Type out up to 50 things you think you want or need to do. No filtering yet — just get it all out.
                    </p>
                    <div className="text-xs px-2.5 py-1 rounded-full shrink-0" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text-faint)' }}>
                      {priorityBubbles.length} / 50
                    </div>
                  </div>
                  <div className="relative rounded-3xl overflow-hidden backdrop-blur-md p-5 flex flex-col" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', minHeight: 420 }}>
                    {smileTrigger && <SmileOverlay countdown={smileCountdown} onDismiss={dismissSmile} />}
                    <div className="flex flex-wrap gap-2 flex-1 content-start">
                      <AnimatePresence>
                        {priorityBubbles.map((b) => (
                          <motion.span
                            key={b.id}
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.4 }}
                            className="px-3.5 py-2 rounded-full text-[13px]"
                            style={{ background: 'var(--surface-strong)', border: '1px solid var(--card-border)', color: 'var(--text)' }}
                          >
                            {b.text}
                          </motion.span>
                        ))}
                      </AnimatePresence>
                      {priorityBubbles.length === 0 && (
                        <div className="text-xs" style={{ color: 'var(--text-faint)' }}>Nothing typed yet — start with whatever comes to mind first.</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 pt-3 mt-3" style={{ borderTop: '1px solid var(--card-border)' }}>
                      <input
                        value={priorityDraft}
                        onChange={(e) => { setPriorityDraft(e.target.value); maybeTriggerSmile(e.target.value); }}
                        onKeyDown={(e) => e.key === 'Enter' && spawnPriorityBubble()}
                        placeholder={priorityBubbles.length >= 50 ? "That's 50 — you're ready to narrow down" : 'Type something, then press enter…'}
                        disabled={priorityBubbles.length >= 50}
                        className="flex-1 bg-transparent outline-none border-none text-sm"
                        style={{ color: 'var(--text)' }}
                      />
                    </div>
                  </div>
                  {priorityBubbles.length > 0 && (
                    <button
                      onClick={beginElimination}
                      className="mt-4 px-6 py-2.5 rounded-full text-[13.5px] font-semibold"
                      style={{ background: 'var(--ink)', color: 'var(--ink-text)' }}
                    >
                      I'm ready — start narrowing down
                    </button>
                  )}
                </>
              )}

              {priorityPhase === 'eliminate' && (
                <>
                  <div className="flex items-center justify-between mb-2 gap-3">
                    <p className="text-[15px] max-w-md" style={{ color: 'var(--text-soft)' }}>
                      {priorityInstruction(priorityBubbles.length)}
                    </p>
                    <div className="text-xs px-2.5 py-1 rounded-full shrink-0" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text-faint)' }}>
                      {priorityBubbles.length} left
                    </div>
                  </div>
                  <div className="relative rounded-3xl overflow-hidden backdrop-blur-md p-5" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', minHeight: 420 }}>
                    {smileTrigger && <SmileOverlay countdown={smileCountdown} onDismiss={dismissSmile} />}
                    <div className="flex flex-wrap gap-2">
                      <AnimatePresence>
                        {priorityBubbles.map((b) => (
                          <motion.button
                            key={b.id}
                            onClick={() => popPriorityBubble(b.id)}
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.35 }}
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.25 }}
                            className="px-3.5 py-2 rounded-full text-[13px]"
                            style={{ background: pastelMode ? 'rgba(250, 210, 225, 0.6)' : 'var(--surface-strong)', border: '1px solid var(--card-border)', color: 'var(--text)' }}
                          >
                            {b.text}
                          </motion.button>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                </>
              )}

              {priorityPhase === 'done' && corePillar && (
                <div className="rounded-3xl p-10 flex flex-col items-center gap-4 text-center backdrop-blur-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                  <div className="text-[11px] font-bold tracking-[1.4px] uppercase" style={{ color: 'var(--accent-deep)' }}>Your Core Pillar</div>
                  <p className="italic text-2xl leading-relaxed max-w-md" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
                    {corePillar.text}
                  </p>
                  <p className="text-xs max-w-sm" style={{ color: 'var(--text-faint)' }}>
                    Everything else you typed got popped along the way. This is what was left.
                  </p>
                  <div className="flex gap-3 mt-2">
                    {session && (
                      <button onClick={saveCorePillar} disabled={pillarSaving} className="px-6 py-2.5 rounded-full text-[13.5px] font-semibold" style={{ background: 'var(--ink)', color: 'var(--ink-text)', opacity: pillarSaving ? 0.6 : 1 }}>
                        {pillarSaving ? 'Saving…' : 'Save this'}
                      </button>
                    )}
                    <button onClick={resetPriority} className="px-6 py-2.5 rounded-full text-[13.5px] font-semibold" style={{ border: '1px solid var(--card-border)', color: 'var(--text)' }}>
                      Start over
                    </button>
                  </div>
                </div>
              )}

              {priorityPhase === 'empty' && (
                <div className="rounded-3xl p-10 flex flex-col items-center gap-4 text-center backdrop-blur-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                  <p className="text-sm max-w-xs" style={{ color: 'var(--text-soft)' }}>
                    Looks like you popped everything — sometimes that's the answer too. Want to start fresh?
                  </p>
                  <button onClick={resetPriority} className="px-6 py-2.5 rounded-full text-[13.5px] font-semibold" style={{ background: 'var(--ink)', color: 'var(--ink-text)' }}>
                    Start over
                  </button>
                </div>
              )}
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
                {smileTrigger && <SmileOverlay countdown={smileCountdown} onDismiss={dismissSmile} />}
                <AnimatePresence>
                  {manifestBubbles.map((b) => (
                    <Bubble key={b.id} id={b.id} text={b.text} onPop={resolveManifestBubble} tone="manifest" pastel={pastelMode} />
                  ))}
                </AnimatePresence>
                {popEffects.map((s) => <PopSplash key={s.id} left={s.left} top={s.top} />)}

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
                    onChange={(e) => { setManifestDraft(e.target.value); maybeTriggerSmile(e.target.value); }}
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
                    {e.source === 'core_pillar' && (
                      <div className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-strong)', border: '1px solid var(--card-border)', color: 'var(--accent-deep)' }}>core pillar</div>
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