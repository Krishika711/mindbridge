import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Gate shown to guest users the moment they try to actually write
 * (chat, journal, draw, voice note...). Guests can look around freely,
 * but creating content requires an account.
 */
export default function GuestSignInPrompt({ open, onClose }) {
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(10,12,20,0.45)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-sm rounded-3xl p-8 text-center backdrop-blur-2xl"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: '0 30px 80px -20px rgba(0,0,0,0.5)' }}
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-3xl mb-3">✍️</div>
            <p className="italic text-lg leading-relaxed mb-6" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
              Sign in to keep writing — your words deserve to be saved, not lost when you close the tab.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => navigate('/')}
                className="w-full py-3.5 rounded-full text-sm font-medium"
                style={{ background: 'var(--ink)', color: 'var(--ink-text)' }}
              >
                Sign In / Sign Up
              </button>
              <button
                onClick={onClose}
                className="w-full py-2 text-[13.5px] underline underline-offset-4"
                style={{ color: 'var(--text-soft)' }}
              >
                Keep browsing as guest
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
