import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PrimaryButton, OAuthButton, LinkButton } from './ui/Buttons';
import { useMood } from '../context/MoodContext';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16}>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.6-2.5C16.9 3.4 14.7 2.4 12 2.4 6.9 2.4 2.7 6.6 2.7 11.9S6.9 21.4 12 21.4c6.9 0 8.8-4.8 8.8-7.3 0-.5-.05-.9-.13-1.3H12z" />
    </svg>
  );
}
function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16}>
      <path fill="currentColor" d="M16.5 1c.1 1.1-.3 2.2-1 3-.7.8-1.9 1.5-3 1.4-.1-1.1.4-2.2 1-2.9.8-.9 2-1.5 3-1.5zM20 17.2c-.5 1.2-1.1 2.3-1.9 3.4-1.1 1.5-2.2 3.1-4 3.1-1.7 0-2.2-1-4.1-1-2 0-2.6 1-4.2 1-1.7.1-3-1.6-4.1-3.1-2.3-3.2-4-9-1.7-13 1.1-2 3.1-3.2 5.2-3.3 1.6 0 3.2 1.1 4.1 1.1.9 0 2.8-1.3 4.7-1.1.8 0 3 .3 4.5 2.5-.1.1-2.7 1.6-2.6 4.7 0 3.7 3.2 4.9 3.2 4.9-.1.2-.5 1.7-1.1 2.8z" />
    </svg>
  );
}

// Real auth modal — same Supabase backend as before (signIn/signUp/signInWithGoogle
// from MoodContext), just restyled to match the NoCaps look & feel.
export default function AuthModal({ mode = 'signin', onClose, onSuccess }) {
  const { signIn, signUp, signInWithGoogle } = useMood();
  const [view, setView] = useState(mode); // 'signin' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const isSignup = view === 'signup';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!email.trim() || !password.trim()) {
      setError('Email aur password dono bharo.');
      return;
    }
    setLoading(true);
    try {
      if (isSignup) {
        const res = await signUp(email, password, name);
        if (res?.needsConfirmation) {
          setInfo('Account ban gaya! Email me confirmation link check karo.');
          setLoading(false);
          return;
        }
      } else {
        await signIn(email, password);
      }
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Kuch galat ho gaya. Dobara try karo.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign-in fail ho gaya.');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(20,18,14,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-[26px] p-7 backdrop-blur-md relative"
        style={{
          maxWidth: 380,
          background: 'var(--card-bg, rgba(255,255,255,0.9))',
          border: '1px solid var(--card-border, rgba(0,0,0,0.1))',
          boxShadow: '0 30px 70px -20px rgba(0,0,0,0.4)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
          style={{ background: 'var(--surface)', color: 'var(--text-soft)' }}
        >
          ✕
        </button>

        <h2 className="text-[22px] mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)', fontWeight: 600 }}>
          {isSignup ? 'Create your account' : 'Welcome back'}
        </h2>
        <p className="text-[13.5px] mb-5" style={{ color: 'var(--text-soft)' }}>
          {isSignup ? 'Start your quiet space journey.' : 'Sign in to MindBridge+'}
        </p>

        <div className="flex gap-2.5 mb-4">
          <OAuthButton icon={<GoogleIcon />} type="button" onClick={handleGoogle} disabled={loading}>
            Google
          </OAuthButton>
          <OAuthButton icon={<AppleIcon />} type="button" disabled title="Apple sign-in coming soon">
            Apple
          </OAuthButton>
        </div>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px" style={{ background: 'var(--card-border)' }} />
          <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>or continue with email</span>
          <div className="flex-1 h-px" style={{ background: 'var(--card-border)' }} />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
          <AnimatePresence>
            {isSignup && (
              <motion.input
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="w-full text-[13.5px] rounded-xl px-4 py-3 outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text)' }}
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </AnimatePresence>
          <input
            className="w-full text-[13.5px] rounded-xl px-4 py-3 outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text)' }}
            placeholder="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full text-[13.5px] rounded-xl px-4 py-3 outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text)' }}
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p style={{ color: '#c0524b', fontSize: 12 }}>{error}</p>}
          {info && <p style={{ color: 'var(--accent-deep)', fontSize: 12 }}>{info}</p>}

          <PrimaryButton type="submit" disabled={loading} className={loading ? 'opacity-70' : ''}>
            {loading ? 'Please wait...' : isSignup ? 'Create Account' : 'Sign In'}
          </PrimaryButton>
        </form>

        <p className="text-center text-[13px] mt-4" style={{ color: 'var(--text-soft)' }}>
          {isSignup ? 'Already have an account? ' : 'New here? '}
          <LinkButton type="button" onClick={() => { setView(isSignup ? 'signin' : 'signup'); setError(''); setInfo(''); }}>
            {isSignup ? 'Sign In' : 'Create Account'}
          </LinkButton>
        </p>
      </motion.div>
    </div>
  );
}
