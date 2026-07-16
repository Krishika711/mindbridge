import { useNavigate } from 'react-router-dom';
import { useMood } from '../context/MoodContext';
import { IconCircleButton } from './ui/Buttons';
import { MoodSwitcher } from './ui/Misc';

function BrandMark() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
      <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.9" />
      <path d="M8 13c0-3 2-5.5 6-6-0.5 4-3 6-6 6z" fill="var(--bg1)" />
    </svg>
  );
}

export default function Header({ showBack = false, onSignOut, right, showMoodSwitcher = false }) {
  const navigate = useNavigate();
  const { mode, toggleMode, session, isGuest } = useMood();

  return (
    <header className="relative z-30 flex items-center justify-between px-9 py-5">
      <div
        className="flex items-center gap-2.5 cursor-pointer"
        style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontStyle: 'italic', fontSize: 21, color: 'var(--accent-deep)' }}
        onClick={() => navigate('/space')}
      >
        <BrandMark />
        MindBridge+
        {showBack && <span className="text-sm not-italic ml-2 opacity-60" style={{ fontFamily: 'var(--font-body)' }}>· back</span>}
      </div>
      <div className="flex items-center gap-2.5">
        {right}
        {showMoodSwitcher && <MoodSwitcher />}
        <IconCircleButton onClick={toggleMode} aria-label="Toggle dark mode">
          {mode === 'light' ? '🌙' : '☀️'}
        </IconCircleButton>
        {(session || isGuest) && (
          <IconCircleButton onClick={() => navigate('/profile')} aria-label="Profile">
            👤
          </IconCircleButton>
        )}
        {onSignOut && (
          <button
            className="text-[13.5px] bg-transparent border-none cursor-pointer"
            style={{ color: 'var(--text-soft)' }}
            onClick={onSignOut}
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}