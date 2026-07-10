import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PULL_THRESHOLD = 70;

function LampIcon({ isOn, pull }) {
  return (
    <svg width="90" height="150" viewBox="0 0 90 150" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
      {/* fixed ceiling wire */}
      <line x1="45" y1="0" x2="45" y2="18" stroke="#7A6A50" strokeWidth="2" />
      {/* shade */}
      <path
        d="M23 40 L67 40 L59 18 L31 18 Z"
        fill={isOn ? '#F0A857' : '#3A342A'}
        stroke="#7A6A50"
        strokeWidth="1.5"
      />
      {/* bulb glow */}
      <AnimatePresence>
        {isOn && (
          <motion.circle
            cx="45" cy="52" r="30"
            fill="url(#lampGlow)"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>
      <circle cx="45" cy="46" r="7" fill={isOn ? '#FFF3D6' : '#5C5646'} />

      {/* pull string, stretches slightly as it's dragged */}
      <line x1="45" y1="48" x2="45" y2={48 + 55 + pull} stroke="#8C7B5E" strokeWidth="1.5" />
      <defs>
        <radialGradient id="lampGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE9B0" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FFE9B0" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/**
 * The entry interaction: a hanging lamp with a pull-string.
 * Drag the little knob down far enough and the lamp turns on,
 * which triggers the reveal of the NoCaps landing experience.
 */
export default function LampToggle({ onLit }) {
  const [isOn, setIsOn] = useState(false);
  const [pull, setPull] = useState(0);

  const handleDrag = (_, info) => {
    if (isOn) return;
    setPull(Math.max(0, Math.min(info.offset.y, PULL_THRESHOLD + 20)));
  };

  const handleDragEnd = (_, info) => {
    if (isOn) return;
    if (info.offset.y >= PULL_THRESHOLD) {
      setIsOn(true);
      setPull(PULL_THRESHOLD);
      setTimeout(() => onLit?.(), 650);
    } else {
      setPull(0);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black relative overflow-hidden">
      <AnimatePresence>
        {isOn && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 50% 30%, rgba(255,233,176,0.35), transparent 60%)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col items-center gap-10 z-10">
        <div className="relative flex flex-col items-center">
          <LampIcon isOn={isOn} pull={pull} />
          {/* draggable knob at the end of the string */}
          <motion.div
            drag={isOn ? false : 'y'}
            dragConstraints={{ top: 0, bottom: PULL_THRESHOLD + 20 }}
            dragElastic={0.15}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            animate={{ y: isOn ? PULL_THRESHOLD : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="absolute cursor-grab active:cursor-grabbing rounded-full"
            style={{
              top: 148 + 55, width: 16, height: 16,
              background: '#B08D57', border: '2px solid #7A6A50',
              boxShadow: isOn ? '0 0 14px 4px var(--glow, rgba(230,190,120,0.5))' : 'none',
            }}
            aria-label={isOn ? 'Lamp is on' : 'Pull to turn the lamp on'}
            role="button"
          />
        </div>

        <motion.p
          className="text-[#B8AF9C] text-sm tracking-[0.2em] uppercase text-center"
          style={{ fontFamily: 'var(--font-body)' }}
          animate={{ opacity: isOn ? 0 : 1 }}
          transition={{ duration: 0.4 }}
        >
          Pull the string to let the light in
        </motion.p>
      </div>
    </div>
  );
}
