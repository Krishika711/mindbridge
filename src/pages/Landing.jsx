import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import LampToggle from '../components/LampToggle';
import MoodBackground from '../components/MoodBackground';
import Header from '../components/Header';
import AuthModal from '../components/AuthModal';
import { PrimaryButton, SecondaryButton, LinkButton } from '../components/ui/Buttons';
import { HelpButton, MoodPicker } from '../components/ui/Misc';
import { useMood } from '../context/MoodContext';

export default function Landing() {
  const [lit, setLit] = useState(false);
  const [authModal, setAuthModal] = useState(null); // 'signin' | 'signup' | null
  const [typed, setTyped] = useState('');
  const navigate = useNavigate();
  const { theme, mode, setMood, continueAsGuest, message } = useMood();
  const typeTimer = useRef(null);

  useEffect(() => {
    if (!lit) return;
    clearInterval(typeTimer.current);
    setTyped('');
    let i = 0;
    typeTimer.current = setInterval(() => {
      setTyped(message.slice(0, i + 1));
      i++;
      if (i >= message.length) clearInterval(typeTimer.current);
    }, 28);
    return () => clearInterval(typeTimer.current);
  }, [message, lit]);

  const handlePickMood = (moodKey) => {
    setMood(moodKey);
  };

  const handleEnter = (guest = false) => {
    if (guest) continueAsGuest();
    navigate('/space');
  };

  if (!lit) {
    return <LampToggle onLit={() => setLit(true)} />;
  }

  return (
    <div className="app app-shell" data-theme={theme} data-mode={mode}>
      <MoodBackground />

      <Header
        right={<button onClick={() => navigate('/about')} className="text-[13px] px-5 py-[9px] rounded-full backdrop-blur-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text)' }}>About Us</button>}
      />

      <main className="relative z-10 flex-1 flex flex-col items-center text-center px-6 pt-6 pb-2">
        <div className="italic font-medium text-[26px] mb-1.5 opacity-85" style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-deep)' }}>
          MindBridge+
        </div>

        <h1
          className="max-w-[780px] mb-5"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'clamp(40px, 6vw, 64px)', lineHeight: 1.08, color: 'var(--text)' }}
        >
          A quiet space for your mind.
        </h1>
        <p className="max-w-[520px] text-[16px] leading-relaxed mb-5" style={{ color: 'var(--text-soft)' }}>
          Check in, reflect, and feel supported — at your own pace, in your own way.
        </p>
        <div className="italic text-[16px] min-h-[24px] mb-6 opacity-90" style={{ color: 'var(--accent-deep)', fontFamily: 'var(--font-display)' }}>
          <span style={{ borderRight: '1px solid var(--accent-deep)', paddingRight: 2 }}>{typed}</span>
        </div>

        <div className="w-full max-w-[360px] flex flex-col items-center gap-3">
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col items-center gap-3"
          >
            <PrimaryButton onClick={() => setAuthModal('signin')}>Sign In</PrimaryButton>
            <SecondaryButton onClick={() => setAuthModal('signup')}>Sign Up</SecondaryButton>
            <LinkButton onClick={() => handleEnter(true)}>Continue as Guest</LinkButton>
          </motion.div>
        </div>
      </main>

      <MoodPicker activeMood={theme === 'default' ? null : theme} onPick={handlePickMood} />

      <HelpButton />

      <AnimatePresence>
        {authModal && (
          <AuthModal
            mode={authModal}
            onClose={() => setAuthModal(null)}
            onSuccess={() => {
              setAuthModal(null);
              navigate('/space');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
