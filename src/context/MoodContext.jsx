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

const MOOD_SCORES = { joyful: 9, neutral: 6, anxious: 4, sad: 2, numb: 3 };

const MOOD_MESSAGES = {
  default: "Take a moment, whenever you're ready.",
  joyful:  "Let this feeling stay a while.",
  neutral: "Steady is its own kind of good.",
  anxious: "Hey, slow down. You are doing completely fine.",
  sad:     "It's okay to just sit with this.",
  numb:    "No need to feel anything right now.",
};

const SEED_HOPE_TOKENS = [
  { id: 'seed-1', text: 'The morning I finally finished my thesis draft and just sat in silence, proud.', voice: null, photo: null, letter: null, date: 'Feb 2026' },
  { id: 'seed-2', text: "Priya told me I'm the calmest person she knows during a crisis. I want to remember that.", voice: null, photo: null, letter: null, date: 'Apr 2026' },
  { id: 'seed-3', text: 'Walked 6km along the river at sunset. No thoughts, just moving.', voice: null, photo: null, letter: null, date: 'May 2026' },
];

export function MoodProvider({ children }) {
  const [theme, setTheme] = useState('default');
  const [mode, setMode] = useState('light');
  const [moodHistory, setMoodHistory] = useState([]);
  const [session, setSession] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [hopeTokens, setHopeTokens] = useState(SEED_HOPE_TOKENS);

  useEffect(() => {
    // Google Sign-In redirect lands here with #access_token=...&refresh_token=...
    // Supabase reads this into the session automatically — this just cleans the
    // visible URL/history afterward, the token itself was never sent to any server.
    if (window.location.hash.includes('access_token')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

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

  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data: latest, error: latestErr } = await supabase
        .from('mood_logs').select('mood, created_at').eq('user_id', session.user.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (latestErr) console.error('mood fetch failed:', latestErr.message);
      if (latest) setTheme(latest.mood);

      const { data: rows, error: rowsErr } = await supabase
        .from('mood_logs').select('mood, created_at').eq('user_id', session.user.id).order('created_at', { ascending: true });
      if (rowsErr) console.error('mood history fetch failed:', rowsErr.message);
      if (rows) setMoodHistory(rows.map((r) => ({ mood: r.mood, date: r.created_at })));
    })();
  }, [session]);

  // Real Hope Vault tapes — this is what FloatingHope.jsx and HopeVault.jsx both read.
  const loadHopeTokens = useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from('hope_vault_tapes')
      .select('id, voice_caption, text_scrap, photo_path, letter, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    if (error) { console.error('hope vault load failed:', error.message); return; }

    const resolved = await Promise.all((data || []).map(async (t) => {
      let photoUrl = null;
      if (t.photo_path) {
        const { data: signed, error: signErr } = await supabase.storage.from('media').createSignedUrl(t.photo_path, 3600);
        if (signErr) console.error('hope vault photo url failed:', signErr.message);
        else photoUrl = signed.signedUrl;
      }
      return {
        id: t.id,
        text: t.text_scrap,
        voice: t.voice_caption,
        photo: photoUrl,
        photoPath: t.photo_path,
        letter: t.letter,
        date: new Date(t.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
      };
    }));
    setHopeTokens(resolved);
  }, [session]);

  useEffect(() => { if (session) loadHopeTokens(); }, [session, loadHopeTokens]);

  const isAuthed = !!session || isGuest;
  const userName = session
    ? (session.user.user_metadata?.full_name || session.user.email || 'Friend')
    : (isGuest ? 'Guest' : '');

  // parts: { text, voice, photo, letter } — photo, if present, is a base64 data URL from the composer.
  const addHopeToken = useCallback(async (parts) => {
    if (!session) {
      // Guest: old ephemeral behaviour, nothing persists
      setHopeTokens((prev) => [{ id: `local-${Date.now()}`, date: 'Just now', text: null, voice: null, photo: null, letter: null, ...parts }, ...prev]);
      return;
    }

    let photoPath = null;
    if (parts.photo) {
      const blob = await (await fetch(parts.photo)).blob();
      photoPath = `${session.user.id}/hope-vault-${Date.now()}.png`;
      const { error: uploadErr } = await supabase.storage.from('media').upload(photoPath, blob, { contentType: 'image/png' });
      if (uploadErr) { console.error('hope vault photo upload failed:', uploadErr.message); photoPath = null; }
    }

    const { error: insertErr } = await supabase.from('hope_vault_tapes').insert({
      user_id: session.user.id,
      voice_caption: parts.voice || null,
      text_scrap: parts.text || null,
      photo_path: photoPath,
      letter: parts.letter || null,
    });
    if (insertErr) { console.error('hope vault tape save failed:', insertErr.message); return; }

    loadHopeTokens();
  }, [session, loadHopeTokens]);

  const deleteHopeToken = useCallback(async (id) => {
    if (!session || String(id).startsWith('local-') || String(id).startsWith('seed-')) {
      setHopeTokens((prev) => prev.filter((t) => t.id !== id));
      return;
    }
    setHopeTokens((prev) => prev.filter((t) => t.id !== id));
    const token = hopeTokens.find((t) => t.id === id);
    if (token?.photoPath) {
      const { error: storageErr } = await supabase.storage.from('media').remove([token.photoPath]);
      if (storageErr) console.error('hope vault photo delete failed:', storageErr.message);
    }
    const { error: delErr } = await supabase.from('hope_vault_tapes').delete().eq('id', id);
    if (delErr) console.error('hope vault tape delete failed:', delErr.message);
  }, [session, hopeTokens]);

  const setMood = useCallback(async (moodKey) => {
    setTheme(moodKey);
    const entry = { mood: moodKey, date: new Date().toISOString() };
    setMoodHistory((prev) => [...prev, entry]);
    if (session) {
      const { error } = await supabase.from('mood_logs').insert({ user_id: session.user.id, mood: moodKey, score: MOOD_SCORES[moodKey] ?? 5 });
      if (error) console.error('mood save failed:', error.message);
    }
  }, [session]);

  const toggleMode = useCallback(() => { setMode((m) => (m === 'light' ? 'dark' : 'light')); }, []);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    setIsGuest(false);
  }, []);

  const signUp = useCallback(async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name?.trim() || '' } } });
    if (error) throw error;
    if (!data.session) return { needsConfirmation: true };
    setIsGuest(false);
    return { needsConfirmation: false };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/space` } });
    if (error) throw error;
  }, []);

  const continueAsGuest = useCallback(() => { setIsGuest(true); }, []);

  const signOut = useCallback(async () => {
    if (session) await supabase.auth.signOut();
    setIsGuest(false);
    setTheme('default');
    setMoodHistory([]);
    setHopeTokens(SEED_HOPE_TOKENS);
  }, [session]);

  const stormyStreak = useMemo(() => {
    let streak = 0;
    for (let i = moodHistory.length - 1; i >= 0; i--) {
      if (moodHistory[i].mood === 'sad') streak++;
      else break;
    }
    return streak;
  }, [moodHistory]);

  const value = {
    theme, setTheme, mode, toggleMode, mood: theme, setMood, moodHistory, stormyStreak,
    message: MOOD_MESSAGES[theme] || MOOD_MESSAGES.default,
    isAuthed, isGuest, userName, authLoading, session,
    signIn, signUp, signInWithGoogle, continueAsGuest, signOut,
    hopeTokens, addHopeToken, deleteHopeToken,
  };

  return <MoodContext.Provider value={value}>{children}</MoodContext.Provider>;
}

export function useMood() {
  const ctx = useContext(MoodContext);
  if (!ctx) throw new Error('useMood must be used within a MoodProvider');
  return ctx;
}