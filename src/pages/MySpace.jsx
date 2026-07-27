import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import emailjs from 'emailjs-com';
import MoodBackground from '../components/MoodBackground';
import Header from '../components/Header';
import { HelpButton } from '../components/ui/Misc';
import { useMood } from '../context/MoodContext';
import { supabase } from '../lib/supabaseClient';
import StormyAlert from '../components/StormyAlert';
import GuestSignInPrompt from '../components/GuestSignInPrompt';
import DrawCanvas from '../components/DrawCanvas';
import VoiceNotes from '../components/VoiceNotes';
import FloatingHope from '../components/FloatingHope';

async function claudeScore(messages, signal) {
  const history = messages.map((m) => `${m.from === 'user' ? 'User' : 'AI'}: ${m.text || '[shared a drawing]'}`).join('\n');
  try {
    const res = await fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history }),
      signal,
    });
    if (!res.ok) throw new Error(`score failed ${res.status}`);
    return await res.json();
  } catch {
    return { crisis_risk: 0, theme: 'okay', needs_alert: false };
  }
}

async function claudeRespond(messages, signal) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
    signal,
  });
  if (!res.ok) throw new Error(`chat failed ${res.status}`);
  const data = await res.json();
  return data.text;
}

async function claudeRespondToImage(imageDataUrl, signal) {
  const res = await fetch('/api/chat-vision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageDataUrl }),
    signal,
  });
  if (!res.ok) throw new Error(`chat-vision failed ${res.status}`);
  const data = await res.json();
  return data.text;
}

async function claudeRespondToVoice(audioDataUrl, signal) {
  const res = await fetch('/api/chat-voice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audioDataUrl }),
    signal,
  });
  if (!res.ok) throw new Error(`chat-voice failed ${res.status}`);
  const data = await res.json();
  return data.text;
}

async function sendEmergencyAlert(contactName, contactEmail, userName, triggerMessage, riskLevel) {
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
  if (!publicKey) throw new Error('VITE_EMAILJS_PUBLIC_KEY is missing at build time — check Vercel env vars and redeploy.');
  emailjs.init(publicKey);
  return emailjs.send(
    import.meta.env.VITE_EMAILJS_SERVICE_ID,
    import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
    { to_name: contactName, to_email: contactEmail, user_name: userName || 'Someone you care about', message: triggerMessage, risk_level: riskLevel, app_name: 'MindBridge+' }
  );
}

function formatDateLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return `Today, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const GREETING = { from: 'wisp', text: "Hello, I'm Wisp. How are you feeling today?", id: null, created_at: null, image: null };

const FEATURES = [
  { key: 'hope-vault', label: 'Hope Vault', path: '/hope-vault' },
  { key: 'safe-circle', label: 'Safe Circle', path: '/safe-circle' },
  { key: 'calm-space', label: 'Calm Space', path: '/calm-space' },
];

function FeatureIcon({ type }) {
  const common = { viewBox: '0 0 24 24', width: 15, height: 15, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (type === 'hope-vault') return <svg {...common}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" /></svg>;
  if (type === 'safe-circle') return <svg {...common}><path d="M12 2 4 5v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5z" /></svg>;
  return <svg {...common}><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" /></svg>;
}

const TOOL_TABS = [
  { key: 'write', type: 'text' },
  { key: 'draw', type: 'drawing' },
  { key: 'voice', type: 'voice' },
];

function PhotoRow({ small = false, photos, onAdd, onRemove }) {
  const size = small ? 'w-11 h-11' : 'aspect-square';
  const inputId = `photo-input-${small ? 'small' : 'main'}`;
  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => onAdd(reader.result);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };
  return (
    <div className={small ? 'flex gap-2.5 flex-wrap' : 'grid grid-cols-4 gap-2.5'}>
      {photos.map((src, i) => (
        <div key={i} className={`${size} rounded-xl relative overflow-hidden group`} style={{ border: '1px solid var(--card-border)' }}>
          <img src={src} alt="" className="w-full h-full object-cover" />
          <button onClick={() => onRemove(i)} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }} aria-label="Remove photo">✕</button>
        </div>
      ))}
      <input id={inputId} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
      <label htmlFor={inputId} className={`${size} rounded-xl flex items-center justify-center cursor-pointer text-xl flex-shrink-0`}
        style={{ border: '1.5px dashed var(--card-border)', color: 'var(--accent-deep)' }}>+</label>
    </div>
  );
}

function GuestLockedPane({ label, onUnlock }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3.5 rounded-2xl text-center p-8" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
      <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="var(--text-faint)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
      </svg>
      <p className="text-[13px] max-w-xs leading-relaxed" style={{ color: 'var(--text-faint)' }}>{label}</p>
      <button onClick={onUnlock} className="px-5 py-2 rounded-full text-[12.5px] font-medium" style={{ border: '1px solid var(--card-border)', color: 'var(--text-soft)' }}>Sign In</button>
    </div>
  );
}

function ChatHistoryItem({ item, active, onOpen, onDelete, onRename }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title || '');

  const commit = () => {
    setEditing(false);
    const trimmed = title.trim();
    if (trimmed !== (item.title || '')) onRename(item.sessionId, trimmed);
  };

  return (
    <div
      onClick={() => !editing && onOpen(item.sessionId)}
      className={`group flex items-center justify-between gap-2 rounded-2xl p-3.5 mb-2.5 cursor-pointer transition-transform hover:-translate-y-0.5 ${active ? 'ring-1' : ''}`}
      style={{ background: 'var(--surface-strong)', border: '1px solid var(--card-border)' }}
    >
      <div className="min-w-0 flex-1">
        <div className="text-xs mb-1" style={{ color: 'var(--text-faint)' }}>{item.date}</div>
        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onClick={(e) => e.stopPropagation()}
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
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <button onClick={(e) => { e.stopPropagation(); setEditing(true); }} className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--accent-deep)' }} title="Rename">✎</button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(item.sessionId); }} className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#C0523A' }}>Delete</button>
      </div>
    </div>
  );
}

// ---------- Quiet Mode History (Written / Drawings / Voice / Photos) ----------

function JournalWrittenCard({ entry, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(entry.title || '');
  const [text, setText] = useState(entry.text_content || '');
  const [saving, setSaving] = useState(false);

  const commitTitle = () => {
    const trimmed = title.trim();
    if (trimmed !== (entry.title || '')) onUpdate(entry.id, { title: trimmed || null });
  };

  const saveBody = async () => {
    if (!text.trim()) return;
    setSaving(true);
    await onUpdate(entry.id, { text_content: text.trim() });
    setSaving(false);
    setOpen(false);
  };

  return (
    <div className="rounded-2xl p-5 relative" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
      <button
        onClick={() => { if (window.confirm('Delete this entry? This can\u2019t be undone.')) onDelete(entry.id); }}
        className="absolute right-4 top-4 w-6 h-6 rounded-full flex items-center justify-center"
        style={{ color: 'var(--text-faint)' }}
        title="Delete entry"
      >
        <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0-.8 12.1a2 2 0 0 1-2 1.9H8.8a2 2 0 0 1-2-1.9L6 7" />
        </svg>
      </button>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
        placeholder="Untitled entry"
        className="text-sm font-semibold bg-transparent outline-none border-none w-full mb-2 pr-8"
        style={{ color: 'var(--accent-deep)' }}
      />

      {open ? (
        <>
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full min-h-[90px] resize-none outline-none text-[15px] leading-relaxed bg-transparent mb-3"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
          />
          <div className="flex gap-2">
            <button onClick={() => { setText(entry.text_content || ''); setOpen(false); }} className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ border: '1px solid var(--card-border)', color: 'var(--text)' }}>Cancel</button>
            <button onClick={saveBody} disabled={saving} className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: 'var(--ink)', color: 'var(--ink-text)', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </>
      ) : (
        <button onClick={() => setOpen(true)} className="text-left w-full">
          <p
            className="italic text-[15px] leading-relaxed mb-2"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            "{entry.text_content}"
          </p>
          <div className="flex items-center justify-between">
            <div className="text-xs" style={{ color: 'var(--text-faint)' }}>{entry.date}</div>
            <div className="text-xs" style={{ color: 'var(--accent-deep)' }}>Open to read & edit →</div>
          </div>
        </button>
      )}
    </div>
  );
}

function VoiceRow({ entry, onUpdate, onDelete }) {
  const [title, setTitle] = useState(entry.title || '');

  const commit = () => {
    const trimmed = title.trim();
    if (trimmed !== (entry.title || '')) onUpdate(entry.id, { title: trimmed || null });
  };

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2 relative" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
      <button
        onClick={() => { if (window.confirm('Delete this voice note? This can\u2019t be undone.')) onDelete(entry.id); }}
        className="absolute right-3 top-3 w-6 h-6 rounded-full flex items-center justify-center"
        style={{ color: 'var(--text-faint)' }}
        title="Delete"
      >
        <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0-.8 12.1a2 2 0 0 1-2 1.9H8.8a2 2 0 0 1-2-1.9L6 7" />
        </svg>
      </button>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
        placeholder="Untitled voice note"
        className="text-sm font-semibold bg-transparent outline-none border-none pr-8"
        style={{ color: 'var(--text)' }}
      />
      {entry.mediaUrl ? (
        <audio controls src={entry.mediaUrl} className="w-full h-9" />
      ) : (
        <div className="text-xs" style={{ color: 'var(--text-faint)' }}>Audio unavailable.</div>
      )}
      <div className="text-xs" style={{ color: 'var(--text-faint)' }}>{entry.date}</div>
    </div>
  );
}

function JournalMediaThumb({ entry, onOpen }) {
  return (
    <button
      onClick={() => onOpen(entry)}
      className="rounded-xl overflow-hidden text-left"
      style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}
    >
      <div className="w-full aspect-square bg-cover bg-center flex items-center justify-center" style={{ backgroundImage: entry.mediaUrl ? `url(${entry.mediaUrl})` : 'none', background: entry.mediaUrl ? undefined : 'var(--surface-strong)' }}>
        {!entry.mediaUrl && (
          <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="var(--text-faint)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.4" /><path d="M21 16l-5-4-9 7" />
          </svg>
        )}
      </div>
      {entry.title && (
        <div className="px-2.5 pt-2 text-[12px] font-medium truncate" style={{ color: 'var(--text)' }}>{entry.title}</div>
      )}
      <div className="px-2.5 pb-2 pt-0.5 text-[11px]" style={{ color: 'var(--text-faint)' }}>{entry.date}</div>
    </button>
  );
}

function JournalLightbox({ entry, onClose, onUpdate, onDelete }) {
  const [title, setTitle] = useState(entry.title || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await onUpdate(entry.id, { title: title.trim() || null });
    setSaving(false);
  };

  const remove = () => {
    if (window.confirm('Delete this? This can\u2019t be undone.')) {
      onDelete(entry.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl overflow-hidden relative"
        style={{ width: 'min(480px, 92vw)', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
      >
        <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-sm z-10" style={{ background: 'var(--surface-strong)', color: 'var(--text-soft)' }}>✕</button>
        {entry.mediaUrl && (
          <img src={entry.mediaUrl} alt="" className="w-full object-contain" style={{ maxHeight: '65vh', background: 'var(--surface)' }} />
        )}
        <div className="p-5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give this a name…"
            className="w-full outline-none border-none bg-transparent text-[15px] font-medium mb-3"
            style={{ color: 'var(--text)' }}
          />
          <div className="flex items-center justify-between">
            <button onClick={remove} className="text-xs font-medium" style={{ color: 'var(--text-faint)' }}>Delete</button>
            <div className="flex items-center gap-2">
              <div className="text-xs" style={{ color: 'var(--text-faint)' }}>{entry.date}</div>
              <button onClick={save} disabled={saving} className="text-xs font-semibold px-3.5 py-1.5 rounded-full" style={{ border: '1px solid var(--card-border)', color: 'var(--text-soft)', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving…' : 'Save name'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryIcon({ type }) {
  const common = { viewBox: '0 0 24 24', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (type === 'text') return <svg {...common}><path d="M4 6h16M4 12h10M4 18h13" /></svg>;
  if (type === 'drawing') return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.4" /><path d="M21 15.5 16 10l-9 9" /></svg>;
  if (type === 'voice') return <svg {...common}><rect x="9" y="1.5" width="6" height="12" rx="3" /><path d="M5 10.5v1a7 7 0 0 0 14 0v-1" /><line x1="12" y1="18.5" x2="12" y2="22" /></svg>;
  return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.4" /><path d="M21 16l-5-4-9 7" /></svg>;
}

const HISTORY_CATEGORIES = [
  { key: 'text', label: 'Written', hint: 'Journal entries you can read — tap one to edit.' },
  { key: 'drawing', label: 'Drawings', hint: "Sketches from other days — today's stay in the Draw tab." },
  { key: 'voice', label: 'Voice Notes', hint: 'Recordings you can listen to — edit the name anytime.' },
  { key: 'photo', label: 'Photos', hint: 'Snapshots you can watch back — edit the name anytime.' },
];

function HistoryOverlay({ entries, loading, onClose, onUpdate, onDelete }) {
  const [category, setCategory] = useState('text');
  const [lightboxEntry, setLightboxEntry] = useState(null);

  const grouped = HISTORY_CATEGORIES.map((c) => ({ ...c, items: entries.filter((e) => e.type === c.key) }));
  const active = grouped.find((c) => c.key === category) || grouped[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[85vh] flex flex-col md:flex-row rounded-2xl overflow-hidden"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
      >
        {/* Left: category rail — mirrors the journal editor's sidebar */}
        <div className="w-full md:w-52 shrink-0 flex flex-col overflow-hidden border-b md:border-b-0 md:border-r" style={{ background: 'var(--surface)', borderColor: 'var(--card-border)' }}>
          <div className="hidden md:flex items-center justify-between px-4 py-3.5 shrink-0" style={{ borderBottom: '1px solid var(--card-border)' }}>
            <div className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>History</div>
          </div>
          <div className="flex md:flex-col p-2 gap-1 overflow-x-auto md:overflow-visible">
            {grouped.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px] font-medium text-left whitespace-nowrap shrink-0"
                style={category === c.key ? { background: 'var(--card-bg)', color: 'var(--accent-deep)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } : { color: 'var(--text-soft)' }}
              >
                <CategoryIcon type={c.key} />
                {c.label}
                <span className="md:ml-auto text-[11px]" style={{ color: 'var(--text-faint)' }}>{c.items.length}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: entries for the selected category */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-5 py-3.5 shrink-0" style={{ borderBottom: '1px solid var(--card-border)' }}>
            <div className="text-[15px] font-semibold md:hidden" style={{ color: 'var(--text)' }}>History</div>
            <p className="text-xs hidden md:block" style={{ color: 'var(--text-faint)' }}>{active.hint}</p>
            <button onClick={onClose} className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0" style={{ color: 'var(--text-faint)' }}>✕</button>
          </div>
          <p className="text-xs px-5 pt-3 md:hidden" style={{ color: 'var(--text-faint)' }}>{active.hint}</p>

          <div className="flex-1 overflow-y-auto p-5">
            {loading && <p className="text-sm" style={{ color: 'var(--text-faint)' }}>Loading…</p>}

            {!loading && active.items.length === 0 && (
              <p className="text-sm" style={{ color: 'var(--text-faint)' }}>Nothing saved here yet.</p>
            )}

            {!loading && category === 'text' && active.items.length > 0 && (
              <div className="flex flex-col gap-3">
                {active.items.map((e) => <JournalWrittenCard key={e.id} entry={e} onUpdate={onUpdate} onDelete={onDelete} />)}
              </div>
            )}

            {!loading && category === 'voice' && active.items.length > 0 && (
              <div className="flex flex-col gap-3">
                {active.items.map((e) => <VoiceRow key={e.id} entry={e} onUpdate={onUpdate} onDelete={onDelete} />)}
              </div>
            )}

            {!loading && (category === 'photo' || category === 'drawing') && active.items.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {active.items.map((e) => (
                  <JournalMediaThumb key={e.id} entry={e} onOpen={setLightboxEntry} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {lightboxEntry && (
        <JournalLightbox
          entry={lightboxEntry}
          onClose={() => setLightboxEntry(null)}
          onUpdate={async (id, title) => { await onUpdate(id, title); setLightboxEntry((cur) => (cur ? { ...cur, text_content: title } : cur)); }}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

export default function MySpace() {
  const navigate = useNavigate();
  const { theme, mode, mood, userName, isGuest, session, signOut, stormyStreak } = useMood();
  const [responding, setResponding] = useState(true);
  const [journalTab, setJournalTab] = useState('write');
  const [openTool, setOpenTool] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [thread, setThread] = useState([GREETING]);
  const [draft, setDraft] = useState('');
  const [journal, setJournal] = useState('');
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [showStormy, setShowStormy] = useState(false);
  const [showGuestGate, setShowGuestGate] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [thinking, setThinking] = useState(false);
  const [crisisVisible, setCrisisVisible] = useState(false);
  const [alertSent, setAlertSent] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [journalEntries, setJournalEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [allSessions, setAllSessions] = useState([]);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [openEntryId, setOpenEntryId] = useState(null);
  const [entryTitle, setEntryTitle] = useState('');
  const threadEndRef = useRef(null);
  const controllerRef = useRef(null);

  const toggleTool = (key) => setOpenTool((cur) => (cur === key ? null : key));

  // Resolves any image_url / audio_url paths in a batch of loaded messages into signed URLs for display.
  const resolveImages = async (rows) => {
    return Promise.all(rows.map(async (m) => {
      let image = null;
      let audio = null;
      if (m.image_url) {
        const { data: signed, error } = await supabase.storage.from('media').createSignedUrl(m.image_url, 3600);
        if (error) console.error('image signed url failed:', error.message);
        else image = signed.signedUrl;
      }
      if (m.audio_url) {
        const { data: signed, error } = await supabase.storage.from('media').createSignedUrl(m.audio_url, 3600);
        if (error) console.error('audio signed url failed:', error.message);
        else audio = signed.signedUrl;
      }
      return { ...m, image, audio };
    }));
  };

  const loadSessions = useCallback(async () => {
    if (!session) return;
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
    if (error) { console.error('sessions load failed:', error.message); return; }
    if (titleErr) console.error('session titles load failed:', titleErr.message);
    const titleMap = new Map((titleRows || []).map((r) => [r.session_id, r.title]));

    const bySession = new Map();
    (data || []).forEach((m) => {
      if (!m.session_id) return;
      if (!bySession.has(m.session_id)) bySession.set(m.session_id, { firstUser: null, last: m });
      const entry = bySession.get(m.session_id);
      if (!entry.firstUser && m.from_role === 'user') entry.firstUser = m;
      entry.last = m;
    });

    const items = Array.from(bySession.entries())
      .sort((a, b) => new Date(b[1].last.created_at) - new Date(a[1].last.created_at))
      .map(([sessionId, entry]) => {
        const snippetSrc = entry.firstUser?.text || entry.last.text || '[shared a drawing]';
        const snippet = snippetSrc.length > 60 ? snippetSrc.slice(0, 60) + '…' : snippetSrc;
        return { sessionId, date: formatDateLabel(entry.last.created_at), snippet, title: titleMap.get(sessionId) || null };
      });
    setAllSessions(items);
  }, [session]);

  const renameSession = async (sessionId, title) => {
    if (!session) return;
    const trimmed = title.trim();
    const { error } = await supabase
      .from('chat_session_titles')
      .upsert({ session_id: sessionId, user_id: session.user.id, title: trimmed || null, updated_at: new Date().toISOString() }, { onConflict: 'session_id' });
    if (error) { console.error('session rename failed:', error.message); return; }
    setAllSessions((s) => s.map((x) => (x.sessionId === sessionId ? { ...x, title: trimmed || null } : x)));
  };

  const loadSession = async (sessionId) => {
    if (!session) return;
    if (controllerRef.current) controllerRef.current.abort();
    const { data, error } = await supabase
      .from('messages')
      .select('id, from_role, text, image_url, audio_url, created_at')
      .eq('user_id', session.user.id)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (error) { console.error('session load failed:', error.message); return; }
    setActiveSessionId(sessionId);
    setEditingIndex(null);
    const resolved = await resolveImages(data || []);
    setThread(resolved.map((m) => ({ id: m.id, from: m.from_role === 'user' ? 'user' : 'wisp', text: m.text, image: m.image, audio: m.audio, created_at: m.created_at })));
  };

  const startNewChat = () => {
    if (controllerRef.current) controllerRef.current.abort();
    setActiveSessionId(crypto.randomUUID());
    setThread([GREETING]);
    setEditingIndex(null);
  };

  useEffect(() => {
    if (!session) return;
    setActiveSessionId(crypto.randomUUID());
    loadSessions();
    supabase
      .from('emergency_contacts')
      .select('contact_name, contact_email')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) { console.error('emergency contact load failed:', error.message); return; }
        if (data) { setContactName(data.contact_name || ''); setContactEmail(data.contact_email || ''); }
      });
  }, [session, loadSessions]);

  const loadJournalEntries = useCallback(async () => {
    if (!session) { setEntriesLoading(false); return; }
    setEntriesLoading(true);
    const { data, error } = await supabase
      .from('journal_entries')
      .select('id, type, title, text_content, media_path, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setEntriesLoading(false);
    if (error) { console.error('journal entries load failed:', error.message); return; }

    const resolved = await Promise.all(
      (data || []).map(async (e) => {
        let mediaUrl = null;
        if (e.media_path) {
          const { data: signed, error: signErr } = await supabase.storage.from('media').createSignedUrl(e.media_path, 3600);
          if (signErr) console.error('journal media signed url failed:', signErr.message);
          else mediaUrl = signed.signedUrl;
        }
        return { id: e.id, type: e.type, title: e.title, text_content: e.text_content, media_path: e.media_path, mediaUrl, date: formatDateLabel(e.created_at) };
      })
    );
    setJournalEntries(resolved);
  }, [session]);

  useEffect(() => { loadJournalEntries(); }, [loadJournalEntries]);

  const saveJournalEntry = async (type, textContent = null, mediaPath = null, title = null) => {
    if (!session) return;
    const { error } = await supabase
      .from('journal_entries')
      .insert({ user_id: session.user.id, type, title, text_content: textContent, media_path: mediaPath });
    if (error) { console.error('journal entry save failed:', error.message); return; }
    loadJournalEntries();
  };

  const updateJournalEntry = async (id, fields) => {
    if (!session) return;
    const { error } = await supabase.from('journal_entries').update(fields).eq('id', id);
    if (error) { console.error('journal entry update failed:', error.message); return; }
    setJournalEntries((entries) => entries.map((e) => (e.id === id ? { ...e, ...fields } : e)));
  };

  const deleteJournalEntry = async (id) => {
    if (!session) return;
    const entry = journalEntries.find((e) => e.id === id);
    setJournalEntries((entries) => entries.filter((e) => e.id !== id));
    if (editingEntryId === id) { setEditingEntryId(null); setJournal(''); }
    if (entry?.media_path) {
      const { error: storageErr } = await supabase.storage.from('media').remove([entry.media_path]);
      if (storageErr) console.error('journal media delete failed:', storageErr.message);
    }
    const { error } = await supabase.from('journal_entries').delete().eq('id', id);
    if (error) console.error('journal entry delete failed:', error.message);
  };

  const saveWrittenEntry = () => {
    const text = journal.trim();
    if (!text) return;
    if (editingEntryId) {
      updateJournalEntry(editingEntryId, { text_content: text });
    } else {
      saveJournalEntry('text', text);
    }
    setJournal('');
    setEditingEntryId(null);
  };

  const selectJournalEntry = (entry) => {
    setEditingEntryId(entry.id);
    setJournal(entry.text_content || '');
    setJournalTab('write');
  };

  const startNewJournalEntry = () => {
    setEditingEntryId(null);
    setJournal('');
    setJournalTab('write');
  };

  const addPhoto = async (src) => {
    if (isGuest) { setShowGuestGate(true); return; }
    setPhotos((p) => [...p, src]);
    if (!session) return;
    const blob = await (await fetch(src)).blob();
    const path = `${session.user.id}/journal-photo-${Date.now()}.png`;
    const { error: uploadErr } = await supabase.storage.from('media').upload(path, blob, { contentType: blob.type || 'image/png' });
    if (uploadErr) { console.error('journal photo upload failed:', uploadErr.message); return; }
    saveJournalEntry('photo', null, path);
  };
  const removePhoto = (i) => setPhotos((p) => p.filter((_, idx) => idx !== i));

  const guardGuestWrite = (nextValue) => {
    if (isGuest && nextValue.length === 1) { setShowGuestGate(true); return false; }
    return true;
  };

  useEffect(() => { threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [thread]);
  useEffect(() => { if (stormyStreak >= 3) setShowStormy(true); }, [stormyStreak]);

  // Returns { id, created_at } — imagePath/audioPath optional, for drawing-share and voice-share messages.
  const saveMessage = async (fromRole, text, imagePath = null, audioPath = null) => {
    if (!session) return null;
    const { data, error } = await supabase
      .from('messages')
      .insert({ user_id: session.user.id, session_id: activeSessionId, from_role: fromRole, text, image_url: imagePath, audio_url: audioPath })
      .select('id, created_at')
      .single();
    if (error) { console.error('message save failed:', error.message); return null; }
    return data;
  };

  // Called by VoiceNotes's "Send to Chat" — dataUrl is a full base64 audio data URL.
  const sendVoiceToChat = async (dataUrl, title) => {
    if (editingIndex !== null) return;
    setOpenTool(null);
    const optimisticUser = { from: 'user', text: title || null, image: null, audio: dataUrl, id: null, created_at: null };
    setThread((t) => [...t, optimisticUser]);
    setThinking(true);

    let audioPath = null;
    if (session) {
      const blob = await (await fetch(dataUrl)).blob();
      const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
      audioPath = `${session.user.id}/chat-voice-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('media').upload(audioPath, blob, { contentType: blob.type || 'audio/webm' });
      if (uploadErr) { console.error('chat voice upload failed:', uploadErr.message); audioPath = null; }
    }

    const savedUser = await saveMessage('user', title || null, null, audioPath);
    if (savedUser) setThread((t) => t.map((m) => (m === optimisticUser ? { ...m, ...savedUser } : m)));

    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const reply = await claudeRespondToVoice(dataUrl, controller.signal);
      const savedAi = await saveMessage('ai', reply);
      setThread((t) => [...t, { from: 'wisp', text: reply, image: null, audio: null, id: savedAi?.id ?? null, created_at: savedAi?.created_at ?? null }]);
      loadSessions();
    } catch (err) {
      if (err.name !== 'AbortError') setThread((t) => [...t, { from: 'wisp', text: "I'm having trouble listening to that right now — try again in a moment?", image: null, audio: null, id: null, created_at: null }]);
    } finally {
      setThinking(false);
      controllerRef.current = null;
    }
  };


  const runCrisisCheck = async (nextThread, triggerText, signal) => {
    const score = await claudeScore(nextThread, signal);
    if (score?.needs_alert && score.crisis_risk >= 7) {
      setCrisisVisible(true);
      if (contactName && contactEmail) {
        try {
          await sendEmergencyAlert(contactName, contactEmail, userName, triggerText, score.crisis_risk);
          setAlertSent(true);
        } catch (emailErr) {
          console.error('emergency alert email failed:', emailErr?.text || emailErr?.message || emailErr);
        }
      }
    }
  };

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || editingIndex !== null) return;
    const optimisticUser = { from: 'user', text, image: null, id: null, created_at: null };
    const nextThread = [...thread, optimisticUser];
    setThread(nextThread);
    setDraft('');
    setThinking(true);

    const savedUser = await saveMessage('user', text);
    if (savedUser) setThread((t) => t.map((m) => (m === optimisticUser ? { ...m, ...savedUser } : m)));

    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const [reply] = await Promise.all([claudeRespond(nextThread, controller.signal), runCrisisCheck(nextThread, text, controller.signal)]);
      const savedAi = await saveMessage('ai', reply);
      setThread((t) => [...t, { from: 'wisp', text: reply, image: null, id: savedAi?.id ?? null, created_at: savedAi?.created_at ?? null }]);
      loadSessions();
    } catch (err) {
      if (err.name !== 'AbortError') setThread((t) => [...t, { from: 'wisp', text: "I'm having trouble connecting right now, par main yahin hoon. Try again in a moment?", image: null, id: null, created_at: null }]);
    } finally {
      setThinking(false);
      controllerRef.current = null;
    }
  };

  // Called by DrawCanvas's "Send to Chat" — dataUrl is a full base64 PNG data URL.
  const sendDrawingToChat = async (dataUrl) => {
    if (editingIndex !== null) return;
    setOpenTool(null);
    const optimisticUser = { from: 'user', text: null, image: dataUrl, id: null, created_at: null };
    setThread((t) => [...t, optimisticUser]);
    setThinking(true);

    // Persist for real, in parallel with getting a reply — separate from the vision call itself,
    // since Groq needs the base64 data directly and can't fetch our private bucket.
    let imagePath = null;
    if (session) {
      const blob = await (await fetch(dataUrl)).blob();
      imagePath = `${session.user.id}/chat-drawing-${Date.now()}.png`;
      const { error: uploadErr } = await supabase.storage.from('media').upload(imagePath, blob, { contentType: 'image/png' });
      if (uploadErr) { console.error('chat drawing upload failed:', uploadErr.message); imagePath = null; }
    }

    const savedUser = await saveMessage('user', null, imagePath);
    if (savedUser) setThread((t) => t.map((m) => (m === optimisticUser ? { ...m, ...savedUser } : m)));

    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const reply = await claudeRespondToImage(dataUrl, controller.signal);
      const savedAi = await saveMessage('ai', reply);
      setThread((t) => [...t, { from: 'wisp', text: reply, image: null, id: savedAi?.id ?? null, created_at: savedAi?.created_at ?? null }]);
      loadSessions();
    } catch (err) {
      if (err.name !== 'AbortError') setThread((t) => [...t, { from: 'wisp', text: "I'm having trouble seeing that clearly right now — try again in a moment?", image: null, id: null, created_at: null }]);
    } finally {
      setThinking(false);
      controllerRef.current = null;
    }
  };

  const startEdit = (index) => {
    if (thread[index].from !== 'user' || thread[index].image || thread[index].audio || thinking) return; // image/audio messages aren't text-editable
    setEditingIndex(index);
    setEditingText(thread[index].text);
  };
  const cancelEdit = () => { setEditingIndex(null); setEditingText(''); };

  const saveEdit = async () => {
    const newText = editingText.trim();
    if (!newText || editingIndex === null) return;
    const index = editingIndex;
    const target = thread[index];
    if (controllerRef.current) controllerRef.current.abort();
    setEditingIndex(null);

    const truncated = thread.slice(0, index + 1).map((m, i) => (i === index ? { ...m, text: newText } : m));
    setThread(truncated);
    setThinking(true);

    if (session && target.created_at) {
      const { error: delErr } = await supabase.from('messages').delete().eq('user_id', session.user.id).eq('session_id', activeSessionId).gt('created_at', target.created_at);
      if (delErr) console.error('downstream delete failed:', delErr.message);
    }
    if (session && target.id) {
      const { error: updErr } = await supabase.from('messages').update({ text: newText }).eq('id', target.id);
      if (updErr) console.error('message update failed:', updErr.message);
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const [reply] = await Promise.all([claudeRespond(truncated, controller.signal), runCrisisCheck(truncated, newText, controller.signal)]);
      const savedAi = await saveMessage('ai', reply);
      setThread((t) => [...t, { from: 'wisp', text: reply, image: null, id: savedAi?.id ?? null, created_at: savedAi?.created_at ?? null }]);
      loadSessions();
    } catch (err) {
      if (err.name !== 'AbortError') setThread((t) => [...t, { from: 'wisp', text: "I'm having trouble connecting right now, par main yahin hoon. Try again in a moment?", image: null, id: null, created_at: null }]);
    } finally {
      setThinking(false);
      controllerRef.current = null;
    }
  };

  const deleteSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this chat?')) return;
    if (sessionId === activeSessionId) startNewChat();
    setAllSessions((s) => s.filter((x) => x.sessionId !== sessionId));
    const { error } = await supabase.from('messages').delete().eq('user_id', session.user.id).eq('session_id', sessionId);
    if (error) console.error('delete chat failed:', error.message);
    const { error: titleErr } = await supabase.from('chat_session_titles').delete().eq('user_id', session.user.id).eq('session_id', sessionId);
    if (titleErr) console.error('delete chat title failed:', titleErr.message);
  };

  return (
    <div className="app app-shell flex flex-col" data-theme={theme} data-mode={mode}>
      <MoodBackground showCelestial={false} />
      <Header onSignOut={() => { signOut(); navigate('/'); }} showMoodSwitcher
        right={
          <button onClick={() => setResponding((r) => !r)} className="flex items-center gap-2 px-3.5 py-2 rounded-full text-[12.5px] font-semibold cursor-pointer"
            style={responding ? { background: 'var(--ink)', color: 'var(--ink-text)' } : { background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text)' }}>
            <span className="w-6 h-3.5 rounded-full relative shrink-0" style={{ background: responding ? 'rgba(255,255,255,0.25)' : 'var(--card-border)' }}>
              <span className="absolute top-0.5 w-2.5 h-2.5 rounded-full transition-transform" style={{ background: responding ? 'var(--ink-text)' : 'var(--accent-deep)', left: 2, transform: responding ? 'translateX(10px)' : 'translateX(0)' }} />
            </span>
            {responding ? 'Responding' : 'Quiet'}
          </button>
        } />

      <div className="relative z-10 px-9 -mt-2 mb-1 text-sm" style={{ color: 'var(--text-soft)' }}>
        Welcome back, {userName || 'Friend'} · feeling <span style={{ color: 'var(--accent-deep)', fontWeight: 600 }}>{mood}</span> today
      </div>

      <main className={`relative z-10 flex-1 p-6 px-9 min-h-0 ${responding ? 'grid gap-5 md:grid-cols-[1.7fr_1fr] grid-cols-1' : 'flex flex-col'}`}>
        {responding && (
          <section className="flex flex-col rounded-[22px] p-6 backdrop-blur-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: '0 20px 50px -30px rgba(80,50,10,0.3)' }}>
            {crisisVisible && (
              <div className="flex items-start justify-between gap-3 rounded-2xl px-4 py-3 mb-3.5 text-[12.5px] leading-relaxed" style={{ background: 'var(--surface-strong)', border: '1px solid var(--card-border)', color: 'var(--text-soft)' }}>
                <span>
                  🌙 It is understanble and you're not alone.
                  {alertSent && contactName && <span style={{ color: 'var(--accent-deep)' }}> · {contactName} ko quietly inform kar diya gaya hai.</span>}
                </span>
                <button onClick={() => setCrisisVisible(false)} style={{ color: 'var(--text-faint)' }}>✕</button>
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <div className="text-[11.5px] font-bold tracking-[1.4px] uppercase" style={{ color: 'var(--accent-deep)' }}>Chat with Wisp</div>
              <button onClick={startNewChat} className="text-[11.5px] font-semibold px-3 py-1.5 rounded-full" style={{ border: '1px solid var(--card-border)', color: 'var(--accent-deep)' }}>+ New Chat</button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-3 py-1.5 pr-1 min-h-40">
              {thread.map((m, i) => (
                <div key={m.id ?? `local-${i}`} className={`group max-w-[82%] px-4 py-3.5 rounded-2xl text-[14.5px] leading-relaxed relative ${m.from === 'user' ? 'self-end rounded-br-sm' : 'self-start rounded-bl-sm'}`}
                  style={m.from === 'wisp' ? { background: 'var(--surface-strong)', border: '1px solid var(--card-border)' } : { background: 'var(--ink)', color: 'var(--ink-text)' }}>
                  {editingIndex === i ? (
                    <div className="flex flex-col gap-2 min-w-50">
                      <input autoFocus value={editingText} onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                        className="bg-transparent outline-none border-b text-[14.5px]" style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'inherit' }} />
                      <div className="flex gap-2 text-[11px] font-semibold">
                        <button onClick={saveEdit} style={{ opacity: 0.9 }}>Save &amp; regenerate</button>
                        <button onClick={cancelEdit} style={{ opacity: 0.6 }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {m.image && <img src={m.image} alt="Shared drawing" className="rounded-xl mb-1.5 max-w-55" style={{ border: '1px solid rgba(255,255,255,0.15)' }} />}
                      {m.audio && <audio controls src={m.audio} className="mb-1.5 max-w-60 h-9" />}
                      {m.text}
                      {m.from === 'user' && !m.image && !m.audio && (
                        <button onClick={() => startEdit(i)} className="absolute -left-6 top-3 opacity-0 group-hover:opacity-60 hover:opacity-100! text-xs"
                          style={{ color: 'var(--text-soft)' }} aria-label="Edit message" title="Edit — will regenerate the reply after this">✎</button>
                      )}
                    </>
                  )}
                </div>
              ))}
              {thinking && (
                <div className="self-start px-4 py-3.5 rounded-2xl rounded-bl-sm text-[13.5px]" style={{ background: 'var(--surface-strong)', border: '1px solid var(--card-border)', color: 'var(--text-soft)' }}>thinking..</div>
              )}
              <div ref={threadEndRef} />
            </div>

            <div className="flex gap-2 mt-3">
              {TOOL_TABS.map((t) => (
                <button key={t.key} onClick={() => toggleTool(t.key)} className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={openTool === t.key ? { background: 'var(--ink)', color: 'var(--ink-text)' } : { border: '1px solid var(--card-border)', color: 'var(--text-soft)' }}>
                  <CategoryIcon type={t.type} />
                </button>
              ))}
            </div>
            <AnimatePresence>
              {openTool && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden rounded-2xl mt-2.5" style={{ background: 'var(--surface-strong)', border: '1px solid var(--card-border)' }}>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-[1.2px]" style={{ color: 'var(--accent-deep)' }}>
                        {openTool === 'write' ? 'Quick Note' : openTool === 'draw' ? 'Draw' : 'Voice Note'}
                      </span>
                      <button onClick={() => setOpenTool(null)} style={{ color: 'var(--text-faint)' }}>✕</button>
                    </div>
                    {openTool === 'write' && (
                      <textarea value={journal} onChange={(e) => { if (guardGuestWrite(e.target.value)) setJournal(e.target.value); }}
                        placeholder="Jot something down while you chat..." className="w-full resize-none outline-none border-none bg-transparent text-sm leading-relaxed min-h-25" style={{ color: 'var(--text)' }} />
                    )}
                    {openTool === 'draw' && (
                      isGuest ? <GuestLockedPane onUnlock={() => setShowGuestGate(true)} label="Sign in to save your drawings" /> : <DrawCanvas onSendToChat={sendDrawingToChat} onSaved={(path) => saveJournalEntry('drawing', null, path)} />
                    )}
                    {openTool === 'voice' && (
                      isGuest ? <GuestLockedPane onUnlock={() => setShowGuestGate(true)} label="Sign in to record voice notes" /> : <VoiceNotes onSaved={(path) => saveJournalEntry('voice', null, path)} onSendToChat={sendVoiceToChat} />
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-2.5 mt-3.5 rounded-full pl-4 pr-1.5 py-1.5" style={{ background: 'var(--surface-strong)', border: '1px solid var(--card-border)' }}>
              <input value={draft} onChange={(e) => { if (guardGuestWrite(e.target.value)) setDraft(e.target.value); }} onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Write something..." disabled={editingIndex !== null} className="flex-1 bg-transparent outline-none border-none text-sm" style={{ color: 'var(--text)' }} />
              <button onClick={sendMessage} disabled={editingIndex !== null} className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--ink)', color: 'var(--ink-text)' }} aria-label="Send">
                <svg viewBox="0 0 24 24" width={15} height={15} fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z" /></svg>
              </button>
            </div>
          </section>
        )}

        <AnimatePresence mode="wait">
          {responding ? (
            <motion.section key="side" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="rounded-[22px] p-6 flex flex-col gap-6 overflow-y-auto backdrop-blur-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: '0 20px 50px -30px rgba(80,50,10,0.3)' }}>
              <div>
                <div className="text-[11.5px] font-bold tracking-[1.4px] uppercase mb-4" style={{ color: 'var(--accent-deep)' }}>History</div>
                {allSessions.length === 0 && (
                  <div className="text-xs" style={{ color: 'var(--text-faint)' }}>{isGuest ? 'Sign in to save your chat history.' : 'Past chats will show up here.'}</div>
                )}
                {(showAllSessions ? allSessions : allSessions.slice(0, 2)).map((h) => (
                  <ChatHistoryItem key={h.sessionId} item={h} active={h.sessionId === activeSessionId} onOpen={loadSession} onDelete={deleteSession} onRename={renameSession} />
                ))}
                {allSessions.length > 2 && (
                  <button onClick={() => setShowAllSessions((v) => !v)} className="text-xs font-semibold mt-1" style={{ color: 'var(--accent-deep)' }}>
                    {showAllSessions ? '← Show less' : `View all (${allSessions.length}) →`}
                  </button>
                )}
              </div>

              <div>
                <div className="text-[11.5px] font-bold tracking-[1.4px] uppercase mb-4" style={{ color: 'var(--accent-deep)' }}>Add Photos</div>
                <PhotoRow photos={photos} onAdd={addPhoto} onRemove={removePhoto} />
              </div>

              <div>
                <div className="text-[11.5px] font-bold tracking-[1.4px] uppercase mb-4" style={{ color: 'var(--accent-deep)' }}>Explore More Features</div>
                <div className="grid grid-cols-2 gap-2.5">
                  {FEATURES.map((f) => (
                    <button key={f.key} onClick={() => navigate(f.path)} className="flex items-center gap-2.5 p-3.5 rounded-xl text-[13.5px] font-medium cursor-pointer transition-all hover:-translate-y-0.5"
                      style={{ background: 'var(--surface-strong)', border: '1px solid var(--card-border)' }}>
                      <span style={{ color: 'var(--accent-deep)' }}><FeatureIcon type={f.key} /></span>{f.label}<span className="ml-auto opacity-40">›</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.section>
          ) : (
            <motion.section key="journal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col md:flex-row w-full flex-1 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
              {/* Left: entries list — like Notes' middle pane */}
              <div className="w-full md:w-64 shrink-0 flex flex-col max-h-56 md:max-h-none overflow-hidden border-b md:border-b-0 md:border-r" style={{ background: 'var(--surface)', borderColor: 'var(--card-border)' }}>
                <div className="flex items-center justify-between px-4 py-3.5 shrink-0" style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <div>
                    <div className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>Journal</div>
                    <div className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
                      {journalEntries.filter((e) => e.type === 'text').length} entries
                    </div>
                  </div>
                  <button onClick={startNewJournalEntry} className="w-7 h-7 rounded-full flex items-center justify-center text-lg" style={{ color: 'var(--accent-deep)' }} title="New entry">+</button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {journalEntries.filter((e) => e.type === 'text').length === 0 && (
                    <div className="text-xs px-4 py-4" style={{ color: 'var(--text-faint)' }}>No entries yet.</div>
                  )}
                  {journalEntries.filter((e) => e.type === 'text').map((e) => (
                    <div key={e.id} className="group relative" style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <button
                        onClick={() => selectJournalEntry(e)}
                        className="w-full text-left px-4 py-3 pr-9 block"
                        style={{ background: editingEntryId === e.id ? 'var(--surface-strong)' : 'transparent' }}
                      >
                        <div className="text-[13.5px] font-semibold truncate" style={{ color: 'var(--text)' }}>
                          {e.title || (e.text_content ? e.text_content.slice(0, 28) : 'New Entry')}
                        </div>
                        <div className="text-[11.5px] mt-0.5 truncate" style={{ color: 'var(--text-faint)' }}>
                          {e.date}{e.text_content ? ` — ${e.text_content.slice(0, 34)}` : ''}
                        </div>
                      </button>
                      <button
                        onClick={() => { if (window.confirm('Delete this entry? This can\u2019t be undone.')) deleteJournalEntry(e.id); }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--text-faint)' }}
                        title="Delete entry"
                      >
                        <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0-.8 12.1a2 2 0 0 1-2 1.9H8.8a2 2 0 0 1-2-1.9L6 7" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: editor pane — like Notes' main pane */}
              <div className="flex-1 flex flex-col p-8" style={{ background: 'var(--card-bg)' }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    {[{ key: 'write', type: 'text' }, { key: 'draw', type: 'drawing' }, { key: 'voice', type: 'voice' }].map((t) => (
                      <button key={t.key} onClick={() => setJournalTab(t.key)}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                        style={journalTab === t.key ? { background: 'var(--surface-strong)', color: 'var(--accent-deep)' } : { color: 'var(--text-faint)' }}>
                        <CategoryIcon type={t.type} />
                      </button>
                    ))}
                    {journalTab === 'write' && <PhotoRow small photos={photos} onAdd={addPhoto} onRemove={removePhoto} />}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setResponding(true)} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-70" style={{ color: 'var(--text-soft)' }} title="Resume chatting">
                      <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    </button>
                    <button onClick={() => setShowHistory(true)} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-70" style={{ color: 'var(--text-soft)' }} title="Full history">
                      <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.2 2" /></svg>
                    </button>
                  </div>
                </div>

                <div className="text-center text-[13px] mb-4" style={{ color: 'var(--text-faint)' }}>
                  {new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}, {new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </div>

                <div className="flex-1 min-h-55 flex flex-col">
                  {journalTab === 'write' && (
                    <textarea value={journal} onChange={(e) => { if (guardGuestWrite(e.target.value)) setJournal(e.target.value); }}
                      placeholder="Start typing" className="flex-1 resize-none outline-none border-none bg-transparent text-[16px] leading-relaxed" style={{ color: 'var(--text)' }} />
                  )}
                  {journalTab === 'draw' && (isGuest ? <GuestLockedPane onUnlock={() => setShowGuestGate(true)} label="Sign in to save your drawings" /> : <DrawCanvas onSaved={(path) => saveJournalEntry('drawing', null, path)} />)}
                  {journalTab === 'voice' && (isGuest ? <GuestLockedPane onUnlock={() => setShowGuestGate(true)} label="Sign in to record voice notes" /> : <VoiceNotes onSaved={(path) => saveJournalEntry('voice', null, path)} />)}
                </div>

                {journalTab === 'write' && (
                  <div className="flex justify-end pt-3 mt-3" style={{ borderTop: '1px solid var(--card-border)' }}>
                    <button onClick={saveWrittenEntry} disabled={!journal.trim()} className="text-[13.5px] font-semibold px-3 py-1.5"
                      style={{ color: 'var(--accent-deep)', opacity: journal.trim() ? 1 : 0.4 }}>
                      {editingEntryId ? 'Save changes' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <HelpButton />
      <FloatingHope />
      <StormyAlert open={showStormy} onClose={() => setShowStormy(false)} />
      <GuestSignInPrompt open={showGuestGate} onClose={() => setShowGuestGate(false)} />
      {showHistory && (
        <HistoryOverlay entries={journalEntries} loading={entriesLoading} onClose={() => setShowHistory(false)} onUpdate={updateJournalEntry} onDelete={deleteJournalEntry} />
      )}
    </div>
  );
}