import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import MoodBackground from '../components/MoodBackground';
import Header from '../components/Header';
import { HelpButton } from '../components/ui/Misc';
import { useMood } from '../context/MoodContext';

const INPUT_TYPES = [
  { key: 'voice', icon: '🎙️', title: 'Yaps of today', desc: 'A quick unfiltered voice note, up to a minute.' },
  { key: 'text', icon: '📝', title: 'Gossip for the day', desc: 'Whatever is on your mind, no formal journaling pressure.' },
  { key: 'photo', icon: '📷', title: 'Photos you love', desc: 'A picture that makes you smile instantly.' },
  { key: 'letter', icon: '✉️', title: 'Something you wanna say', desc: 'A sealed letter to your future distressed self.', locked: true },
];

function RecordOverlay({ onClose, onSave }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [showCaption, setShowCaption] = useState(false);
  const [caption, setCaption] = useState('');
  const timerRef = useRef(null);

  const toggleRecord = () => {
    if (!recording) {
      setRecording(true);
      setShowCaption(false);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= 60) {
            clearInterval(timerRef.current);
            setRecording(false);
            setShowCaption(true);
            return 60;
          }
          return s + 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setRecording(false);
      setShowCaption(true);
    }
  };

  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl p-7 relative"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', backdropFilter: 'blur(16px)' }}
      >
        <button onClick={onClose} className="absolute top-4 right-5 text-sm" style={{ color: 'var(--text-faint)' }}>✕</button>
        <h3 className="text-lg mb-1" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Yaps of today</h3>
        <p className="text-xs mb-5" style={{ color: 'var(--text-faint)' }}>Raw and unfiltered. One minute, no re-takes.</p>

        <div className="flex flex-col items-center gap-3 py-2">
          <button
            onClick={toggleRecord}
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
            style={{ background: '#C0523A', color: '#fff', animation: recording ? 'lanternFlicker 1s ease-in-out infinite' : 'none' }}
          >
            {recording ? '■' : '●'}
          </button>
          <div className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-soft)' }}>{mm}:{ss}</div>
        </div>

        {showCaption && (
          <>
            <input
              autoFocus
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Give this yap a subtitle, like 'Passed that exam viva!'"
              className="w-full text-sm rounded-xl px-3.5 py-2.5 outline-none mt-4 mb-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text)' }}
            />
            <div className="flex gap-2.5">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-full text-sm font-semibold" style={{ border: '1px solid var(--card-border)', color: 'var(--text)' }}>Cancel</button>
              <button
                onClick={() => onSave(caption.trim() || 'Untitled yap')}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: 'var(--ink)', color: 'var(--ink-text)' }}
              >
                Save to tape
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

