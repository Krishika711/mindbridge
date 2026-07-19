import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import emailjs from 'emailjs-com';
import MoodBackground from '../components/MoodBackground';
import Header from '../components/Header';
import { HelpButton } from '../components/ui/Misc';
import { useMood } from '../context/MoodContext';
import { supabase } from '../lib/supabaseClient';

const TABS = [
  { key: 'circle', label: 'My Circle' },
  { key: 'vault', label: 'Comfort Vault' },
];

async function sendInviteEmail(contact, inviterName) {
  emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY);
  const inviteLink = `${window.location.origin}/support/${contact.link_token}`;
  return emailjs.send(
    import.meta.env.VITE_EMAILJS_SERVICE_ID,
    import.meta.env.VITE_EMAILJS_INVITE_TEMPLATE_ID,
    { to_name: contact.name, to_email: contact.email, inviter_name: inviterName || 'Someone who trusts you', invite_link: inviteLink, app_name: 'MindBridge+' }
  );
}

function formatDateLabel(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function ComfortVault() {
  const { session } = useMood();
  const [tracks, setTracks] = useState([]); // real audio from voice_notes
  const [current, setCurrent] = useState(0);
  const [tapes, setTapes] = useState([]); // text/photo/letter liner notes from hope_vault_tapes
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data: notes, error: notesErr } = await supabase
        .from('voice_notes')
        .select('id, storage_path, title, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (notesErr) console.error('vault voice notes load failed:', notesErr.message);

      const resolvedTracks = await Promise.all(
        (notes || []).map(async (n) => {
          const { data: signed, error: signErr } = await supabase.storage.from('media').createSignedUrl(n.storage_path, 3600);
          if (signErr) { console.error('vault signed url failed:', signErr.message); return null; }
          return { id: n.id, url: signed.signedUrl, title: n.title || 'Untitled voice note', date: formatDateLabel(n.created_at) };
        })
      );
      setTracks(resolvedTracks.filter(Boolean));

      const { data: tapeRows, error: tapesErr } = await supabase
        .from('hope_vault_tapes')
        .select('id, text_scrap, photo_path, letter, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (tapesErr) console.error('vault tapes load failed:', tapesErr.message);

      const resolvedTapes = await Promise.all(
        (tapeRows || [])
          .filter((t) => t.text_scrap || t.photo_path || t.letter)
          .map(async (t) => {
            let photoUrl = null;
            if (t.photo_path) {
              const { data: signed } = await supabase.storage.from('media').createSignedUrl(t.photo_path, 3600);
              photoUrl = signed?.signedUrl || null;
            }
            return { id: t.id, text: t.text_scrap, photo: photoUrl, letter: t.letter, date: formatDateLabel(t.created_at) };
          })
      );
      setTapes(resolvedTapes);
      setLoading(false);
    })();
  }, [session]);

  if (loading) return <p className="text-sm text-center py-10" style={{ color: 'var(--text-faint)' }}>Loading your vault…</p>;

  if (tracks.length === 0 && tapes.length === 0) {
    return (
      <div className="rounded-3xl p-10 text-center backdrop-blur-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        <p className="text-sm" style={{ color: 'var(--text-soft)' }}>Nothing filed away yet — record a voice note or add a tape in Hope Vault, and it'll show up here for a harder day.</p>
      </div>
    );
  }

  const track = tracks[current];

  return (
    <div className="flex flex-col gap-6">
      {tracks.length > 0 && (
        <div className="rounded-3xl p-7 backdrop-blur-md flex flex-col items-center gap-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="text-[11px] font-semibold tracking-[1.4px] uppercase" style={{ color: 'var(--accent-deep)' }}>🎧 Your own voice, from a better day</div>
          <div className="text-center">
            <div className="font-semibold text-lg" style={{ fontFamily: 'var(--font-display)' }}>{track.title}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>{track.date} · {current + 1} of {tracks.length}</div>
          </div>
          <audio key={track.id} controls autoPlay={false} src={track.url} className="w-full max-w-sm" />
          <div className="flex gap-3">
            <button
              onClick={() => setCurrent((c) => (c - 1 + tracks.length) % tracks.length)}
              disabled={tracks.length < 2}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ border: '1px solid var(--card-border)', color: 'var(--text)', opacity: tracks.length < 2 ? 0.3 : 1 }}
            >⏮</button>
            <button
              onClick={() => setCurrent((c) => (c + 1) % tracks.length)}
              disabled={tracks.length < 2}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ border: '1px solid var(--card-border)', color: 'var(--text)', opacity: tracks.length < 2 ? 0.3 : 1 }}
            >⏭</button>
          </div>
        </div>
      )}

      {tapes.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold tracking-[1.4px] uppercase mb-3" style={{ color: 'var(--accent-deep)' }}>💌 Liner notes</div>
          <div className="grid sm:grid-cols-2 gap-3">
            {tapes.map((t) => (
              <div key={t.id} className="rounded-2xl p-4 flex flex-col gap-2.5" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
                {t.photo && <img src={t.photo} alt="" className="w-full h-28 object-cover rounded-xl" />}
                {t.text && <p className="italic text-sm leading-relaxed" style={{ fontFamily: 'var(--font-display)' }}>"{t.text}"</p>}
                {t.letter && <div className="text-sm" style={{ color: 'var(--text-soft)' }}>✉️ {t.letter}</div>}
                <div className="text-xs" style={{ color: 'var(--text-faint)' }}>{t.date}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SafeCircle() {
  const navigate = useNavigate();
  const { theme, mode, session, userName } = useMood();
  const [tab, setTab] = useState('circle');
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
    if (!name.trim() || !email.trim()) { setError('Name aur email dono chahiye.'); return; }
    if (circle.length >= 5) { setError('Circle already has 5 people — the max.'); return; }
    setSaving(true);
    const { data, error: insertErr } = await supabase
      .from('safe_circle_contacts')
      .insert({ user_id: session.user.id, name: name.trim(), role: role.trim() || null, email: email.trim() })
      .select('id, name, role, email, link_token')
      .single();

    if (insertErr) { setError(insertErr.message); setSaving(false); return; }

    try {
      await sendInviteEmail(data, userName);
    } catch (emailErr) {
      console.error('invite email failed:', emailErr.message || emailErr);
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

          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: 'var(--ink)', color: 'var(--ink-text)' }}>🤝</div>
            <h1 className="text-3xl" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Safe Circle</h1>
          </div>

          <div className="flex gap-2 mb-6 flex-wrap">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold"
                style={tab === t.key ? { background: 'var(--ink)', color: 'var(--ink-text)' } : { border: '1px solid var(--card-border)', color: 'var(--text-soft)' }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'circle' && (
            <>
              <p className="mb-6 max-w-lg text-[15px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>
                Designate up to five people you trust completely. They don't need an account — they get a private
                link to send you a small, wordless signal of support whenever you need it.
              </p>

              <div className="rounded-3xl p-6 backdrop-blur-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                <div className="text-[11px] font-semibold tracking-[1.4px] uppercase mb-4" style={{ color: 'var(--accent-deep)' }}>
                  YOUR CIRCLE ({circle.length} OF 5)
                </div>

                {circle.length === 0 && <div className="text-sm mb-4" style={{ color: 'var(--text-faint)' }}>Nobody added yet.</div>}

                <div className="flex flex-col gap-3">
                  {circle.map((p) => (
                    <div key={p.id} className="group flex items-center justify-between rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold" style={{ background: 'var(--card-border)' }}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-[15px]">{p.name}</div>
                          <div className="text-xs" style={{ color: 'var(--text-faint)' }}>{p.role || 'Invited'}</div>
                        </div>
                      </div>
                      <button onClick={() => removePerson(p.id)} className="text-xs opacity-0 group-hover:opacity-100 transition-opacity px-2" style={{ color: 'var(--text-faint)' }}>Remove</button>
                    </div>
                  ))}
                </div>

                {!showForm && circle.length < 5 && (
                  <button onClick={() => setShowForm(true)} className="mt-4 flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--accent-deep)' }}>
                    <span className="text-lg leading-none">+</span> Add person
                  </button>
                )}

                {showForm && (
                  <div className="mt-4 rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (e.g. Priya)"
                      className="w-full text-[13px] rounded-xl px-3.5 py-2.5 outline-none mb-2" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text)' }} />
                    <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Relationship (e.g. Best friend) — optional"
                      className="w-full text-[13px] rounded-xl px-3.5 py-2.5 outline-none mb-2" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text)' }} />
                    <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="their@email.com" type="email"
                      className="w-full text-[13px] rounded-xl px-3.5 py-2.5 outline-none mb-3" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text)' }} />
                    {error && <p className="text-xs mb-2.5" style={{ color: '#C0523A' }}>{error}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => { setShowForm(false); setError(''); }} className="flex-1 py-2 rounded-full text-[13px] font-semibold" style={{ border: '1px solid var(--card-border)', color: 'var(--text)' }}>Cancel</button>
                      <button onClick={addPerson} disabled={saving} className="flex-1 py-2 rounded-full text-[13px] font-semibold" style={{ background: 'var(--ink)', color: 'var(--ink-text)', opacity: saving ? 0.6 : 1 }}>
                        {saving ? 'Sending invite…' : 'Add & send invite'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {tab === 'vault' && (
            <>
              <p className="mb-6 max-w-lg text-[15px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>
                Your own recorded voice and saved moments from better days — kept here for when you need reminding.
              </p>
              <ComfortVault />
            </>
          )}
        </div>
      </main>

      <HelpButton />
    </div>
  );
}
