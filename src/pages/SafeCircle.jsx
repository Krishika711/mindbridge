import { useEffect, useState } from 'react';
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

export default function SafeCircle() {
  const navigate = useNavigate();
  const { theme, mode, session, userName } = useMood();
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
      setError('Name aur email dono chahiye.');
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

          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: 'var(--ink)', color: 'var(--ink-text)' }}>🤝</div>
            <h1 className="text-3xl" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Safe Circle</h1>
          </div>
          <p className="mb-2" style={{ color: 'var(--text-soft)' }}>Your trusted support network</p>
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
        </div>
      </main>

      <HelpButton />
    </div>
  );
}