import { useEffect, useRef, useState } from 'react';
import { useMood } from '../context/MoodContext';
import { supabase } from '../lib/supabaseClient';

const MIME_PREFERENCES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

function pickSupportedMimeType() {
  if (!window.MediaRecorder) return '';
  for (const type of MIME_PREFERENCES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return ''; // let the browser pick its own default if none of these are supported
}

function extFromMime(mime) {
  if (mime.includes('mp4')) return 'm4a';
  if (mime.includes('ogg')) return 'ogg';
  return 'webm';
}

export default function VoiceNotes({ onSaved } = {}) {
  const { session } = useMood();
  const [notes, setNotes] = useState([]);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const actualMimeType = useRef('audio/webm'); // updated to whatever the browser really uses, per recording

  const loadNotes = async () => {
    if (!session) { setLoading(false); return; }
    setLoading(true);
    const { data, error: loadErr } = await supabase
      .from('voice_notes')
      .select('id, storage_path, title, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setLoading(false);
    if (loadErr) { console.error('voice notes load failed:', loadErr.message); return; }

    const withUrls = await Promise.all(
      (data || []).map(async (n) => {
        const { data: signed, error: signErr } = await supabase.storage.from('media').createSignedUrl(n.storage_path, 3600);
        if (signErr) { console.error('signed url failed:', signErr.message); return null; }
        return {
          id: n.id,
          storagePath: n.storage_path,
          url: signed.signedUrl,
          title: n.title || '',
          dateLabel: new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
          timeLabel: new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      })
    );
    setNotes(withUrls.filter(Boolean));
  };

  useEffect(() => { loadNotes(); }, [session]);

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType = pickSupportedMimeType();
      const rec = preferredType ? new MediaRecorder(stream, { mimeType: preferredType }) : new MediaRecorder(stream);
      actualMimeType.current = rec.mimeType || preferredType || 'audio/webm'; // what the browser is ACTUALLY producing
      chunks.current = [];
      rec.ondataavailable = (e) => chunks.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const mime = actualMimeType.current;
        const blob = new Blob(chunks.current, { type: mime });

        if (!session) {
          const url = URL.createObjectURL(blob);
          const now = new Date();
          setNotes((n) => [{
            id: `local-${Date.now()}`, url, title: '',
            dateLabel: now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
            timeLabel: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }, ...n]);
          return;
        }

        const path = `${session.user.id}/voice-${Date.now()}.${extFromMime(mime)}`;
        const { error: uploadErr } = await supabase.storage.from('media').upload(path, blob, { contentType: mime });
        if (uploadErr) { console.error('voice note upload failed:', uploadErr.message); setError('Save nahi hua — dobara try karo.'); return; }

        const { data: inserted, error: insertErr } = await supabase
          .from('voice_notes')
          .insert({ user_id: session.user.id, storage_path: path, title: '' })
          .select('id, created_at')
          .single();
        if (insertErr) { console.error('voice note record save failed:', insertErr.message); return; }

        // Also index this note into the unified journal_entries history, so it shows up
        // under History → Voice Notes alongside written entries, drawings, and photos.
        onSaved?.(path);

        const { data: signed } = await supabase.storage.from('media').createSignedUrl(path, 3600);
        const now = new Date(inserted.created_at);
        setNotes((n) => [{
          id: inserted.id, storagePath: path, url: signed?.signedUrl, title: '',
          dateLabel: now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
          timeLabel: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }, ...n]);
      };
      mediaRecorder.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setError("Couldn't access your microphone. Check your browser permissions.");
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setRecording(false);
  };

  const updateTitle = async (id, title) => {
    setNotes((n) => n.map((note) => (note.id === id ? { ...note, title } : note)));
    if (!session || String(id).startsWith('local-')) return;
    const { error: updErr } = await supabase.from('voice_notes').update({ title }).eq('id', id);
    if (updErr) console.error('voice note title save failed:', updErr.message);
  };

  const deleteNote = async (note) => {
    setNotes((n) => n.filter((x) => x.id !== note.id));
    if (!session || String(note.id).startsWith('local-')) return;
    const { error: storageErr } = await supabase.storage.from('media').remove([note.storagePath]);
    if (storageErr) console.error('voice note file delete failed:', storageErr.message);
    const { error: rowErr } = await supabase.from('voice_notes').delete().eq('id', note.id);
    if (rowErr) console.error('voice note record delete failed:', rowErr.message);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col items-center justify-center gap-3 py-6">
        <button
          onClick={recording ? stopRecording : startRecording}
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
          style={{ background: recording ? '#C0523A' : 'var(--ink)', color: recording ? '#fff' : 'var(--ink-text)', animation: recording ? 'lanternFlicker 1.2s ease-in-out infinite' : 'none' }}
          aria-label={recording ? 'Stop recording' : 'Start recording'}
        >
          {recording ? '■' : '🎙️'}
        </button>
        <p className="text-sm" style={{ color: 'var(--text-soft)' }}>{recording ? 'Recording… tap to stop' : 'Tap to record a voice note'}</p>
        {error && <p className="text-xs" style={{ color: '#C0523A' }}>{error}</p>}
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-2.5">
        {loading && <p className="text-xs text-center" style={{ color: 'var(--text-faint)' }}>Loading…</p>}
        {!loading && notes.map((n) => (
          <div key={n.id} className="flex flex-col gap-1.5 rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
            <div className="flex items-center justify-between gap-2">
              <input value={n.title} onChange={(e) => updateTitle(n.id, e.target.value)} placeholder="Untitled voice note"
                className="flex-1 bg-transparent outline-none border-none text-[13px] font-semibold" style={{ color: 'var(--text)' }} />
              <button onClick={() => deleteNote(n)} className="text-xs shrink-0" style={{ color: 'var(--text-faint)' }} aria-label="Delete">✕</button>
            </div>
            <div className="flex items-center gap-3">
              <audio controls src={n.url} className="flex-1 h-9" style={{ maxWidth: '100%' }} />
              <span className="text-[11px] shrink-0 whitespace-nowrap" style={{ color: 'var(--text-faint)' }}>{n.dateLabel} · {n.timeLabel}</span>
            </div>
          </div>
        ))}
        {!loading && !notes.length && <p className="text-xs text-center mt-2" style={{ color: 'var(--text-faint)' }}>No voice notes yet.</p>}
      </div>
    </div>
  );
}