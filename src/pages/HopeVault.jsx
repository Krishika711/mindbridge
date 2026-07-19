import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import MoodBackground from '../components/MoodBackground';
import Header from '../components/Header';
import { HelpButton } from '../components/ui/Misc';
import { useMood } from '../context/MoodContext';
import { supabase } from '../lib/supabaseClient';

const INPUT_TYPES = [
  { key: 'voice', icon: '🎙️', title: 'Yaps of today', desc: 'A quick unfiltered voice note, up to a minute.' },
  { key: 'text', icon: '📝', title: 'Gossip for the day', desc: 'Whatever is on your mind, no formal journaling pressure.' },
  { key: 'photo', icon: '📷', title: 'Photos you love', desc: 'A picture that makes you smile instantly.' },
  { key: 'letter', icon: '✉️', title: 'Something you wanna say', desc: 'A sealed letter to your future distressed self.', locked: true },
];

function formatDateLabel(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

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
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);
  const dateLabel = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(f);
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
            onClick={() => { if (file) onSave(file); }}
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
  const { theme, mode, session, isGuest } = useMood();
  const [unlocked, setUnlocked] = useState(false);
  const [openOverlay, setOpenOverlay] = useState(null);
  const [session_, setSessionParts] = useState({ voice: null, text: null, photoFile: null, photoPreview: null, letter: null });
  const [tapes, setTapes] = useState([]);
  const [filing, setFiling] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadTapes = async () => {
    if (!session) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('hope_vault_tapes')
      .select('id, voice_caption, text_scrap, photo_path, letter, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setLoading(false);
    if (error) { console.error('tapes load failed:', error.message); return; }

    const resolved = await Promise.all(
      (data || []).map(async (t) => {
        let photoUrl = null;
        if (t.photo_path) {
          const { data: signed, error: signErr } = await supabase.storage.from('media').createSignedUrl(t.photo_path, 3600);
          if (signErr) console.error('tape photo signed url failed:', signErr.message);
          else photoUrl = signed.signedUrl;
        }
        return {
          id: t.id,
          voice: t.voice_caption,
          text: t.text_scrap,
          photo: photoUrl,
          photoPath: t.photo_path,
          letter: t.letter,
          date: formatDateLabel(t.created_at),
        };
      })
    );
    setTapes(resolved);
  };

  useEffect(() => { loadTapes(); }, [session]);

  const sessionTitle = (() => {
    const parts = [];
    if (session_.voice) parts.push(session_.voice);
    if (session_.text) parts.push(session_.text.length > 24 ? session_.text.slice(0, 24) + '…' : session_.text);
    if (session_.photoPreview) parts.push('a photo');
    if (session_.letter) parts.push('a sealed letter');
    return parts.length ? parts.join(' + ') : 'Untitled, so far';
  })();

  const hasAnyPart = !!(session_.voice || session_.text || session_.photoPreview || session_.letter);

  const savePart = (key, value) => {
    if (key === 'photo') {
      setSessionParts((s) => ({ ...s, photoFile: value.file, photoPreview: value.preview }));
    } else {
      setSessionParts((s) => ({ ...s, [key]: value }));
    }
    setOpenOverlay(null);
  };

  const fileAway = async () => {
    if (!hasAnyPart || filing) return;
    setFiling(true);

    if (!session) {
      // Guest: no persistence, matches every other guest-mode feature in the app
      setTapes((t) => [
        { id: Date.now(), voice: session_.voice, text: session_.text, photo: session_.photoPreview, letter: session_.letter, date: 'Just now' },
        ...t,
      ]);
      setSessionParts({ voice: null, text: null, photoFile: null, photoPreview: null, letter: null });
      setFiling(false);
      return;
    }

    let photoPath = null;
    if (session_.photoFile) {
      photoPath = `${session.user.id}/hope-photo-${Date.now()}.png`;
      const { error: uploadErr } = await supabase.storage.from('media').upload(photoPath, session_.photoFile, { contentType: session_.photoFile.type });
      if (uploadErr) { console.error('tape photo upload failed:', uploadErr.message); photoPath = null; }
    }

    const { data, error } = await supabase
      .from('hope_vault_tapes')
      .insert({
        user_id: session.user.id,
        voice_caption: session_.voice,
        text_scrap: session_.text,
        photo_path: photoPath,
        letter: session_.letter,
      })
      .select('id, created_at')
      .single();

    setFiling(false);
    if (error) { console.error('tape save failed:', error.message); return; }

    setTapes((t) => [
      { id: data.id, voice: session_.voice, text: session_.text, photo: session_.photoPreview, photoPath, letter: session_.letter, date: formatDateLabel(data.created_at) },
      ...t,
    ]);
    setSessionParts({ voice: null, text: null, photoFile: null, photoPreview: null, letter: null });
  };

  const deleteTape = async (tape) => {
    setTapes((t) => t.filter((x) => x.id !== tape.id));
    if (!session) return;
    if (tape.photoPath) {
      const { error: storageErr } = await supabase.storage.from('media').remove([tape.photoPath]);
      if (storageErr) console.error('tape photo delete failed:', storageErr.message);
    }
    const { error } = await supabase.from('hope_vault_tapes').delete().eq('id', tape.id);
    if (error) console.error('tape delete failed:', error.message);
  };

  return (
    <div className="app app-shell flex flex-col" data-theme={theme} data-mode={mode}>
      <MoodBackground showCelestial={false} />
      <Header showBack showMoodSwitcher />

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
                <div className="rounded-2xl p-5 mb-4 backdrop-blur-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-[11px] font-semibold tracking-[1.4px] uppercase" style={{ color: 'var(--accent-deep)' }}>Today's tape</div>
                      <div className="italic text-lg mt-0.5" style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-deep)' }}>{sessionTitle}</div>
                    </div>
                    <div className="flex gap-1.5">
                      {['voice', 'text', 'photoPreview', 'letter'].map((k) => (
                        <div
                          key={k}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                          style={{ background: session_[k] ? 'var(--accent)' : 'var(--surface)', border: '1px solid var(--card-border)', opacity: session_[k] ? 1 : 0.3 }}
                        >
                          {{ voice: '🎙️', text: '✂️', photoPreview: '📷', letter: '✉️' }[k]}
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs mb-3" style={{ color: 'var(--text-faint)' }}>
                    Add anything below — mix voice, text, or a photo into one tape, then file it away.
                  </p>
                  <button
                    onClick={fileAway}
                    disabled={!hasAnyPart || filing}
                    className="w-full py-3 rounded-full text-sm font-semibold"
                    style={{ background: 'var(--ink)', color: 'var(--ink-text)', opacity: hasAnyPart && !filing ? 1 : 0.4 }}
                  >
                    {filing ? 'Filing…' : 'File this tape away'}
                  </button>
                </div>

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

                {loading && <p className="text-sm text-center" style={{ color: 'var(--text-faint)' }}>Loading your vault…</p>}

                <div className="grid sm:grid-cols-2 gap-3">
                  {tapes.map((t) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="group relative rounded-2xl p-5 backdrop-blur-md flex flex-col gap-3"
                      style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}
                    >
                      <button
                        onClick={() => { if (window.confirm('Once deleted, this snippet cannot be recovered.')) deleteTape(t); }}
                        className="absolute top-3 right-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: '#C0523A' }}
                      >
                        Delete
                      </button>
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
          <PhotoOverlay onClose={() => setOpenOverlay(null)} onSave={(file) => {
            const reader = new FileReader();
            reader.onload = () => savePart('photo', { file, preview: reader.result });
            reader.readAsDataURL(file);
          }} />
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