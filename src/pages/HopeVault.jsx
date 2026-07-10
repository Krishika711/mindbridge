import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import MoodBackground from '../components/MoodBackground';
import Header from '../components/Header';
import { HelpButton } from '../components/ui/Misc';
import { useMood } from '../context/MoodContext';

export default function HopeVault() {
  const navigate = useNavigate();
  const { theme, mode, hopeTokens, addHopeToken } = useMood();
  const [unlocked, setUnlocked] = useState(false);
  const [draft, setDraft] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleImagePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const addToken = () => {
    if (!draft.trim() && !imagePreview) return;
    addHopeToken(draft.trim() || 'A good moment, saved without words.', imagePreview);
    setDraft('');
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
                <div className="rounded-2xl p-5 mb-6 backdrop-blur-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                  <div className="text-[11px] font-semibold tracking-[1.4px] uppercase mb-3" style={{ color: 'var(--accent-deep)' }}>
                    Drop a Hope Token
                  </div>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="A proud moment, a happy memory, a reminder of your worth…"
                    className="w-full resize-none outline-none border-none bg-transparent text-[15px] leading-relaxed min-h-[80px]"
                    style={{ color: 'var(--text)' }}
                  />
                  {imagePreview && (
                    <div className="relative inline-block mt-2">
                      <img src={imagePreview} alt="" className="h-24 rounded-xl object-cover" />
                      <button
                        onClick={() => { setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-xs flex items-center justify-center"
                        style={{ background: 'var(--ink)', color: 'var(--ink-text)' }}
                      >✕</button>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 mt-3">
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImagePick} className="hidden" id="hope-image-input" />
                    <label
                      htmlFor="hope-image-input"
                      className="px-4 py-2 rounded-full text-[13px] font-semibold cursor-pointer"
                      style={{ border: '1px solid var(--card-border)', background: 'var(--surface)', color: 'var(--text)' }}
                    >
                      📷 Add Photo
                    </label>
                    <button
                      onClick={addToken}
                      className="px-5 py-2.5 rounded-full text-[13.5px] font-semibold"
                      style={{ background: 'var(--ink)', color: 'var(--ink-text)' }}
                    >
                      Save to Vault
                    </button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {hopeTokens.map((t) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl p-5 backdrop-blur-md flex flex-col gap-3"
                      style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}
                    >
                      {t.image && <img src={t.image} alt="" className="w-full h-32 object-cover rounded-xl" />}
                      <p className="italic text-[15px] leading-relaxed" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
                        "{t.text}"
                      </p>
                      <div className="text-xs" style={{ color: 'var(--text-faint)' }}>{t.date}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <HelpButton />
    </div>
  );
}
