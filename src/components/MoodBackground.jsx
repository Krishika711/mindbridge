import { useEffect, useRef, useState } from 'react';
import { useMood } from '../context/MoodContext';

const BLADE_TONES = [
  'linear-gradient(to top,#6E9640,#A9C97E)',
  'linear-gradient(to top,#7CA24A,#B8D68C)',
  'linear-gradient(to top,#5F8A3B,#96BE6E)',
  'linear-gradient(to top,#82A857,#C3DB9C)',
];
const PETAL_COLORS = ['#FBFAF4', '#F6D9E4', '#F3E3B8', '#E7DFF2'];

function rand(min, max) { return min + Math.random() * (max - min); }

function buildJoyful() {
  const items = [];
  for (let i = 0; i < 34; i++) {
    const h = rand(34, 88);
    const lean = rand(-3, 3).toFixed(1);
    items.push({
      key: `blade-${i}`,
      style: {
        left: `${i * 3.05 + rand(0, 1.4)}%`, bottom: '-4px',
        width: `${rand(4, 7)}px`, height: `${h}px`,
        background: BLADE_TONES[i % BLADE_TONES.length],
        borderRadius: '60% 40% 0 0', transformOrigin: 'bottom center',
        transform: `rotate(${lean}deg)`, opacity: rand(0.75, 0.95),
        animation: `sway ${rand(3, 5.5)}s ease-in-out infinite`, animationDelay: `${rand(0, 2).toFixed(2)}s`,
        position: 'absolute',
      },
    });
  }
  for (let i = 0; i < 14; i++) {
    const petal = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
    items.push({
      key: `flower-${i}`,
      style: {
        left: `${rand(2, 96)}%`, bottom: `${rand(2, 24)}px`, width: '5px', height: '5px', borderRadius: '50%',
        background: '#F2B23C', opacity: rand(0.7, 0.95),
        boxShadow: `-4.5px -2.5px 0 0 ${petal}, 4.5px -2.5px 0 0 ${petal}, -4.5px 2.5px 0 0 ${petal}, 4.5px 2.5px 0 0 ${petal}`,
        animation: `sway ${rand(4, 6.5)}s ease-in-out infinite`, animationDelay: `${rand(0, 2).toFixed(2)}s`,
        position: 'absolute',
      },
    });
  }
  for (let i = 0; i < 4; i++) {
    items.push({
      key: `butterfly-${i}`,
      isEmoji: true, emoji: '🦋',
      style: {
        left: `${rand(10, 80)}%`, top: `${rand(20, 60)}%`, fontSize: `${rand(18, 26)}px`,
        animation: `flutter ${rand(6, 9)}s ease-in-out infinite`, animationDelay: `${rand(0, 3)}s`,
        position: 'absolute',
      },
    });
  }
  return items;
}

function buildNeutral() {
  const items = [];
  for (let i = 0; i < 10; i++) {
    items.push({
      key: `leaf-${i}`, isEmoji: true, emoji: '🍃',
      style: {
        left: `${rand(0, 100)}%`, top: '-30px', fontSize: `${rand(14, 24)}px`, opacity: 0.6,
        animation: `driftDown ${rand(10, 18)}s linear infinite`, animationDelay: `${rand(0, 8)}s`,
        position: 'absolute',
      },
    });
  }
  return items;
}

function buildAnxious() {
  const items = [];
  for (let i = 0; i < 14; i++) {
    const top = rand(0, 90);
    items.push({
      key: `wind-${i}`,
      style: {
        left: '-10%', top: `${top}%`, width: `${rand(60, 140)}px`, height: '2px',
        background: 'linear-gradient(90deg, transparent, rgba(85,101,119,0.55), transparent)',
        animation: `windBlow ${rand(2, 3.8)}s linear infinite`, animationDelay: `${rand(0, 2)}s`,
        position: 'absolute',
      },
    });
  }
  return items;
}

