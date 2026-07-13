import { useRef, useState } from 'react';

export default function VoiceNotes() {
  const [notes, setNotes] = useState([]);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => chunks.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const now = new Date();
        setNotes((n) => [
          {
            id: Date.now(),
            url,
            title: '',
            dateLabel: now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
            timeLabel: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          ...n,
        ]);
        stream.getTracks().forEach((t) => t.stop());
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

  const deleteNote = (id) => setNotes((n) => n.filter((note) => note.id !== id));
  const updateTitle = (id, title) => setNotes((n) => n.map((note) => (note.id === id ? { ...note, title } : note)));

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col items-center justify-center gap-3 py-6">
        <button
          onClick={recording ? stopRecording : startRecording}
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
          style={{
            background: recording ? '#C0523A' : 'var(--ink)',
            color: recording ? '#fff' : 'var(--ink-text)',
            animation: recording ? 'lanternFlicker 1.2s ease-in-out infinite' : 'none',
          }}
          aria-label={recording ? 'Stop recording' : 'Start recording'}
        >
          {recording ? '■' : '🎙️'}
        </button>
        <p className="text-sm" style={{ color: 'var(--text-soft)' }}>
          {recording ? 'Recording… tap to stop' : 'Tap to record a voice note'}
        </p>
        {error && <p className="text-xs" style={{ color: '#C0523A' }}>{error}</p>}
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-2.5">
        {notes.map((n) => (
          <div key={n.id} className="flex flex-col gap-1.5 rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
            <div className="flex items-center justify-between gap-2">
              <input
                value={n.title}
                onChange={(e) => updateTitle(n.id, e.target.value)}
                placeholder="Untitled voice note"
                className="flex-1 bg-transparent outline-none border-none text-[13px] font-semibold"
                style={{ color: 'var(--text)' }}
              />
              <button onClick={() => deleteNote(n.id)} className="text-xs flex-shrink-0" style={{ color: 'var(--text-faint)' }} aria-label="Delete">✕</button>
            </div>
            <div className="flex items-center gap-3">
              <audio controls src={n.url} className="flex-1 h-9" style={{ maxWidth: '100%' }} />
              <span className="text-[11px] flex-shrink-0 whitespace-nowrap" style={{ color: 'var(--text-faint)' }}>
                {n.dateLabel} · {n.timeLabel}
              </span>
            </div>
          </div>
        ))}
        {!notes.length && <p className="text-xs text-center mt-2" style={{ color: 'var(--text-faint)' }}>No voice notes yet.</p>}
      </div>
    </div>
  );
}