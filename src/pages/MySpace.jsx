import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import emailjs from 'emailjs-com';
import MoodBackground from '../components/MoodBackground';
import Header from '../components/Header';
import { HelpButton } from '../components/ui/Misc';
import { useMood } from '../context/MoodContext';
import { supabase } from '../lib/supabaseClient';
import StormyAlert from '../components/StormyAlert';
import GuestSignInPrompt from '../components/GuestSignInPrompt';
import DrawCanvas from '../components/DrawCanvas';
import VoiceNotes from '../components/VoiceNotes';
import FloatingHope from '../components/FloatingHope';

async function claudeScore(messages) {
  const history = messages.map((m) => `${m.from === 'user' ? 'User' : 'AI'}: ${m.text}`).join('\n');
  try {
    const res = await fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history }),
    });
    if (!res.ok) throw new Error(`score failed ${res.status}`);
    return await res.json();
  } catch {
    return { crisis_risk: 0, theme: 'okay', needs_alert: false };
  }
}

async function claudeRespond(messages) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error(`chat failed ${res.status}`);
  const data = await res.json();
  return data.text;
}

async function sendEmergencyAlert(contactName, contactEmail, userName, triggerMessage, riskLevel) {
  emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY);
  return emailjs.send(
    import.meta.env.VITE_EMAILJS_SERVICE_ID,
    import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
    {
      to_name: contactName,
      to_email: contactEmail,
      user_name: userName || 'Someone you care about',
      message: triggerMessage,
      risk_level: riskLevel,
      app_name: 'MindBridge+',
    }
  );
}

// Turns a raw created_at timestamp into "Today" / "Yesterday" / "Jun 30"
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

const DEFAULT_GREETING = [
  { from: 'wisp', text: "Hello, I'm Wisp. How are you feeling today?" },
];

const FEATURES = [
  { key: 'hope-vault', label: 'Hope Vault', path: '/hope-vault', icon: '💛' },
  { key: 'safe-circle', label: 'Safe Circle', path: '/safe-circle', icon: '🤝' },
  { key: 'mood-insights', label: 'Mood Insights', path: '/mood-insights', icon: '📈' },
  { key: 'calm-space', label: 'Calm Space', path: '/calm-space', icon: '🌙' },
];

function PhotoRow({ small = false, photos, onAdd, onRemove }) {
  const size = small ? 'w-11 h-11' : 'aspect-square';
  const inputId = `photo-input-${small ? 'small' : 'main'}`;

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => onAdd(reader.result);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  return (
    <div className={small ? 'flex gap-2.5 flex-wrap' : 'grid grid-cols-4 gap-2.5'}>
      {photos.map((src, i) => (
        <div key={i} className={`${size} rounded-xl relative overflow-hidden group`} style={{ border: '1px solid var(--card-border)' }}>
          <img src={src} alt="" className="w-full h-full object-cover" />
          <button
            onClick={() => onRemove(i)}
            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
            aria-label="Remove photo"
          >✕</button>
        </div>
      ))}
      <input id={inputId} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
      <label
        htmlFor={inputId}
        className={`${size} rounded-xl flex items-center justify-center cursor-pointer text-xl flex-shrink-0`}
        style={{ border: '1.5px dashed var(--card-border)', color: 'var(--accent-deep)' }}
      >
        +
      </label>
    </div>
  );
}

function GuestLockedPane({ label, onUnlock }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 rounded-2xl text-center p-8" style={{ background: 'var(--surface)', border: '1px dashed var(--card-border)' }}>
      <div className="text-2xl">🔒</div>
      <p className="text-sm max-w-xs" style={{ color: 'var(--text-soft)' }}>{label}</p>
      <button onClick={onUnlock} className="px-5 py-2 rounded-full text-[13px] font-semibold" style={{ background: 'var(--ink)', color: 'var(--ink-text)' }}>
        Sign In
      </button>
    </div>
  );
}

