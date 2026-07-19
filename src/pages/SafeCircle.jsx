import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import emailjs from 'emailjs-com';
import MoodBackground from '../components/MoodBackground';
import Header from '../components/Header';
import { HelpButton } from '../components/ui/Misc';
import { useMood } from '../context/MoodContext';
import { supabase } from '../lib/supabaseClient';

async function sendInviteEmail(contact, inviterName) {
  emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY);
  const inviteLink = `${window.location.origin}/support/${contact.link_token}`;
  return emailjs.send(
    import.meta.env.VITE_EMAILJS_SERVICE_ID,
    import.meta.env.VITE_EMAILJS_INVITE_TEMPLATE_ID,
    {
      to_name: contact.name,
      to_email: contact.email,
      inviter_name: inviterName || 'Someone who trusts you',
      invite_link: inviteLink,
      app_name: 'MindBridge+',
    }
  );
}

// ---------- Hope Vault tapes (read / listen / watch) ----------

const TAPE_COLORS = ['#E6A93A', '#D98E4A', '#8CA283', '#7CA24A', '#D4537E', '#F0997B', '#C9A66B', '#7C93A2'];

function formatDateLabel(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatMonthLabel(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function GossipCard({ tape }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
      <p className="italic text-[15px] leading-relaxed mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
        "{tape.text}"
      </p>
      <div className="text-xs" style={{ color: 'var(--text-faint)' }}>{tape.date}</div>
    </div>
  );
}

function PhotoThumb({ tape, onOpen }) {
  return (
    <button
      onClick={() => onOpen(tape)}
      className="bg-white p-2 pb-6 text-left"
      style={{ transform: 'rotate(-1deg)', boxShadow: '0 10px 22px -10px rgba(0,0,0,0.3)' }}
    >
      <div className="w-full aspect-square bg-cover bg-center" style={{ backgroundImage: `url(${tape.photo})` }} />
      <div className="text-center mt-2 text-sm" style={{ fontFamily: 'var(--font-hand, cursive)', color: '#4a3c22' }}>{tape.date}</div>
    </button>
  );
}

function PhotoLightbox({ tape, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white p-3 pb-8 relative"
        style={{ width: 'min(360px, 90vw)', boxShadow: '0 30px 70px -20px rgba(0,0,0,0.5)' }}
      >
        <button onClick={onClose} className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-sm" style={{ background: 'rgba(0,0,0,0.06)', color: '#4a3c22' }}>✕</button>
        <img src={tape.photo} alt="" className="w-full aspect-square object-cover" />
        <div className="text-center mt-3 text-lg" style={{ fontFamily: 'var(--font-hand, cursive)', color: '#4a3c22' }}>{tape.date}</div>
      </div>
    </div>
  );
}

// Walkman-style player for Yaps (voice tapes)
function WalkmanPlayer({ yaps }) {
  const [activeTape, setActiveTape] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [rewinding, setRewinding] = useState(false);
  const rewindTimeoutRef = useRef(null);

  useEffect(() => () => clearTimeout(rewindTimeoutRef.current), []);

  const months = [...new Set(yaps.map((t) => t.month))];

  const insertTape = (tape) => {
    setActiveTape(tape);
    setPlaying(false);
  };
  const handlePlay = () => { if (activeTape) setPlaying(true); };
  const handlePause = () => setPlaying(false);
  const handleStop = () => { setPlaying(false); setActiveTape(null); };
  const handleRewind = () => {
    if (!activeTape) return;
    setRewinding(true);
    rewindTimeoutRef.current = setTimeout(() => setRewinding(false), 900);
  };
  const handleShuffle = () => {
    if (!yaps.length) return;
    insertTape(yaps[Math.floor(Math.random() * yaps.length)]);
  };

  return (
    <div className="flex gap-5 flex-wrap items-start justify-center">
      <style>{`
        @keyframes scReelSpin { to { transform: rotate(360deg); } }
        @keyframes scReelSpinRev { to { transform: rotate(-360deg); } }
        @keyframes scEqBounce { 0%, 100% { height: 20%; } 50% { height: 90%; } }
        .sc-reel.spin { animation: scReelSpin 1.6s linear infinite; }
        .sc-reel.spin.rev { animation: scReelSpinRev 0.5s linear infinite; }
        .sc-eq span { width: 3px; background: var(--accent); opacity: 0.3; border-radius: 1px; height: 20%; display: block; transition: opacity 0.3s ease; }
        .sc-eq.active span { opacity: 0.9; animation: scEqBounce 0.9s ease-in-out infinite; }
        .sc-eq.active span:nth-child(1) { animation-delay: 0s; }
        .sc-eq.active span:nth-child(2) { animation-delay: 0.12s; }
        .sc-eq.active span:nth-child(3) { animation-delay: 0.24s; }
        .sc-eq.active span:nth-child(4) { animation-delay: 0.08s; }
        .sc-eq.active span:nth-child(5) { animation-delay: 0.2s; }
        .sc-mini-tape:hover { background: var(--surface); }
      `}</style>

      {/* Walkman device */}
      <div
        className="rounded-3xl p-5 relative shrink-0"
        style={{ width: 260, background: 'var(--ink)', boxShadow: '0 30px 70px -25px rgba(0,0,0,0.45)', border: '1px solid var(--card-border)' }}
      >
        <div className="rounded-xl mb-3 px-3.5 py-3" style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="text-[9px] tracking-[2px] uppercase mb-1" style={{ color: 'var(--accent)', opacity: 0.9 }}>Now playing</div>
          <div className="text-[15px] italic mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--ink-text)', minHeight: 20 }}>
            {activeTape ? activeTape.voice : 'Insert a tape'}
          </div>
          <div className={`sc-eq flex items-end gap-1 h-4 ${playing ? 'active' : ''}`}>
            {[0, 1, 2, 3, 4].map((i) => <span key={i} />)}
          </div>
        </div>

        <div className="rounded-xl mb-3 p-3.5" style={{ background: 'rgba(0,0,0,0.4)', boxShadow: 'inset 0 4px 14px rgba(0,0,0,0.35)' }}>
          {!activeTape ? (
            <div className="text-center py-6 text-[11px] tracking-wide" style={{ color: 'var(--ink-text)', opacity: 0.6 }}>
              insert a tape ↓
            </div>
          ) : (
            <div className="rounded-lg p-3" style={{ background: 'linear-gradient(160deg,#e8ddc4,#cbbd98)' }}>
              <div className="rounded px-2 py-1.5 mb-2.5 text-center" style={{ background: '#fbf5e5' }}>
                <div className="text-[15px] truncate" style={{ fontFamily: 'var(--font-hand, cursive)', color: '#4a3c22' }}>
                  {activeTape.voice}
                </div>
              </div>
              <div className="flex items-center justify-between px-2">
                <div
                  className={`sc-reel ${playing ? 'spin' : ''} ${rewinding ? 'rev' : ''}`}
                  style={{ width: 40, height: 40, borderRadius: '50%', background: 'radial-gradient(circle,#2a251c 0 26%, #59503c 28% 55%, #2a251c 58% 100%)' }}
                />
                <div className="flex-1 mx-1.5" style={{ height: 3, background: '#2a251c', borderRadius: 2 }} />
                <div
                  className={`sc-reel ${playing ? 'spin' : ''} ${rewinding ? 'rev' : ''}`}
                  style={{ width: 40, height: 40, borderRadius: '50%', background: 'radial-gradient(circle,#2a251c 0 26%, #59503c 28% 55%, #2a251c 58% 100%)' }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-1.5 justify-center">
          {[
            { label: '▶', onClick: handlePlay, title: 'Play' },
            { label: '⏸', onClick: handlePause, title: 'Pause' },
            { label: '⏪', onClick: handleRewind, title: 'Rewind' },
            { label: '⏹', onClick: handleStop, title: 'Eject / stop' },
          ].map((b) => (
            <button
              key={b.title}
              onClick={b.onClick}
              disabled={!activeTape}
              title={b.title}
              className="w-10 h-9 rounded-lg flex items-center justify-center text-sm"
              style={{ background: 'rgba(0,0,0,0.35)', color: 'var(--accent)', border: '1px solid rgba(255,255,255,0.1)', opacity: activeTape ? 1 : 0.4 }}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Archive */}
      {yaps.length > 0 && (
        <div
          className="rounded-2xl p-4 shrink-0"
          style={{ width: 240, maxHeight: 360, overflowY: 'auto', background: 'var(--ink)', border: '1px solid var(--card-border)' }}
        >
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="text-[10.5px] tracking-[1.4px] uppercase" style={{ color: 'var(--text-faint)' }}>Archive</div>
            <button
              onClick={handleShuffle}
              className="text-[10.5px] px-2.5 py-1 rounded-full flex items-center gap-1"
              style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'var(--accent)' }}
            >
              🎲 Random tape
            </button>
          </div>

          {months.map((month) => (
            <div key={month} className="mb-3.5">
              <div className="text-[13px] italic mb-1.5" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-soft)' }}>{month}</div>
              {yaps.filter((t) => t.month === month).map((t) => (
                <div
                  key={t.id}
                  onClick={() => insertTape(t)}
                  className="sc-mini-tape flex items-center gap-2 p-1.5 rounded-lg cursor-pointer mb-1"
                  style={{ background: activeTape?.id === t.id ? 'rgba(255,255,255,0.08)' : 'transparent' }}
                >
                  <div className="rounded-sm shrink-0 relative" style={{ width: 30, height: 20, background: 'linear-gradient(160deg,#e8ddc4,#cbbd98)' }}>
                    <div style={{ position: 'absolute', top: 2, left: 2, right: 2, height: 4, borderRadius: 2, background: t.color }} />
                  </div>
                  <div className="text-[11px] leading-tight" style={{ color: 'var(--text-soft)' }}>
                    <b className="block text-[12px] truncate" style={{ color: 'var(--ink-text)', maxWidth: 150 }}>{t.voice}</b>
                    {t.date}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HopeVaultTapes({ session }) {
  const [tapes, setTapes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('gossips');
  const [lightboxTape, setLightboxTape] = useState(null);

  useEffect(() => {
    const loadTapes = async () => {
      if (!session) { setLoading(false); return; }
      setLoading(true);
      const { data, error } = await supabase
        .from('hope_vault_tapes')
        .select('id, voice_caption, text_scrap, photo_path, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      setLoading(false);
      if (error) { console.error('vault tapes load failed:', error.message); return; }

      const resolved = await Promise.all(
        (data || []).map(async (t, i) => {
          let photoUrl = null;
          if (t.photo_path) {
            const { data: signed, error: signErr } = await supabase.storage.from('media').createSignedUrl(t.photo_path, 3600);
            if (signErr) console.error('vault photo signed url failed:', signErr.message);
            else photoUrl = signed.signedUrl;
          }
          return {
            id: t.id,
            voice: t.voice_caption,
            text: t.text_scrap,
            photo: photoUrl,
            date: formatDateLabel(t.created_at),
            month: formatMonthLabel(t.created_at),
            color: TAPE_COLORS[i % TAPE_COLORS.length],
          };
        })
      );
      setTapes(resolved);
    };
    loadTapes();
  }, [session]);

  const gossips = tapes.filter((t) => t.text);
  const yaps = tapes.filter((t) => t.voice);
  const photos = tapes.filter((t) => t.photo);

  const CATEGORIES = [
    { key: 'gossips', label: 'Gossips', icon: '📝', items: gossips, hint: 'Text scraps you can read.' },
    { key: 'yaps', label: 'Yaps', icon: '🎙️', items: yaps, hint: 'Voice notes you can listen to.' },
    { key: 'photos', label: 'Photos', icon: '📷', items: photos, hint: 'Snapshots you can watch back.' },
  ];
  const active = CATEGORIES.find((c) => c.key === category) || CATEGORIES[0];

  return (
    <div className="rounded-3xl p-6 backdrop-blur-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      <div className="text-[11px] font-semibold tracking-[1.4px] uppercase mb-1" style={{ color: 'var(--accent-deep)' }}>
        Hope Vault Tapes
      </div>
      <p className="text-xs mb-4" style={{ color: 'var(--text-faint)' }}>
        Everything you've filed in your Hope Vault, sorted so you can read, listen, and watch it back.
      </p>

      {!session && (
        <p className="text-sm" style={{ color: 'var(--text-faint)' }}>Sign in to load your Hope Vault tapes here.</p>
      )}

      {session && (
        <>
          <div className="flex gap-2 mb-5 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className="px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1.5"
                style={
                  category === c.key
                    ? { background: 'var(--ink)', color: 'var(--ink-text)' }
                    : { border: '1px solid var(--card-border)', color: 'var(--text)' }
                }
              >
                <span>{c.icon}</span> {c.label} ({c.items.length})
              </button>
            ))}
          </div>

          {loading && <p className="text-sm" style={{ color: 'var(--text-faint)' }}>Loading tapes…</p>}

          {!loading && (
            <>
              <p className="text-xs mb-3" style={{ color: 'var(--text-faint)' }}>{active.hint}</p>

              {active.items.length === 0 && (
                <p className="text-sm" style={{ color: 'var(--text-faint)' }}>
                  No {active.label.toLowerCase()} filed yet — add some in Hope Vault first.
                </p>
              )}

              {category === 'gossips' && gossips.length > 0 && (
                <div className="flex flex-col gap-3">
                  {gossips.map((t) => <GossipCard key={t.id} tape={t} />)}
                </div>
              )}

              {category === 'yaps' && yaps.length > 0 && <WalkmanPlayer yaps={yaps} />}

              {category === 'photos' && photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {photos.map((t) => <PhotoThumb key={t.id} tape={t} onOpen={setLightboxTape} />)}
                </div>
              )}
            </>
          )}
        </>
      )}

      {lightboxTape && <PhotoLightbox tape={lightboxTape} onClose={() => setLightboxTape(null)} />}
    </div>
  );
}

// ---------- Safe Circle page ----------

export default function SafeCircle() {
  const navigate = useNavigate();
  const { theme, mode, session, userName } = useMood();
  const [tab, setTab] = useState('circle'); // 'circle' | 'vault'
  const [circle, setCircle] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadCircle = async () => {
    if (!session) return;
    const { data, error: loadErr } = await supabase
      .from('safe_circle_contacts')
      .select('id, name, role, email, link_token, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true });
    if (loadErr) { console.error('circle load failed:', loadErr.message); return; }
    setCircle(data || []);
  };

  useEffect(() => { loadCircle(); }, [session]);

  const addPerson = async () => {
    setError('');
    if (!name.trim() || !email.trim()) {
      setError('Both Name and email are required.');
      return;
    }
    if (circle.length >= 5) {
      setError('Circle already has 5 people — the max.');
      return;
    }
    setSaving(true);
    const { data, error: insertErr } = await supabase
      .from('safe_circle_contacts')
      .insert({ user_id: session.user.id, name: name.trim(), role: role.trim() || null, email: email.trim() })
      .select('id, name, role, email, link_token')
      .single();

    if (insertErr) {
      setError(insertErr.message);
      setSaving(false);
      return;
    }

    try {
      await sendInviteEmail(data, userName);
    } catch (emailErr) {
      console.error('invite email failed:', emailErr.message || emailErr);
      // contact is still saved even if the email fails — don't lose the add over a mail glitch
    }

    setCircle((c) => [...c, data]);
    setName(''); setRole(''); setEmail('');
    setShowForm(false);
    setSaving(false);
  };

  const removePerson = async (id) => {
    setCircle((c) => c.filter((p) => p.id !== id));
    const { error: delErr } = await supabase.from('safe_circle_contacts').delete().eq('id', id);
    if (delErr) console.error('remove contact failed:', delErr.message);
  };

  return (
    <div className="app app-shell flex flex-col" data-theme={theme} data-mode={mode}>
      <MoodBackground showCelestial={false} />
      <Header showBack showMoodSwitcher />

      <main className="relative z-10 flex-1 flex flex-col items-center px-6 py-10">
        <div className="w-full max-w-2xl">
          <button onClick={() => navigate(-1)} className="text-sm mb-6" style={{ color: 'var(--text-soft)' }}>← Back</button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: 'var(--ink)', color: 'var(--ink-text)' }}>🤝🏻</div>
            <h1 className="text-3xl" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Safe Circle</h1>
          </div>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setTab('circle')}
              className="px-5 py-2.5 rounded-full text-sm font-semibold"
              style={tab === 'circle' ? { background: 'var(--ink)', color: 'var(--ink-text)' } : { border: '1px solid var(--card-border)', color: 'var(--text)' }}
            >
              My Circle
            </button>
            <button
              onClick={() => setTab('vault')}
              className="px-5 py-2.5 rounded-full text-sm font-semibold"
              style={tab === 'vault' ? { background: 'var(--ink)', color: 'var(--ink-text)' } : { border: '1px solid var(--card-border)', color: 'var(--text)' }}
            >
              Hope Vault Tapes
            </button>
          </div>

          {tab === 'circle' ? (
            <>
              <p className="mb-8 max-w-lg text-[15px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>
                Designate up to five people you trust completely. They don't need an account — they get a private
                link to send you a small, wordless signal of support whenever you need it, no messages, no pressure.
              </p>

              <div className="rounded-3xl p-6 backdrop-blur-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                <div className="text-[11px] font-semibold tracking-[1.4px] uppercase mb-4" style={{ color: 'var(--accent-deep)' }}>
                  YOUR CIRCLE ({circle.length} OF 5)
                </div>

                {circle.length === 0 && (
                  <div className="text-sm mb-4" style={{ color: 'var(--text-faint)' }}>Nobody added yet.</div>
                )}

                <div className="flex flex-col gap-3">
                  {circle.map((p) => (
                    <div
                      key={p.id}
                      className="group flex items-center justify-between rounded-2xl p-4"
                      style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold" style={{ background: 'var(--card-border)' }}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-[15px]">{p.name}</div>
                          <div className="text-xs" style={{ color: 'var(--text-faint)' }}>{p.role || 'Invited'}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => removePerson(p.id)}
                        className="text-xs opacity-0 group-hover:opacity-100 transition-opacity px-2"
                        style={{ color: 'var(--text-faint)' }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                {!showForm && circle.length < 5 && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="mt-4 flex items-center gap-2 text-sm font-medium"
                    style={{ color: 'var(--accent-deep)' }}
                  >
                    <span className="text-lg leading-none">+</span> Add person
                  </button>
                )}

                {showForm && (
                  <div className="mt-4 rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Name (e.g. Priya)"
                      className="w-full text-[13px] rounded-xl px-3.5 py-2.5 outline-none mb-2"
                      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text)' }}
                    />
                    <input
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="Relationship (e.g. Best friend) — optional"
                      className="w-full text-[13px] rounded-xl px-3.5 py-2.5 outline-none mb-2"
                      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text)' }}
                    />
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="their@email.com"
                      type="email"
                      className="w-full text-[13px] rounded-xl px-3.5 py-2.5 outline-none mb-3"
                      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text)' }}
                    />
                    {error && <p className="text-xs mb-2.5" style={{ color: '#C0523A' }}>{error}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowForm(false); setError(''); }}
                        className="flex-1 py-2 rounded-full text-[13px] font-semibold"
                        style={{ border: '1px solid var(--card-border)', color: 'var(--text)' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={addPerson}
                        disabled={saving}
                        className="flex-1 py-2 rounded-full text-[13px] font-semibold"
                        style={{ background: 'var(--ink)', color: 'var(--ink-text)', opacity: saving ? 0.6 : 1 }}
                      >
                        {saving ? 'Sending invite…' : 'Add & send invite'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <HopeVaultTapes session={session} />
          )}
        </div>
      </main>

      <HelpButton />
    </div>
  );
}