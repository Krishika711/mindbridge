import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import MoodBackground from '../components/MoodBackground';
import { HelpButton } from '../components/ui/Misc';
import { useMood } from '../context/MoodContext';
import { supabase } from '../lib/supabaseClient';

const MOOD_COLOR = {
  joyful: '#E6A93A', neutral: '#B8B0A0', anxious: '#8593A3', sad: '#4A5578', numb: '#7B8399',
};
const MOOD_Y = { joyful: 18, neutral: 45, anxious: 55, sad: 82, numb: 65 };
const MOOD_LABEL = { joyful: 'Bright & Energized', neutral: 'Calm & Balanced', anxious: 'Quiet & Reflective', sad: 'Heavy & Overwhelmed', numb: 'Burnt Out & Unclear' };

const NAV_ITEMS = [
  { key: 'profile', label: 'Profile', icon: '🙂' },
  { key: 'account', label: 'Account Settings', icon: '🔒' },
  { key: 'history', label: 'Chat History', icon: '💬' },
  { key: 'mood', label: 'Mood Insights', icon: '📊' },
  { key: 'contact', label: 'Emergency Contact', icon: '🚨' },
];

function dominantMood(moods) {
  if (!moods.length) return null;
  const counts = {};
  moods.forEach((m) => { counts[m] = (counts[m] || 0) + 1; });
  return Object.keys(counts).sort((a, b) => {
    if (counts[b] !== counts[a]) return counts[b] - counts[a];
    return MOOD_Y[a] - MOOD_Y[b];
  })[0];
}

function formatDateLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) {
    return `Today, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun ... 6 = Sat
  const diff = (day === 0 ? -6 : 1) - day; // shift back to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

function HeartbeatSpectrum({ moodHistory }) {
  const [hover, setHover] = useState(null);

  const points = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push(d);
    }
    const byDay = days.map((day) => {
      const dayEntries = moodHistory.filter((h) => new Date(h.date).toDateString() === day.toDateString());
      return { day, moods: dayEntries.map((e) => e.mood) };
    });
    const withData = byDay.map((b, i) => ({ ...b, dayIndex: i })).filter((b) => b.moods.length > 0);
    return withData.map((b) => ({
      x: (b.dayIndex / 6) * 92 + 4,
      y: MOOD_Y[dominantMood(b.moods)],
      mood: dominantMood(b.moods),
      jitter: dominantMood(b.moods) === 'sad',
      day: b.day,
      count: b.moods.length,
    }));
  }, [moodHistory]);

  if (points.length === 0) {
    return <div className="text-sm text-center py-12" style={{ color: 'var(--text-faint)' }}>No check-ins in the last 7 days yet.</div>;
  }

  const pathPoints = [];
  points.forEach((p) => {
    if (p.jitter) {
      pathPoints.push({ x: p.x - 1.2, y: p.y - 8 });
      pathPoints.push({ x: p.x - 0.4, y: p.y + 6 });
      pathPoints.push({ x: p.x + 0.4, y: p.y - 5 });
    }
    pathPoints.push({ x: p.x, y: p.y });
  });
  const d = pathPoints.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = pathPoints[i - 1];
    const midX = (prev.x + p.x) / 2;
    return `${acc} Q ${midX} ${prev.y}, ${p.x} ${p.y}`;
  }, '');

  return (
    <div className="relative" style={{ height: 200 }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id="pulseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            {points.map((p, i) => <stop key={i} offset={`${p.x}%`} stopColor={MOOD_COLOR[p.mood]} />)}
          </linearGradient>
        </defs>
        <path d={d} fill="none" stroke="url(#pulseGrad)" strokeWidth="1.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {points.map((p, i) => (
        <div
          key={i}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
          className="absolute w-3.5 h-3.5 rounded-full -translate-x-1/2 -translate-y-1/2 cursor-pointer"
          style={{ left: `${p.x}%`, top: `${p.y}%`, background: MOOD_COLOR[p.mood], border: '2px solid var(--card-bg)' }}
        />
      ))}
      {hover !== null && (
        <div
          className="absolute -translate-x-1/2 rounded-xl px-3 py-2 text-xs backdrop-blur-md z-10 whitespace-nowrap"
          style={{ left: `${points[hover].x}%`, top: `${Math.max(points[hover].y - 22, 4)}%`, background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: '0 8px 20px -8px rgba(0,0,0,0.3)' }}
        >
          <div className="font-semibold">{points[hover].day.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
          <div style={{ color: 'var(--text-soft)' }}>{MOOD_LABEL[points[hover].mood]}</div>
        </div>
      )}
    </div>
  );
}

function WeeklyReport({ session }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [hasEnoughData, setHasEnoughData] = useState(null);

  const weekStart = useMemo(() => getWeekStart(), []);
  const weekStartISO = useMemo(() => toISODate(weekStart), [weekStart]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error: fetchErr } = await supabase
        .from('weekly_reports')
        .select('report')
        .eq('user_id', session.user.id)
        .eq('week_start', weekStartISO)
        .maybeSingle();
      if (cancelled) return;
      if (fetchErr) console.error('weekly report load failed:', fetchErr.message);
      if (data?.report) setReport(data.report);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [session, weekStartISO]);

  const generateReport = async () => {
    if (!session) return;
    setGenerating(true);
    setError('');
    try {
      const weekStartTS = weekStart.toISOString();

      const [{ data: msgRows, error: msgErr }, { data: moodRows, error: moodErr }, { data: hopeRows, error: hopeErr }] = await Promise.all([
        supabase
          .from('messages')
          .select('text, created_at')
          .eq('user_id', session.user.id)
          .eq('from_role', 'user')
          .gte('created_at', weekStartTS)
          .order('created_at', { ascending: true })
          .limit(150),
        supabase
          .from('mood_logs')
          .select('mood, score, created_at')
          .eq('user_id', session.user.id)
          .gte('created_at', weekStartTS)
          .order('created_at', { ascending: true }),
        supabase
          .from('hope_vault_tapes')
          .select('text_scrap, letter, voice_caption, created_at')
          .eq('user_id', session.user.id)
          .gte('created_at', weekStartTS)
          .order('created_at', { ascending: true }),
      ]);
      if (msgErr) throw msgErr;
      if (moodErr) throw moodErr;
      if (hopeErr) throw hopeErr;

      if (!(msgRows?.length) && !(moodRows?.length) && !(hopeRows?.length)) {
        setHasEnoughData(false);
        setGenerating(false);
        return;
      }

      const chats = (msgRows || []).map((m) => ({ text: m.text, date: formatDateLabel(m.created_at) }));
      const moods = (moodRows || []).map((m) => ({ mood: m.mood, score: m.score, date: formatDateLabel(m.created_at) }));
      const hopeEntries = (hopeRows || []).map((h) => ({
        text: h.text_scrap, letter: h.letter, hasVoice: !!h.voice_caption, date: formatDateLabel(h.created_at),
      }));

      const res = await fetch('/api/weekly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chats, moods, hopeEntries }),
      });
      if (!res.ok) throw new Error(`weekly report request failed: ${res.status}`);
      const { report: newReport } = await res.json();

      const { error: saveErr } = await supabase
        .from('weekly_reports')
        .upsert(
          { user_id: session.user.id, week_start: weekStartISO, report: newReport },
          { onConflict: 'user_id,week_start' }
        );
      if (saveErr) console.error('weekly report save failed:', saveErr.message);

      setReport(newReport);
      setHasEnoughData(true);
    } catch (err) {
      console.error('weekly report generation failed:', err.message);
      setError('Report generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="text-xs mt-4" style={{ color: 'var(--text-faint)' }}>Loading this week's report…</div>;
  }

  if (report) {
    return (
      <div className="mt-5 rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
        <div className="text-[11px] font-semibold tracking-[1.2px] uppercase mb-3" style={{ color: 'var(--accent-deep)' }}>This Week's Report</div>
        <p className="text-sm mb-3 leading-relaxed">{report.summary}</p>

        <div className="mb-3">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-faint)' }}>Mood pattern</div>
          <p className="text-sm leading-relaxed">{report.moodPattern}</p>
        </div>

        {report.chatThemes?.length > 0 && (
          <div className="mb-3">
            <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-faint)' }}>What came up in chats</div>
            <div className="flex flex-wrap gap-2">
              {report.chatThemes.map((t, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--surface-strong)', border: '1px solid var(--card-border)' }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        <div className="mb-3">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-faint)' }}>Hope Vault</div>
          <p className="text-sm leading-relaxed">{report.hopeVaultActivity}</p>
        </div>

        {report.suggestions?.length > 0 && (
          <div className="mb-1">
            <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-faint)' }}>Worth trying</div>
            <ul className="text-sm leading-relaxed pl-4" style={{ listStyle: 'disc' }}>
              {report.suggestions.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}

        {report.concern?.flagged && (
          <div className="mt-3 text-xs rounded-xl p-3" style={{ background: 'var(--surface-strong)', border: '1px solid var(--accent-deep)' }}>
            {report.concern.note}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-2xl p-5 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
      {hasEnoughData === false ? (
        <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Is hafte abhi kuch activity nahi hai report banane ke liye.</p>
      ) : (
        <>
          <p className="text-xs mb-3" style={{ color: 'var(--text-faint)' }}>Report not found for this week</p>
          {error && <p className="text-xs mb-2" style={{ color: '#C0523A' }}>{error}</p>}
          <button
            onClick={generateReport}
            disabled={generating}
            className="px-5 py-2.5 rounded-full text-[13px] font-semibold"
            style={{ background: 'var(--ink)', color: 'var(--ink-text)', opacity: generating ? 0.6 : 1 }}
          >
            {generating ? 'Analyzing…' : "Generate this week's report"}
          </button>
        </>
      )}
    </div>
  );
}

function ChatHistoryRow({ item, onDelete, onRename }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title || '');

  const commit = () => {
    setEditing(false);
    const trimmed = title.trim();
    if (trimmed !== (item.title || '')) onRename(item.sessionId, trimmed);
  };

  return (
    <div className="group flex items-center justify-between gap-3 rounded-2xl p-3.5" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
      <div className="min-w-0 flex-1">
        <div className="text-xs mb-0.5" style={{ color: 'var(--text-faint)' }}>{item.date} · {item.count} message{item.count === 1 ? '' : 's'}</div>
        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
            placeholder="Name this chat…"
            className="text-sm font-medium bg-transparent outline-none border-b w-full"
            style={{ borderColor: 'var(--card-border)', color: 'var(--text)' }}
          />
        ) : (
          <div className="text-sm font-medium truncate">{item.title || item.snippet}</div>
        )}
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <button onClick={() => setEditing(true)} className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--accent-deep)' }} title="Rename">✎</button>
        <button
          onClick={() => { if (window.confirm('Once deleted, this chat cannot be recovered.')) onDelete(item.sessionId); }}
          className="text-xs opacity-0 group-hover:opacity-100 transition-opacity px-1"
          style={{ color: '#C0523A' }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { theme, mode, session, userName, moodHistory, signOut } = useMood();
  const [section, setSection] = useState('profile');

  const isGoogleUser = session?.user?.app_metadata?.provider === 'google'
    || session?.user?.identities?.some((i) => i.provider === 'google');

  // Profile (nickname / age / avatar)
  const [nicknameField, setNicknameField] = useState('');
  const [ageField, setAgeField] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  // Account (email / password)
  const [emailField, setEmailField] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');

  // Emergency contact
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [savedTick, setSavedTick] = useState(false);

  // Chat history
  const [sessions, setSessions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    setEmailField(session.user.email || '');
    supabase
      .from('profiles')
      .select('full_name, age, avatar_path')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (error) { console.error('profile load failed:', error.message); return; }
        setNicknameField(data?.full_name || userName || '');
        setAgeField(data?.age ?? '');
        if (data?.avatar_path) {
          const { data: signed, error: signErr } = await supabase.storage.from('media').createSignedUrl(data.avatar_path, 3600);
          if (signErr) console.error('avatar signed url failed:', signErr.message);
          else setAvatarUrl(signed.signedUrl);
        }
      });

    supabase
      .from('emergency_contacts')
      .select('contact_name, contact_email')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) { console.error('emergency contact load failed:', error.message); return; }
        if (data) { setContactName(data.contact_name || ''); setContactEmail(data.contact_email || ''); }
      });
  }, [session, userName]);

  const loadHistory = useCallback(async () => {
    if (!session) return;
    setHistoryLoading(true);
    const [{ data, error }, { data: titleRows, error: titleErr }] = await Promise.all([
      supabase
        .from('messages')
        .select('session_id, from_role, text, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('chat_session_titles')
        .select('session_id, title')
        .eq('user_id', session.user.id),
    ]);
    setHistoryLoading(false);
    if (error) { console.error('history load failed:', error.message); return; }
    if (titleErr) console.error('chat titles load failed:', titleErr.message);
    const titleMap = new Map((titleRows || []).map((r) => [r.session_id, r.title]));

    const bySession = new Map();
    (data || []).forEach((m) => {
      if (!m.session_id) return;
      if (!bySession.has(m.session_id)) bySession.set(m.session_id, { firstUser: null, last: m, count: 0 });
      const entry = bySession.get(m.session_id);
      if (!entry.firstUser && m.from_role === 'user') entry.firstUser = m;
      entry.last = m;
      entry.count += 1;
    });

    const items = Array.from(bySession.entries())
      .sort((a, b) => new Date(b[1].last.created_at) - new Date(a[1].last.created_at))
      .map(([sessionId, entry]) => {
        const snippetSrc = entry.firstUser?.text || entry.last.text || '[shared a drawing]';
        return {
          sessionId,
          date: formatDateLabel(entry.last.created_at),
          snippet: snippetSrc.length > 70 ? snippetSrc.slice(0, 70) + '…' : snippetSrc,
          count: entry.count,
          title: titleMap.get(sessionId) || null,
        };
      });
    setSessions(items);
  }, [session]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const renameSession = async (sessionId, title) => {
    if (!session) return;
    const trimmed = title.trim();
    const { error } = await supabase
      .from('chat_session_titles')
      .upsert({ session_id: sessionId, user_id: session.user.id, title: trimmed || null, updated_at: new Date().toISOString() }, { onConflict: 'session_id' });
    if (error) { console.error('session rename failed:', error.message); return; }
    setSessions((s) => s.map((x) => (x.sessionId === sessionId ? { ...x, title: trimmed || null } : x)));
  };

  const deleteSession = async (sessionId) => {
    setSessions((s) => s.filter((x) => x.sessionId !== sessionId));
    const { error } = await supabase.from('messages').delete().eq('user_id', session.user.id).eq('session_id', sessionId);
    if (error) console.error('delete chat failed:', error.message);
    const { error: titleErr } = await supabase.from('chat_session_titles').delete().eq('user_id', session.user.id).eq('session_id', sessionId);
    if (titleErr) console.error('delete chat title failed:', titleErr.message);
  };

  const uploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !session) return;
    setAvatarUploading(true);
    const path = `${session.user.id}/avatar.png`;
    const { error: uploadErr } = await supabase.storage.from('media').upload(path, file, { upsert: true, contentType: file.type });
    if (uploadErr) { console.error('avatar upload failed:', uploadErr.message); setAvatarUploading(false); return; }
    const { error: profileErr } = await supabase.from('profiles').upsert({ id: session.user.id, avatar_path: path }, { onConflict: 'id' });
    if (profileErr) console.error('avatar path save failed:', profileErr.message);
    const { data: signed, error: signErr } = await supabase.storage.from('media').createSignedUrl(path, 3600);
    if (signErr) console.error('avatar signed url failed:', signErr.message);
    else setAvatarUrl(signed.signedUrl);
    setAvatarUploading(false);
  };

  const saveProfile = async () => {
    setProfileMsg('');
    setProfileSaving(true);
    try {
      const { error: profileErr } = await supabase.from('profiles').upsert({
        id: session.user.id,
        full_name: nicknameField.trim(),
        age: ageField === '' ? null : Number(ageField),
      }, { onConflict: 'id' });
      if (profileErr) throw profileErr;

      const { error: metaErr } = await supabase.auth.updateUser({ data: { full_name: nicknameField.trim() } });
      if (metaErr) throw metaErr;

      setProfileMsg('Saved ✓');
    } catch (err) {
      setProfileMsg(err.message || 'Kuch galat ho gaya.');
    } finally {
      setProfileSaving(false);
      setTimeout(() => setProfileMsg(''), 4000);
    }
  };

  const saveEmail = async () => {
    setEmailMsg('');
    if (emailField.trim() === session.user.email) return;
    setEmailSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: emailField.trim() });
      if (error) throw error;
      setEmailMsg('Naya email confirm karne ke liye link bheji gayi hai — confirm hone tak purana email hi active rahega.');
    } catch (err) {
      setEmailMsg(err.message || 'Kuch galat ho gaya.');
    } finally {
      setEmailSaving(false);
      setTimeout(() => setEmailMsg(''), 7000);
    }
  };

  const changePassword = async () => {
    setPasswordMsg('');
    if (newPassword.length < 6) { setPasswordMsg('Password kam se kam 6 characters ka hona chahiye.'); return; }
    if (newPassword !== confirmPassword) { setPasswordMsg('Passwords match nahi kar rahe.'); return; }
    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMsg('Password updated ✓');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordMsg(err.message || 'Kuch galat ho gaya.');
    } finally {
      setPasswordSaving(false);
      setTimeout(() => setPasswordMsg(''), 5000);
    }
  };

  const saveEmergencyContact = async () => {
    if (!session || !contactName.trim() || !contactEmail.trim()) return;
    const { error } = await supabase.from('emergency_contacts').upsert({
      user_id: session.user.id, contact_name: contactName.trim(), contact_email: contactEmail.trim(), updated_at: new Date().toISOString(),
    });
    if (error) { console.error('emergency contact save failed:', error.message); return; }
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1800);
  };

  return (
    <div className="app app-shell flex flex-col" data-theme={theme} data-mode={mode}>
      <MoodBackground showCelestial={false} />
      <Header showBack onSignOut={() => { signOut(); navigate('/'); }} />

      <main className="relative z-10 flex-1 flex flex-col items-center px-6 py-10">
        <div className="w-full max-w-4xl">
          <button onClick={() => navigate(-1)} className="text-sm mb-6" style={{ color: 'var(--text-soft)' }}>← Back</button>
          <h1 className="text-3xl mb-8" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Profile</h1>

          <div className="flex gap-6 items-start flex-col md:flex-row">
            {/* Left sidebar */}
            <div className="w-full md:w-56 flex md:flex-col gap-2 shrink-0 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setSection(item.key)}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-semibold text-left shrink-0 whitespace-nowrap"
                  style={
                    section === item.key
                      ? { background: 'var(--ink)', color: 'var(--ink-text)' }
                      : { background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text)' }
                  }
                >
                  <span>{item.icon}</span> {item.label}
                </button>
              ))}
            </div>

            {/* Right content */}
            <div className="flex-1 min-w-0 w-full">
              {section === 'profile' && (
                <div className="rounded-3xl p-6 backdrop-blur-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                  <div className="text-[11px] font-semibold tracking-[1.4px] uppercase mb-4" style={{ color: 'var(--accent-deep)' }}>Profile</div>

                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-semibold overflow-hidden shrink-0" style={{ background: 'var(--surface-strong)', border: '1px solid var(--card-border)' }}>
                      {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : (nicknameField || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <label className="text-xs font-semibold px-3.5 py-2 rounded-full cursor-pointer inline-block" style={{ border: '1px solid var(--card-border)', color: 'var(--accent-deep)' }}>
                        {avatarUploading ? 'Uploading…' : 'Change photo'}
                        <input type="file" accept="image/*" onChange={uploadAvatar} disabled={avatarUploading} className="hidden" />
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5 max-w-sm">
                    <div>
                      <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-faint)' }}>Nickname</div>
                      <input value={nicknameField} onChange={(e) => setNicknameField(e.target.value)} placeholder="What should Wisp call you?"
                        className="w-full text-[13px] rounded-xl px-3.5 py-2.5 outline-none" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text)' }} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-faint)' }}>Age</div>
                      <input value={ageField} onChange={(e) => setAgeField(e.target.value)} placeholder="Age" type="number" min={13} max={120}
                        className="w-full text-[13px] rounded-xl px-3.5 py-2.5 outline-none" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text)' }} />
                    </div>
                    {profileMsg && <p className="text-xs" style={{ color: 'var(--accent-deep)' }}>{profileMsg}</p>}
                    <button onClick={saveProfile} disabled={profileSaving} className="self-start mt-1 px-5 py-2.5 rounded-full text-[13px] font-semibold" style={{ background: 'var(--ink)', color: 'var(--ink-text)', opacity: profileSaving ? 0.6 : 1 }}>
                      {profileSaving ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                </div>
              )}

              {section === 'account' && (
                <div className="rounded-3xl p-6 backdrop-blur-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                  <div className="text-[11px] font-semibold tracking-[1.4px] uppercase mb-4" style={{ color: 'var(--accent-deep)' }}>Account Settings</div>

                  <div className="max-w-sm flex flex-col gap-2.5 mb-6">
                    <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-faint)' }}>Email</div>
                    <input value={emailField} onChange={(e) => setEmailField(e.target.value)} type="email"
                      className="w-full text-[13px] rounded-xl px-3.5 py-2.5 outline-none" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text)' }} />
                    {emailMsg && <p className="text-xs leading-relaxed" style={{ color: 'var(--accent-deep)' }}>{emailMsg}</p>}
                    <button onClick={saveEmail} disabled={emailSaving || emailField.trim() === session?.user.email} className="self-start px-5 py-2.5 rounded-full text-[13px] font-semibold" style={{ background: 'var(--ink)', color: 'var(--ink-text)', opacity: emailSaving ? 0.6 : 1 }}>
                      {emailSaving ? 'Saving…' : 'Update email'}
                    </button>
                  </div>

                  <div style={{ borderTop: '1px solid var(--card-border)' }} className="pt-5">
                    <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-faint)' }}>Password</div>
                    {isGoogleUser ? (
                      <div className="flex items-center gap-2 text-sm rounded-xl px-3.5 py-3 max-w-sm" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
                        <span>🔵</span> Signed in with Google — password is managed by your Google account.
                      </div>
                    ) : (
                      <div className="max-w-sm flex flex-col gap-2.5">
                        <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" placeholder="New password"
                          className="w-full text-[13px] rounded-xl px-3.5 py-2.5 outline-none" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text)' }} />
                        <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" placeholder="Confirm new password"
                          className="w-full text-[13px] rounded-xl px-3.5 py-2.5 outline-none" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text)' }} />
                        {passwordMsg && <p className="text-xs" style={{ color: 'var(--accent-deep)' }}>{passwordMsg}</p>}
                        <button onClick={changePassword} disabled={passwordSaving} className="self-start px-5 py-2.5 rounded-full text-[13px] font-semibold" style={{ background: 'var(--ink)', color: 'var(--ink-text)', opacity: passwordSaving ? 0.6 : 1 }}>
                          {passwordSaving ? 'Saving…' : 'Update password'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {section === 'history' && (
                <div className="rounded-3xl p-6 backdrop-blur-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                  <div className="text-[11px] font-semibold tracking-[1.4px] uppercase mb-4" style={{ color: 'var(--accent-deep)' }}>Chat History</div>
                  {historyLoading && <div className="text-xs" style={{ color: 'var(--text-faint)' }}>Loading…</div>}
                  {!historyLoading && sessions.length === 0 && <div className="text-xs" style={{ color: 'var(--text-faint)' }}>No chats yet.</div>}
                  <div className="flex flex-col gap-2.5 max-h-128 overflow-y-auto pr-1">
                    {sessions.map((s) => (
                      <ChatHistoryRow key={s.sessionId} item={s} onDelete={deleteSession} onRename={renameSession} />
                    ))}
                  </div>
                </div>
              )}

              {section === 'mood' && (
                <div className="rounded-3xl p-6 backdrop-blur-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                  <div className="text-[11px] font-semibold tracking-[1.4px] uppercase mb-1" style={{ color: 'var(--accent-deep)' }}>Mood Insights</div>
                  <p className="text-xs mb-4" style={{ color: 'var(--text-faint)' }}>Your last 7 days, as a pulse — hover any point.</p>
                  <HeartbeatSpectrum moodHistory={moodHistory} />
                  <WeeklyReport session={session} />
                </div>
              )}

              {section === 'contact' && (
                <div className="rounded-3xl p-6 backdrop-blur-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                  <div className="text-[11px] font-semibold tracking-[1.4px] uppercase mb-2" style={{ color: 'var(--accent-deep)' }}>Emergency Contact</div>
                  <p className="text-xs mb-4 leading-relaxed max-w-sm" style={{ color: 'var(--text-faint)' }}>
                    If high-risk language is detected in your chat, this person gets a real email alert.
                  </p>
                  <div className="max-w-sm">
                    <input value={contactName} onChange={(e) => setContactName(e.target.value)} onBlur={saveEmergencyContact} placeholder="Contact name (e.g. Maa, Rohan)"
                      className="w-full text-[13px] rounded-xl px-3.5 py-2.5 outline-none mb-2" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text)' }} />
                    <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} onBlur={saveEmergencyContact} placeholder="their@email.com" type="email"
                      className="w-full text-[13px] rounded-xl px-3.5 py-2.5 outline-none" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text)' }} />
                    {savedTick && <div className="text-xs mt-2" style={{ color: 'var(--accent-deep)' }}>Saved ✓</div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <HelpButton />
    </div>
  );
}