import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMood } from '../context/MoodContext';

const TOUGH_MOODS = ['sad', 'numb', 'anxious'];

/**
 * A gentle floating button that shows up when the current mood is a hard
 * one. Tapping it "unlocks" a quick, no-navigation overlay of the person's
 * own saved Hope Vault tokens — their own good moments, surfaced back to them.
 */
export default function FloatingHope() {
  const { theme, hopeTokens } = useMood();
  const [open, setOpen] = useState(false);

  if (!TOUGH_MOODS.includes(theme)) return null;

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed bottom-[22px] left-[22px] z-20 flex items-center gap-2 pl-3.5 pr-4 py-2.5 rounded-full backdrop-blur-md text-[13px] font-semibold cursor-pointer"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text)', boxShadow: '0 10px 30px -12px var(--glow)' }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, boxShadow: ['0 10px 30px -12px var(--glow)', '0 10px 40px -8px var(--glow)', '0 10px 30px -12px var(--glow)'] }}
        transition={{ boxShadow: { duration: 3, repeat: Infinity }, default: { duration: 0.4 } }}
      >
        <span>🔓</span> A little hope
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(10,12,20,0.5)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-3xl p-7 backdrop-blur-2xl"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: '0 30px 80px -20px rgba(0,0,0,0.5)' }}
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="italic text-lg leading-relaxed mb-5" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
                A little reminder from you, to you.
              </p>
              <div className="flex flex-col gap-3">
                {hopeTokens.slice(0, 6).map((t) => (
                  <div key={t.id} className="rounded-2xl p-4 flex gap-3 items-start" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
                    {t.image && <img src={t.image} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />}
                    <p className="text-[14.5px] leading-relaxed" style={{ color: 'var(--text)' }}>{t.text}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-full mt-6 py-3 rounded-full text-sm font-medium"
                style={{ background: 'var(--ink)', color: 'var(--ink-text)' }}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
