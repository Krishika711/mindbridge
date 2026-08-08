import { useNavigate } from 'react-router-dom';
import MoodBackground from '../components/MoodBackground';
import Header from '../components/Header';
import { HelpButton } from '../components/ui/Misc';
import { useMood } from '../context/MoodContext';

export default function AboutUs() {
  const navigate = useNavigate();
  const { theme, mode } = useMood();

  return (
    <div className="app app-shell flex flex-col" data-theme={theme} data-mode={mode}>
      <MoodBackground showCelestial={false} />
      <Header />

      <main className="relative z-10 flex-1 flex flex-col items-center px-6 py-14">
        <div className="w-full max-w-xl">
          <button onClick={() => navigate(-1)} className="text-sm mb-8" style={{ color: 'var(--text-soft)' }}>← Back</button>

          <h1 className="mb-6" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'clamp(32px, 5vw, 46px)' }}>
            About MindBridge+
          </h1>

          <div className="flex flex-col gap-5 text-[16px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>
            <p>
              MindBridge+ started as a simple idea: not every thought needs an audience, and not every
              feeling needs to be fixed right away. Sometimes you just need somewhere quiet to put it down.
            </p>
            <p>
              We built this as a space with zero pressure — no streaks to keep up, no one grading your
              mood, no algorithm deciding what you should feel next. Just a place that gently changes
              with you, whether today is a sunny one or a stormy one.
            </p>
            <p>
              Everything here — the moods, the journal, the people you trust, the good moments you save
              for harder days — belongs to you. We're just here to hold the space.
            </p>
            <p className="italic" style={{ fontFamily: 'var(--font-display)', fontSize: 19, color: 'var(--accent-deep)' }}>
              — the MindBridge+ team
            </p>
          </div>
        </div>
      </main>

      <HelpButton />
    </div>
  );
}
