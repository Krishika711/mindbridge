import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MoodBackground from '../components/MoodBackground';
import Header from '../components/Header';
import { HelpButton } from '../components/ui/Misc';
import { useMood } from '../context/MoodContext';

export default function CalmSpace() {
  const navigate = useNavigate();
  const { theme, mode } = useMood();
  const [flowMode, setFlowMode] = useState(false);
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  const handleKeyDown = (e) => {
    if (flowMode && (e.key === 'Backspace' || e.key === 'Delete')) {
      e.preventDefault();
    }
  };

  const handleFinish = () => {
    setFlowMode(false);
    setText('');
  };

  return (
    <div className="app app-shell flex flex-col" data-theme={theme} data-mode={mode}>
      <MoodBackground showCelestial={false} />
      <Header showBack showMoodSwitcher />

      <main className="relative z-10 flex-1 flex flex-col items-center px-6 py-10">
        <div className="w-full max-w-2xl">
          <button onClick={() => navigate(-1)} className="text-sm mb-6" style={{ color: 'var(--text-soft)' }}>← Back</button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: 'var(--ink)', color: 'var(--ink-text)' }}>🌙</div>
            <h1 className="text-3xl" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Calm Space</h1>
          </div>
          <p className="mb-8 max-w-lg text-[15px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>
            Continuous Flow Mode is built for overthinking and writer's block. Once you turn it on, backspace is
            disabled and your words fade as you type — a pure, unfiltered release with nothing to go back and edit.
          </p>

          {!flowMode ? (
            <div className="rounded-3xl p-10 flex flex-col items-center gap-5 text-center backdrop-blur-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              <p className="text-sm max-w-xs" style={{ color: 'var(--text-soft)' }}>
                Ready to let it out without stopping to edit or judge?
              </p>
              <button
                onClick={() => { setFlowMode(true); setTimeout(() => textareaRef.current?.focus(), 50); }}
                className="px-7 py-3 rounded-full text-sm font-medium"
                style={{ background: 'var(--ink)', color: 'var(--ink-text)' }}
              >
                Start Continuous Flow
              </button>
            </div>
          ) : (
            <div className="rounded-3xl p-8 backdrop-blur-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              <div className="text-xs mb-4" style={{ color: 'var(--text-faint)' }}>Backspace is off. Just keep going.</div>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Start typing and don't stop…"
                className="w-full resize-none outline-none border-none bg-transparent italic text-xl leading-relaxed min-h-[220px]"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
              />
              <button
                onClick={handleFinish}
                className="mt-4 px-6 py-2.5 rounded-full text-[13.5px] font-semibold"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text)' }}
              >
                Release &amp; Finish
              </button>
            </div>
          )}
        </div>
      </main>

      <HelpButton />
    </div>
  );
}
