import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const MoodContext = createContext(null);

export const MOODS = [
  { key: 'joyful',  emoji: '☀️', label: 'Bright & Energized' },
  { key: 'neutral', emoji: '⛅', label: 'Calm & Balanced' },
  { key: 'anxious', emoji: '🌬️', label: 'Quiet & Reflective' },
  { key: 'sad',     emoji: '🌧️', label: 'Tense & Overwhelmed' },
  { key: 'numb',    emoji: '🌫️', label: 'Burnt Out & Unclear' },
];

const MOOD_MESSAGES = {
  default: "Take a moment, whenever you're ready.",
  joyful:  "Let this feeling stay a while.",
  neutral: "Steady is its own kind of good.",
  anxious: "Hey, slow down. You are doing completely fine.",
  sad:     "It's okay to just sit with this.",
  numb:    "No need to feel anything right now.",
};

const SEED_HOPE_TOKENS = [
  { id: 1, text: 'The morning I finally finished my thesis draft and just sat in silence, proud.', date: 'Feb 2026', image: null },
  { id: 2, text: "Priya told me I'm the calmest person she knows during a crisis. I want to remember that.", date: 'Apr 2026', image: null },
  { id: 3, text: 'Walked 6km along the river at sunset. No thoughts, just moving.', date: 'May 2026', image: null },
];

export function MoodProvider({ children }) {
  const [theme, setTheme] = useState('default');
  const [mode, setMode] = useState('light'); // 'light' | 'dark'
  const [moodHistory, setMoodHistory] = useState([]); // { mood, date }
  const [session, setSession] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [hopeTokens, setHopeTokens] = useState(SEED_HOPE_TOKENS);

  // Real Supabase session — same auth/db backend as before, only the UI changed.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) setIsGuest(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const isAuthed = !!session || isGuest;
  const userName = session
    ? (session.user.user_metadata?.full_name || session.user.email || 'Friend')
    : (isGuest ? 'Guest' : '');

  const addHopeToken = useCallback((text, image = null) => {
    setHopeTokens((prev) => [{ id: Date.now(), text, image, date: 'Just now' }, ...prev]);
  }, []);

  const setMood = useCallback((moodKey) => {
    setTheme(moodKey);
    setMoodHistory((prev) => [...prev, { mood: moodKey, date: new Date().toISOString() }]);
  }, []);

  const toggleMode = useCallback(() => {
    setMode((m) => (m === 'light' ? 'dark' : 'light'));
  }, []);

  // signIn/signUp talk to the real Supabase auth backend (unchanged tables/policies).
  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    setIsGuest(false);
  }, []);

  const signUp = useCallback(async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name?.trim() || '' } },
    });
    if (error) throw error;
    if (!data.session) {
      // Email confirmation ON in Supabase project — no session till link is clicked.
      return { needsConfirmation: true };
    }
    setIsGuest(false);
    return { needsConfirmation: false };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/space` },
    });
    if (error) throw error;
  }, []);

  const continueAsGuest = useCallback(() => {
    setIsGuest(true);
  }, []);

  const signOut = useCallback(async () => {
    if (session) await supabase.auth.signOut();
    setIsGuest(false);
  }, [session]);

  // consecutive "storm" (sad) days — drives the Stormy Mode Alert
  const stormyStreak = useMemo(() => {
    let streak = 0;
    for (let i = moodHistory.length - 1; i >= 0; i--) {
      if (moodHistory[i].mood === 'sad') streak++;
      else break;
    }
    return streak;
  }, [moodHistory]);

  const value = {
    theme, setTheme,
    mode, toggleMode,
    mood: theme,
    setMood,
    moodHistory,
    stormyStreak,
    message: MOOD_MESSAGES[theme] || MOOD_MESSAGES.default,
    isAuthed, isGuest, userName, authLoading, session,
    signIn, signUp, signInWithGoogle, continueAsGuest, signOut,
    hopeTokens, addHopeToken,
  };

  return <MoodContext.Provider value={value}>{children}</MoodContext.Provider>;
}

export function useMood() {
  const ctx = useContext(MoodContext);
  if (!ctx) throw new Error('useMood must be used within a MoodProvider');
  return ctx;
}