function buildSad() {
  const items = [];
  for (let i = 0; i < 60; i++) {
    items.push({
      key: `rain-${i}`,
      style: {
        left: `${rand(0, 100)}%`, top: '-10%', width: '1.5px', height: `${rand(16, 30)}px`,
        background: 'linear-gradient(to bottom, transparent, rgba(200,215,240,0.55))',
        animation: `rainFall ${rand(0.6, 1.2)}s linear infinite`, animationDelay: `${rand(0, 1.5)}s`,
        position: 'absolute',
      },
    });
  }
  items.push({
    key: 'lantern',
    style: {
      left: '8%', bottom: '6%', width: '60px', height: '60px', borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(240,168,87,0.55), transparent 70%)',
      animation: 'lanternFlicker 3.2s ease-in-out infinite',
      position: 'absolute',
    },
  });
  return items;
}

function buildNumb() {
  const items = [];
  for (let i = 0; i < 8; i++) {
    items.push({
      key: `mist-${i}`,
      style: {
        left: `${rand(0, 100)}%`, top: `${rand(0, 90)}%`,
        width: `${rand(40, 100)}px`, height: `${rand(40, 100)}px`, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.35), transparent 70%)',
        animation: `mistDrift ${rand(18, 28)}s ease-in-out infinite`,
        position: 'absolute',
      },
    });
  }
  return items;
}

const BUILDERS = { joyful: buildJoyful, neutral: buildNeutral, anxious: buildAnxious, sad: buildSad, numb: buildNumb };

/**
 * Renders the ambient mood layer: soft grain, drifting celestial body,
 * mood-specific particles, and a lightning flash overlay for stormy days.
 * Drop this as the first child inside any element with the .app-shell class.
 */
export default function MoodBackground({ showCelestial = true }) {
  const { theme } = useMood();
  const [particles, setParticles] = useState([]);
  const [flash, setFlash] = useState(false);
  const lightningTimer = useRef(null);

  useEffect(() => {
    setParticles(BUILDERS[theme] ? BUILDERS[theme]() : []);

    if (theme === 'sad') {
      const strike = () => {
        setFlash(false);
        requestAnimationFrame(() => setFlash(true));
      };
      const first = setTimeout(strike, 900);
      lightningTimer.current = setInterval(strike, 4500 + Math.random() * 3500);
      return () => { clearTimeout(first); clearInterval(lightningTimer.current); };
    }
    return undefined;
  }, [theme]);

  const celestialVisible = showCelestial && theme === 'joyful';
  const cloudCoverVisible = showCelestial && theme === 'numb';

  return (
    <>
      <div className="grain" />
      {showCelestial && (
        <div
          className="absolute z-0 rounded-full pointer-events-none"
          style={{
            top: '8%', right: '9%', width: 150, height: 150,
            background: 'radial-gradient(circle at 35% 30%, #FDEFC8, #F3C978 55%, #E7A94F 100%)',
            boxShadow: celestialVisible ? '0 0 90px 30px var(--glow)' : 'none',
            opacity: celestialVisible ? 1 : theme === 'numb' ? 0.4 : 0,
            filter: theme === 'numb' ? 'saturate(0.35) brightness(0.9) blur(1px)' : 'none',
            transition: 'opacity 1.6s ease, filter 1.6s ease',
            animation: 'floatY 8s ease-in-out infinite',
          }}
        />
      )}
      {cloudCoverVisible && (
        <div className="absolute z-[1] pointer-events-none" style={{ top: '6%', right: '2%', width: 280, height: 180 }}>
          {[
            { left: 15, top: 55, w: 100, h: 100, delay: '0s' },
            { left: 85, top: 25, w: 120, h: 120, delay: '-3s' },
            { left: 170, top: 60, w: 95, h: 95, delay: '-6s' },
            { left: 55, top: 90, w: 130, h: 60, delay: '-9s' },
          ].map((p, i) => (
            <div key={i} className="absolute rounded-full" style={{
              left: p.left, top: p.top, width: p.w, height: p.h,
              background: 'rgba(255,255,255,0.8)', filter: 'blur(4px)',
            }} />
          ))}
        </div>
      )}
      {theme === 'sad' && (
        <div
          className="absolute inset-0 z-[6] pointer-events-none"
          style={{
            background: 'rgba(220,228,255,0.85)',
            animation: flash ? 'lightningStrike 0.55s ease-out' : 'none',
            opacity: 0,
          }}
        />
      )}
      <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
        {particles.map((p) =>
          p.isEmoji ? (
            <div key={p.key} style={p.style}>{p.emoji}</div>
          ) : (
            <div key={p.key} style={p.style} />
          )
        )}
      </div>
    </>
  );
}