function TextOverlay({ title, hint, placeholder, cta, onClose, onSave }) {
  const [val, setVal] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl p-7 relative"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', backdropFilter: 'blur(16px)' }}
      >
        <button onClick={onClose} className="absolute top-4 right-5 text-sm" style={{ color: 'var(--text-faint)' }}>✕</button>
        <h3 className="text-lg mb-1" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{title}</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-faint)' }}>{hint}</p>
        <textarea
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={placeholder}
          className="w-full min-h-[110px] resize-none outline-none text-sm rounded-xl px-3.5 py-2.5 mb-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text)' }}
        />
        <div className="flex gap-2.5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-full text-sm font-semibold" style={{ border: '1px solid var(--card-border)', color: 'var(--text)' }}>Cancel</button>
          <button
            onClick={() => { if (val.trim()) onSave(val.trim()); }}
            className="flex-1 py-2.5 rounded-full text-sm font-semibold"
            style={{ background: 'var(--ink)', color: 'var(--ink-text)' }}
          >
            {cta}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function PhotoOverlay({ onClose, onSave }) {
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);
  const dateLabel = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl p-7 relative"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', backdropFilter: 'blur(16px)' }}
      >
        <button onClick={onClose} className="absolute top-4 right-5 text-sm" style={{ color: 'var(--text-faint)' }}>✕</button>
        <h3 className="text-lg mb-1" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Photos you love</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-faint)' }}>Turns into a proper polaroid, date-stamped automatically.</p>

        {!preview ? (
          <div
            onClick={() => fileRef.current?.click()}
            className="rounded-2xl p-8 text-center cursor-pointer text-sm mb-4"
            style={{ border: '2px dashed var(--card-border)', color: 'var(--text-faint)' }}
          >
            Tap to choose a photo
          </div>
        ) : (
          <div className="mx-auto mb-4 bg-white p-2.5 pb-6" style={{ width: 180, transform: 'rotate(-1.5deg)', boxShadow: '0 12px 26px -10px rgba(0,0,0,0.3)' }}>
            <div className="w-full aspect-square bg-cover bg-center" style={{ backgroundImage: `url(${preview})` }} />
            <div className="text-center mt-2 text-sm" style={{ fontFamily: 'var(--font-hand, cursive)', color: '#4a3c22' }}>{dateLabel}</div>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

        <div className="flex gap-2.5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-full text-sm font-semibold" style={{ border: '1px solid var(--card-border)', color: 'var(--text)' }}>Cancel</button>
          <button
            onClick={() => { if (preview) onSave(preview); }}
            className="flex-1 py-2.5 rounded-full text-sm font-semibold"
            style={{ background: 'var(--ink)', color: 'var(--ink-text)' }}
          >
            Save to tape
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function HopeVault() {
  const navigate = useNavigate();
  const { theme, mode, hopeTokens, addHopeToken } = useMood();
  const [unlocked, setUnlocked] = useState(false);
  const [openOverlay, setOpenOverlay] = useState(null); // null | 'voice' | 'text' | 'photo' | 'letter'
  const [session, setSessionParts] = useState({ voice: null, text: null, photo: null, letter: null });

  const sessionTitle = (() => {
    const parts = [];
    if (session.voice) parts.push(session.voice);
    if (session.text) parts.push(session.text.length > 24 ? session.text.slice(0, 24) + '…' : session.text);
    if (session.photo) parts.push('a photo');
    if (session.letter) parts.push('a sealed letter');
    return parts.length ? parts.join(' + ') : 'Untitled, so far';
  })();

  const hasAnyPart = !!(session.voice || session.text || session.photo || session.letter);

  const savePart = (key, value) => {
    setSessionParts((s) => ({ ...s, [key]: value }));
    setOpenOverlay(null);
  };

  const fileAway = () => {
    if (!hasAnyPart) return;
    addHopeToken({
      text: session.text || (session.letter ? null : null),
      voice: session.voice,
      photo: session.photo,
      letter: session.letter,
      date: 'Just now',
    });
    setSessionParts({ voice: null, text: null, photo: null, letter: null });
  };

  return (
    <div className="app app-shell flex flex-col" data-theme={theme} data-mode={mode}>
      <MoodBackground showCelestial={false} />
      <Header showBack showMoodSwitcher onSignOut={undefined} />

      <main className="relative z-10 flex-1 flex flex-col items-center px-6 py-10">
        <div className="w-full max-w-2xl">
          <button onClick={() => navigate(-1)} className="text-sm mb-6" style={{ color: 'var(--text-soft)' }}>← Back</button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: 'var(--ink)', color: 'var(--ink-text)' }}>💛</div>
            <h1 className="text-3xl" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Hope Vault</h1>
          </div>
          <p className="mb-8 max-w-lg" style={{ color: 'var(--text-soft)' }}>
            A secure drawer of your own good moments — dropped here by you, for your future self on a harder day.
          </p>

          <AnimatePresence mode="wait">
            {!unlocked ? (
              <motion.div
                key="locked"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="rounded-3xl p-10 flex flex-col items-center gap-5 text-center backdrop-blur-md"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
              >
                <div className="text-4xl">🔒</div>
                <p className="text-sm max-w-xs" style={{ color: 'var(--text-soft)' }}>
                  This space is locked with your biometric or passcode. Unlock it when you're ready to look, or to add something new.
                </p>
                <button
                  onClick={() => setUnlocked(true)}
                  className="px-7 py-3 rounded-full text-sm font-medium"
                  style={{ background: 'var(--ink)', color: 'var(--ink-text)' }}
                >
                  Unlock Vault
                </button>
              </motion.div>
            ) : (
              <motion.div key="unlocked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Today's tape — session builder */}
                <div className="rounded-2xl p-5 mb-4 backdrop-blur-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-[11px] font-semibold tracking-[1.4px] uppercase" style={{ color: 'var(--accent-deep)' }}>Today's tape</div>
                      <div className="italic text-lg mt-0.5" style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-deep)' }}>{sessionTitle}</div>
                    </div>
                    <div className="flex gap-1.5">
                      {['voice', 'text', 'photo', 'letter'].map((k) => (
                        <div
                          key={k}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                          style={{
                            background: session[k] ? 'var(--accent)' : 'var(--surface)',
                            border: '1px solid var(--card-border)',
                            opacity: session[k] ? 1 : 0.3,
                          }}
                        >
                          {{ voice: '🎙️', text: '✂️', photo: '📷', letter: '✉️' }[k]}
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs mb-3" style={{ color: 'var(--text-faint)' }}>
                    Add anything below — mix voice, text, or a photo into one tape, then file it away.
                  </p>
                  <button
                    onClick={fileAway}
                    disabled={!hasAnyPart}
                    className="w-full py-3 rounded-full text-sm font-semibold"
                    style={{ background: 'var(--ink)', color: 'var(--ink-text)', opacity: hasAnyPart ? 1 : 0.4 }}
                  >
                    File this tape away
                  </button>
                </div>

                {/* Input grid */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {INPUT_TYPES.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => !t.locked && setOpenOverlay(t.key)}
                      className="rounded-2xl p-4 text-center transition-transform hover:-translate-y-0.5"
                      style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', opacity: t.locked ? 0.6 : 1, cursor: t.locked ? 'default' : 'pointer' }}
                    >
                      <div className="w-11 h-11 rounded-full mx-auto mb-2 flex items-center justify-center text-xl" style={{ background: 'var(--surface-strong)', border: '1px solid var(--card-border)' }}>{t.icon}</div>
                      <div className="text-sm font-semibold mb-0.5" style={{ fontFamily: 'var(--font-display)' }}>{t.title}</div>
                      <div className="text-[11px]" style={{ color: 'var(--text-faint)' }}>{t.desc}</div>
                      {t.locked && <div className="text-[10px] mt-1.5" style={{ color: 'var(--accent-deep)' }}>Unseals only on a heavy day</div>}
                    </button>
                  ))}
                </div>

                {/* Filed tapes */}
                <div className="grid sm:grid-cols-2 gap-3">
                  {hopeTokens.map((t) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl p-5 backdrop-blur-md flex flex-col gap-3"
                      style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}
                    >
                      {t.photo && <img src={t.photo} alt="" className="w-full h-32 object-cover rounded-xl" />}
                      {t.text && (
                        <p className="italic text-[15px] leading-relaxed" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>"{t.text}"</p>
                      )}
                      {t.voice && (
                        <div className="text-sm flex items-center gap-1.5" style={{ color: 'var(--text-soft)' }}>🎙️ {t.voice}</div>
                      )}
                      {t.letter && (
                        <div className="text-sm flex items-center gap-1.5" style={{ color: 'var(--text-soft)' }}>✉️ Sealed letter</div>
                      )}
                      <div className="text-xs" style={{ color: 'var(--text-faint)' }}>{t.date}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {openOverlay === 'voice' && (
          <RecordOverlay onClose={() => setOpenOverlay(null)} onSave={(caption) => savePart('voice', caption)} />
        )}
        {openOverlay === 'text' && (
          <TextOverlay
            title="Gossip for the day"
            hint="This becomes a paper scrap tucked inside the liner notes."
            placeholder="Okay so today..."
            cta="Save to tape"
            onClose={() => setOpenOverlay(null)}
            onSave={(val) => savePart('text', val)}
          />
        )}
        {openOverlay === 'photo' && (
          <PhotoOverlay onClose={() => setOpenOverlay(null)} onSave={(dataUrl) => savePart('photo', dataUrl)} />
        )}
        {openOverlay === 'letter' && (
          <TextOverlay
            title="Something you wanna say"
            hint="Write to the version of you that might be struggling later. It stays sealed until a heavy day."
            placeholder="Dear future me..."
            cta="Seal and save"
            onClose={() => setOpenOverlay(null)}
            onSave={(val) => savePart('letter', val)}
          />
        )}
      </AnimatePresence>

      <HelpButton />
    </div>
  );
}