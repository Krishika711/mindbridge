import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function BreathingBreak({ onDone }) {
  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <motion.div
        className="w-28 h-28 rounded-full"
        style={{ background: 'radial-gradient(circle, var(--glow), transparent 70%)', border: '1px solid var(--card-border)' }}
        animate={{ scale: [1, 1.35, 1.35, 1] }}
        transition={{ duration: 8, times: [0, 0.4, 0.6, 1], repeat: Infinity }}
      />
      <p className="text-sm" style={{ color: 'var(--text-soft)' }}>Breathe in… hold… breathe out. Just for a minute.</p>
      <button
        onClick={onDone}
        className="text-[13.5px] underline underline-offset-4"
        style={{ color: 'var(--accent-deep)' }}
      >
        I'm done, thank you
      </button>
    </div>
  );
}

/**
 * The Stormy Mode Alert: a low-pressure, frosted-glass check-in that
 * appears when someone has been logging distressed moods for several
 * consecutive days. Offers three paths, no pressure to pick any of them.
 */
export default function StormyAlert({ open, onClose }) {
  const [view, setView] = useState('offer'); // offer | breathing | talk

  const handleClose = () => {
    setView('offer');
    onClose?.();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(10,12,20,0.45)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-md rounded-3xl p-8 backdrop-blur-2xl"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: '0 30px 80px -20px rgba(0,0,0,0.5)' }}
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            {view === 'offer' && (
              <>
                <p
                  className="italic text-lg leading-relaxed mb-6"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
                >
                  Hey, we noticed it's been storming for a while. You don't have to carry it all alone today.
                </p>
                <div className="flex flex-col gap-2.5">
                  <button
                    onClick={() => setView('talk')}
                    className="w-full py-3.5 rounded-full text-sm font-medium"
                    style={{ background: 'var(--ink)', color: 'var(--ink-text)' }}
                  >
                    Talk to Someone
                  </button>
                  <button
                    onClick={() => setView('breathing')}
                    className="w-full py-3.5 rounded-full text-sm font-medium"
                    style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text)' }}
                  >
                    Take a Breathing Break
                  </button>
                  <button
                    onClick={handleClose}
                    className="w-full py-2 text-[13.5px] underline underline-offset-4"
                    style={{ color: 'var(--text-soft)' }}
                  >
                    Hide This
                  </button>
                </div>
              </>
            )}

            {view === 'talk' && (
              <>
                <p className="text-sm font-semibold mb-4" style={{ color: 'var(--accent-deep)' }}>You're not alone in this.</p>
                <div className="flex flex-col gap-2.5 mb-5">
                  <a href="tel:988" className="rounded-xl p-3.5 text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text)' }}>
                    <strong>988</strong> — Suicide &amp; Crisis Lifeline (call or text, 24/7)
                  </a>
                  <div className="rounded-xl p-3.5 text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text)' }}>
                    Or reach out to someone in your <strong>Safe Circle</strong> — they're only a tap away.
                  </div>
                </div>
                <button onClick={handleClose} className="w-full py-2 text-[13.5px] underline underline-offset-4" style={{ color: 'var(--text-soft)' }}>Close</button>
              </>
            )}

            {view === 'breathing' && (
              <>
                <BreathingBreak onDone={handleClose} />
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
