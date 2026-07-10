import { useEffect, useRef, useState } from 'react';

const COLORS = ['#2B2B24', '#B5672A', '#5C7350', '#556577', '#A9AEC2'];

export default function DrawCanvas() {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(3);
  const [tool, setTool] = useState('pen'); // 'pen' | 'eraser'

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
      // restore drawing after resize where possible
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = prev;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <button
          onClick={() => setTool('pen')}
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
          style={{ background: tool === 'pen' ? 'var(--ink)' : 'var(--surface)', color: tool === 'pen' ? 'var(--ink-text)' : 'var(--text)', border: '1px solid var(--card-border)' }}
          aria-label="Pen"
        >
          ✏️
        </button>
        <button
          onClick={() => setTool('eraser')}
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
          style={{ background: tool === 'eraser' ? 'var(--ink)' : 'var(--surface)', color: tool === 'eraser' ? 'var(--ink-text)' : 'var(--text)', border: '1px solid var(--card-border)' }}
          aria-label="Eraser"
        >
          🧼
        </button>
        <div className="w-px h-6" style={{ background: 'var(--card-border)' }} />
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => { setColor(c); setTool('pen'); }}
            aria-label={`Colour ${c}`}
            className="w-6 h-6 rounded-full flex-shrink-0"
            style={{ background: c, border: color === c && tool === 'pen' ? '2px solid var(--accent-deep)' : '1px solid var(--card-border)' }}
          />
        ))}
        <input
          type="range" min={1} max={10} value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          className="mx-2 w-24"
        />
        <button
          onClick={clear}
          className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-full"
          style={{ border: '1px solid var(--card-border)', color: 'var(--text-soft)' }}
        >
          Clear All
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="flex-1 w-full rounded-2xl touch-none min-h-[180px]"
        style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', cursor: 'crosshair' }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      />
    </div>
  );
}