export default function MySpace() {
  const navigate = useNavigate();
  const { theme, mode, mood, userName, isGuest, session, signOut, stormyStreak } = useMood();
  const [responding, setResponding] = useState(true);
  const [journalTab, setJournalTab] = useState('write');
  const [thread, setThread] = useState(DEFAULT_GREETING);
  const [historyItems, setHistoryItems] = useState([]);
  const [draft, setDraft] = useState('');
  const [journal, setJournal] = useState('');
  const [showStormy, setShowStormy] = useState(false);
  const [showGuestGate, setShowGuestGate] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [thinking, setThinking] = useState(false);
  const [crisisVisible, setCrisisVisible] = useState(false);
  const [alertSent, setAlertSent] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const threadEndRef = useRef(null);

  // Load real chat history + emergency contact once we know who's logged in
  useEffect(() => {
    if (!session) return;

    supabase
      .from('messages')
      .select('from_role, text, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) { console.error('messages load failed:', error.message); return; }
        if (data && data.length > 0) {
          setThread(data.map((m) => ({ from: m.from_role === 'user' ? 'user' : 'wisp', text: m.text })));

          // Build the History sidebar: one entry per calendar day, using that
          // day's first user message as the snippet.
          const byDay = new Map();
          data.forEach((m) => {
            if (m.from_role !== 'user') return;
            const dayKey = new Date(m.created_at).toDateString();
            if (!byDay.has(dayKey)) byDay.set(dayKey, m);
          });
          const items = Array.from(byDay.values())
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5)
            .map((m) => ({
              date: formatDateLabel(m.created_at),
              snippet: m.text.length > 60 ? m.text.slice(0, 60) + '…' : m.text,
            }));
          setHistoryItems(items);
        }
      });

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
    if (error) console.error('emergency contact save failed:', error.message);
  };

  const addPhoto = (src) => {
    if (isGuest) { setShowGuestGate(true); return; }
    setPhotos((p) => [...p, src]);
  };
  const removePhoto = (i) => setPhotos((p) => p.filter((_, idx) => idx !== i));

  const guardGuestWrite = (nextValue) => {
    if (isGuest && nextValue.length === 1) {
      setShowGuestGate(true);
      return false;
    }
    return true;
  };

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  useEffect(() => {
    if (stormyStreak >= 3) setShowStormy(true);
  }, [stormyStreak]);

  const saveMessage = async (fromRole, text) => {
    if (!session) return; // guests: local only, matches existing guest behavior elsewhere
    const { error } = await supabase.from('messages').insert({
      user_id: session.user.id,
      from_role: fromRole,
      text,
    });
    if (error) console.error('message save failed:', error.message);
  };

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text) return;
    const nextThread = [...thread, { from: 'user', text }];
    setThread(nextThread);
    setDraft('');
    setThinking(true);
    await saveMessage('user', text);
    try {
      const [reply, score] = await Promise.all([
        claudeRespond(nextThread),
        claudeScore(nextThread),
      ]);
      setThread((t) => [...t, { from: 'wisp', text: reply }]);
      await saveMessage('ai', reply);
      if (score?.needs_alert && score.crisis_risk >= 7) {
        setCrisisVisible(true);
        if (contactName && contactEmail) {
          try {
            await sendEmergencyAlert(contactName, contactEmail, userName, text, score.crisis_risk);
            setAlertSent(true);
          } catch { /* silent — never block the person's experience on email failure */ }
        }
      }
    } catch {
      setThread((t) => [...t, { from: 'wisp', text: "I'm having trouble connecting right now, par main yahin hoon. Try again in a moment?" }]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="app app-shell flex flex-col" data-theme={theme} data-mode={mode}>
      <MoodBackground showCelestial={false} />

      <Header
        onSignOut={() => { signOut(); navigate('/'); }}
        showMoodSwitcher
        right={
          <button
            onClick={() => setResponding((r) => !r)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full text-[12.5px] font-semibold cursor-pointer"
            style={
              responding
                ? { background: 'var(--ink)', color: 'var(--ink-text)' }
                : { background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text)' }
            }
          >
            <span className="w-6 h-3.5 rounded-full relative flex-shrink-0" style={{ background: responding ? 'rgba(255,255,255,0.25)' : 'var(--card-border)' }}>
              <span
                className="absolute top-0.5 w-2.5 h-2.5 rounded-full transition-transform"
                style={{ background: responding ? 'var(--ink-text)' : 'var(--accent-deep)', left: 2, transform: responding ? 'translateX(10px)' : 'translateX(0)' }}
              />
            </span>
            {responding ? 'Responding' : 'Quiet'}
          </button>
        }
      />

      <div className="relative z-10 px-9 -mt-2 mb-1 text-sm" style={{ color: 'var(--text-soft)' }}>
        Welcome back, {userName || 'Friend'} · feeling <span style={{ color: 'var(--accent-deep)', fontWeight: 600 }}>{mood}</span> today
      </div>

      <main className={`relative z-10 flex-1 grid gap-5 p-6 px-9 min-h-0 ${responding ? 'md:grid-cols-[1.7fr_1fr]' : 'md:grid-cols-[320px_1fr]'} grid-cols-1`}>
        <section
          className="flex flex-col rounded-[22px] p-6 backdrop-blur-md"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: '0 20px 50px -30px rgba(80,50,10,0.3)' }}
        >
          {crisisVisible && (
            <div
              className="flex items-start justify-between gap-3 rounded-2xl px-4 py-3 mb-3.5 text-[12.5px] leading-relaxed"
              style={{ background: 'var(--surface-strong)', border: '1px solid var(--card-border)', color: 'var(--text-soft)' }}
            >
              <span>
                🌙 Yeh pal bohot bhaari lag raha hai — aur ye bilkul valid hai. Tum akele nahi ho is mein.
                {alertSent && contactName && (
                  <span style={{ color: 'var(--accent-deep)' }}> · {contactName} ko quietly inform kar diya gaya hai.</span>
                )}
              </span>
              <button onClick={() => setCrisisVisible(false)} style={{ color: 'var(--text-faint)' }}>✕</button>
            </div>
          )}

          {responding ? (
            <div className="text-[11.5px] font-bold tracking-[1.4px] uppercase mb-4" style={{ color: 'var(--accent-deep)' }}>
              Chat with Wisp
            </div>
          ) : (
            <div className="mb-3.5">
              <div className="text-xs font-bold tracking-[1.2px]" style={{ color: 'var(--accent-deep)' }}>WISP</div>
              <div className="text-sm italic mt-0.5" style={{ color: 'var(--text-soft)' }}>Quiet mode — chat paused.</div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto flex flex-col gap-3 py-1.5 pr-1 min-h-[160px]">
            {thread.map((m, i) => (
              <div
                key={i}
                className={`max-w-[82%] px-4 py-3.5 rounded-2xl text-[14.5px] leading-relaxed ${m.from === 'user' ? 'self-end rounded-br-sm' : 'self-start rounded-bl-sm'}`}
                style={
                  m.from === 'wisp'
                    ? { background: 'var(--surface-strong)', border: '1px solid var(--card-border)' }
                    : responding
                      ? { background: 'var(--ink)', color: 'var(--ink-text)' }
                      : { background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text)' }
                }
              >
                {m.text}
              </div>
            ))}
            {thinking && (
              <div className="self-start px-4 py-3.5 rounded-2xl rounded-bl-sm text-[13.5px]" style={{ background: 'var(--surface-strong)', border: '1px solid var(--card-border)', color: 'var(--text-soft)' }}>
                soch raha hoon...
              </div>
            )}
            <div ref={threadEndRef} />
          </div>

          {responding ? (
            <div className="flex items-center gap-2.5 mt-3.5 rounded-full pl-4 pr-1.5 py-1.5" style={{ background: 'var(--surface-strong)', border: '1px solid var(--card-border)' }}>
              <input
                value={draft}
                onChange={(e) => { if (guardGuestWrite(e.target.value)) setDraft(e.target.value); }}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Write something..."
                className="flex-1 bg-transparent outline-none border-none text-sm"
                style={{ color: 'var(--text)' }}
              />
              <button
                onClick={sendMessage}
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--ink)', color: 'var(--ink-text)' }}
                aria-label="Send"
              >
                <svg viewBox="0 0 24 24" width={15} height={15} fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z" /></svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setResponding(true)}
              className="mt-4 w-full py-3.5 rounded-full font-semibold text-sm"
              style={{ background: 'var(--ink)', color: 'var(--ink-text)' }}
            >
              Go Back to Responding Mode
            </button>
          )}
        </section>

        <AnimatePresence mode="wait">
          {responding ? (
            <motion.section
              key="side"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="rounded-[22px] p-6 flex flex-col gap-6 overflow-y-auto backdrop-blur-md"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: '0 20px 50px -30px rgba(80,50,10,0.3)' }}
            >
              <div>
                <div className="text-[11.5px] font-bold tracking-[1.4px] uppercase mb-4" style={{ color: 'var(--accent-deep)' }}>History</div>
                {historyItems.length === 0 && (
                  <div className="text-xs" style={{ color: 'var(--text-faint)' }}>
                    {isGuest ? 'Sign in to save your chat history.' : 'Your conversations will show up here.'}
                  </div>
                )}
                {historyItems.map((h, i) => (
                  <div key={i} className="rounded-2xl p-3.5 mb-2.5 cursor-pointer transition-transform hover:-translate-y-0.5" style={{ background: 'var(--surface-strong)', border: '1px solid var(--card-border)' }}>
                    <div className="text-xs mb-1" style={{ color: 'var(--text-faint)' }}>{h.date}</div>
                    <div className="text-sm font-medium">{h.snippet}</div>
                  </div>
                ))}
              </div>

              <div>
                <div className="text-[11.5px] font-bold tracking-[1.4px] uppercase mb-4" style={{ color: 'var(--accent-deep)' }}>Add Photos</div>
                <PhotoRow photos={photos} onAdd={addPhoto} onRemove={removePhoto} />
              </div>

              <div>
                <div className="text-[11.5px] font-bold tracking-[1.4px] uppercase mb-2.5" style={{ color: 'var(--accent-deep)' }}>Emergency Contact</div>
                <p className="text-xs mb-2.5 leading-relaxed" style={{ color: 'var(--text-faint)' }}>
                  Agar high-risk detect ho — inhe ek gentle email jaayegi. No details shared.
                </p>
                <input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  onBlur={saveEmergencyContact}
                  placeholder="Contact name (e.g. Maa, Rohan)"
                  className="w-full text-[12.5px] rounded-xl px-3.5 py-2.5 outline-none mb-2"
                  style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text)' }}
                />
                <input
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  onBlur={saveEmergencyContact}
                  placeholder="their@email.com"
                  type="email"
                  className="w-full text-[12.5px] rounded-xl px-3.5 py-2.5 outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text)' }}
                />
              </div>

              <div>
                <div className="text-[11.5px] font-bold tracking-[1.4px] uppercase mb-4" style={{ color: 'var(--accent-deep)' }}>Explore More Features</div>
                <div className="grid grid-cols-2 gap-2.5">
                  {FEATURES.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => navigate(f.path)}
                      className="flex items-center gap-2.5 p-3.5 rounded-xl text-[13.5px] font-semibold cursor-pointer transition-all hover:-translate-y-0.5"
                      style={{ background: 'var(--surface-strong)', border: '1px solid var(--card-border)' }}
                    >
                      <span>{f.icon}</span>{f.label}
                      <span className="ml-auto opacity-40">›</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.section>
          ) : (
            <motion.section
              key="journal"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="rounded-[22px] p-8 flex flex-col backdrop-blur-md"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: '0 20px 50px -30px rgba(80,50,10,0.3)' }}
            >
              <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
                <div>
                  <div className="text-[11.5px] font-bold tracking-[1.4px] uppercase mb-1.5" style={{ color: 'var(--accent-deep)' }}>Journal</div>
                  <div className="italic font-semibold text-2xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-deep)' }}>
                    {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
                <div className="flex gap-2">
                  {[
                    { key: 'write', label: '✍️ Write' },
                    { key: 'draw', label: '🎨 Draw' },
                    { key: 'voice', label: '🎙️ Voice' },
                  ].map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setJournalTab(t.key)}
                      className="px-3.5 py-2 rounded-full text-[12.5px] font-semibold"
                      style={
                        journalTab === t.key
                          ? { background: 'var(--ink)', color: 'var(--ink-text)' }
                          : { border: '1px solid var(--card-border)', background: 'var(--surface)', color: 'var(--text)' }
                      }
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 min-h-[220px] flex flex-col">
                {journalTab === 'write' && (
                  <textarea
                    value={journal}
                    onChange={(e) => { if (guardGuestWrite(e.target.value)) setJournal(e.target.value); }}
                    placeholder="Start writing… this space is yours. No pressure, no judgment."
                    className="flex-1 resize-none outline-none border-none bg-transparent italic text-xl leading-relaxed min-h-[200px]"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
                  />
                )}
                {journalTab === 'draw' && (
                  isGuest ? <GuestLockedPane onUnlock={() => setShowGuestGate(true)} label="Sign in to save your drawings" /> : <DrawCanvas />
                )}
                {journalTab === 'voice' && (
                  isGuest ? <GuestLockedPane onUnlock={() => setShowGuestGate(true)} label="Sign in to record voice notes" /> : <VoiceNotes />
                )}
              </div>

              {journalTab === 'write' && (
                <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: '1px solid var(--card-border)' }}>
                  <PhotoRow small photos={photos} onAdd={addPhoto} onRemove={removePhoto} />
                  <button onClick={() => setResponding(true)} className="text-[13.5px] font-semibold" style={{ color: 'var(--accent-deep)' }}>
                    Explore Features
                  </button>
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <HelpButton />
      <FloatingHope />

      <StormyAlert open={showStormy} onClose={() => setShowStormy(false)} />
      <GuestSignInPrompt open={showGuestGate} onClose={() => setShowGuestGate(false)} />
    </div>
  );
}