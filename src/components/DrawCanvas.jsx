import { useEffect, useRef, useState } from 'react';
import { useMood } from '../context/MoodContext';
import { supabase } from '../lib/supabaseClient';

const COLORS = ['#2B2B24', '#B5672A', '#5C7350', '#556577', '#A9AEC2'];

export default function DrawCanvas({ onSendToChat, onSaved }) {
  const { session } = useMood();
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(3);
  const [tool, setTool] = useState('pen');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [gallery, setGallery] = useState([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      const prev = canvas.toDataURL();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      const ctx = canvas.getContext('2d');
      ctx.scale(ratio, ratio);
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = prev;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const loadGallery = async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from('drawings')
      .select('id, storage_path, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(8);
    if (error) { console.error('drawings load failed:', error.message); return; }
    const withUrls = await Promise.all(
      (data || []).map(async (d) => {
        const { data: signed, error: signErr } = await supabase.storage.from('media').createSignedUrl(d.storage_path, 3600);
        if (signErr) { console.error('signed url failed:', signErr.message); return null; }
        return { id: d.id, storagePath: d.storage_path, url: signed.signedUrl };
      })
    );
    setGallery(withUrls.filter(Boolean));
  };

  useEffect(() => { loadGallery(); }, [session]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  };

  const start = (e) => {
    drawing.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getPos(e);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = size * 3;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
    }
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => { drawing.current = false; };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const isBlank = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 0) return false; // any non-transparent pixel means something's drawn
    }
    return true;
  };

  const saveDrawing = () => {
    if (!session || isBlank()) return;
    const canvas = canvasRef.current;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      setSaving(true);
      const path = `${session.user.id}/drawing-${Date.now()}.png`;
      const { error: uploadErr } = await supabase.storage.from('media').upload(path, blob, { contentType: 'image/png' });
      if (uploadErr) { console.error('drawing upload failed:', uploadErr.message); setSaving(false); return; }
      const { error: insertErr } = await supabase.from('drawings').insert({ user_id: session.user.id, storage_path: path });
      if (insertErr) console.error('drawing record save failed:', insertErr.message);

      // Also index this drawing into the unified journal_entries history, so it shows up
      // under History → Drawings alongside written entries, voice notes, and photos.
      onSaved?.(path);

      setSaving(false);
      clear();
      loadGallery();
    }, 'image/png');
  };

  const sendToChat = () => {
    if (!onSendToChat || isBlank()) return;
    const canvas = canvasRef.current;
    setSending(true);
    canvas.toBlob(async (blob) => {
      if (!blob) { setSending(false); return; }
      const reader = new FileReader();
      reader.onload = async () => {
        await onSendToChat(reader.result); // full base64 data URL, parent handles the rest
        setSending(false);
        clear();
      };
      reader.readAsDataURL(blob);
    }, 'image/png');
  };

  const deleteDrawing = async (item) => {
    setGallery((g) => g.filter((d) => d.id !== item.id));
    const { error: storageErr } = await supabase.storage.from('media').remove([item.storagePath]);
    if (storageErr) console.error('drawing file delete failed:', storageErr.message);
    const { error: rowErr } = await supabase.from('drawings').delete().eq('id', item.id);
    if (rowErr) console.error('drawing record delete failed:', rowErr.message);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <button onClick={() => setTool('pen')} className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
          style={{ background: tool === 'pen' ? 'var(--ink)' : 'var(--surface)', color: tool === 'pen' ? 'var(--ink-text)' : 'var(--text)', border: '1px solid var(--card-border)' }} aria-label="Pen">✏️</button>
        <button onClick={() => setTool('eraser')} className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
          style={{ background: tool === 'eraser' ? 'var(--ink)' : 'var(--surface)', color: tool === 'eraser' ? 'var(--ink-text)' : 'var(--text)', border: '1px solid var(--card-border)' }} aria-label="Eraser">🧼</button>
        <div className="w-px h-6" style={{ background: 'var(--card-border)' }} />
        {COLORS.map((c) => (
          <button key={c} onClick={() => { setColor(c); setTool('pen'); }} aria-label={`Colour ${c}`} className="w-6 h-6 rounded-full shrink-0"
            style={{ background: c, border: color === c && tool === 'pen' ? '2px solid var(--accent-deep)' : '1px solid var(--card-border)' }} />
        ))}
        <input type="range" min={1} max={10} value={size} onChange={(e) => setSize(Number(e.target.value))} className="mx-2 w-24" />
        <button onClick={clear} className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ border: '1px solid var(--card-border)', color: 'var(--text-soft)' }}>Clear All</button>
        <div className="ml-auto flex gap-2">
          {onSendToChat && (
            <button onClick={sendToChat} disabled={sending} className="text-xs font-semibold px-3.5 py-1.5 rounded-full"
              style={{ border: '1px solid var(--card-border)', color: 'var(--accent-deep)', opacity: sending ? 0.6 : 1 }}>
              {sending ? 'Sending…' : 'Send to Chat'}
            </button>
          )}
          <button onClick={saveDrawing} disabled={saving} className="text-xs font-semibold px-3.5 py-1.5 rounded-full"
            style={{ background: 'var(--ink)', color: 'var(--ink-text)', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      <canvas ref={canvasRef} className="flex-1 w-full rounded-2xl touch-none min-h-45" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', cursor: 'crosshair' }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end} onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
      {gallery.length > 0 && (
        <div className="flex gap-2.5 mt-3 overflow-x-auto pb-1">
          {gallery.map((d) => (
            <div key={d.id} className="relative shrink-0 group">
              <img src={d.url} alt="" className="w-16 h-16 rounded-xl object-cover" style={{ border: '1px solid var(--card-border)' }} />
              <button onClick={() => deleteDrawing(d)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }} aria-label="Delete drawing">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}