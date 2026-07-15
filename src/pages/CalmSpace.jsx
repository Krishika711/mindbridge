import { useState, useRef, useEffect, useCallback } from "react";

/* ================= Data ================= */
const MODES = [
  { id: "blank-canvas", icon: "◻", name: "Blank Canvas", desc: "An open page with no prompts or structure — just space to put down whatever is there." },
  { id: "priority-filter", icon: "☰", name: "50-to-1 Priority Filter", desc: "Narrow a long list of competing priorities down to the one worth acting on first." },
  { id: "manifestation-matrix", icon: "✦", name: "Manifestation Matrix", desc: "Map intentions against the small, concrete steps that actually move them forward." },
  { id: "smile-trigger", icon: "◔", name: "Biometric Smile Trigger", desc: "A gentle, dismissible check-in if your typing suddenly speeds up." },
  { id: "calm-space", icon: "🌙", name: "Calm Space", desc: "Continuous Flow journaling for overthinking and writer's block, saved for later." },
];

const PF_STAGES = ["collect", "liveWithout", "energy", "essential"];
const PF_PROMPTS = {
  liveWithout: "Pop anything you can honestly live without right now.",
  energy: "Pop what's left that just doesn't match your energy today.",
  essential: "What's left is essential. Keep it in view.",
};

const ST_CONFIG = {
  charsPerSecondThreshold: 9,
  sampleWindowMs: 1500,
  cooldownMs: 45000,
};

/* ================= Root component ================= */
export default function CalmSpace() {
  const [view, setView] = useState("home");

  const openMode = (modeId) => {
    if (modeId === "blank-canvas" || modeId === "priority-filter" || modeId === "smile-trigger") {
      setView(modeId);
    } else {
      // manifestation-matrix / calm-space aren't wired up yet, matching the original build
      console.log("No module wired up yet for:", modeId);
    }
  };

  const goHome = () => setView("home");

  return (
    <div className="mas-app">
      <div className="ambient" />
      {view === "home" && <HomeView onOpen={openMode} />}
      {view === "blank-canvas" && <BlankCanvasView onBack={goHome} />}
      {view === "priority-filter" && <PriorityFilterView onBack={goHome} />}
      {view === "smile-trigger" && <SmileTriggerView onBack={goHome} />}
      <style>{CSS}</style>
    </div>
  );
}

/* ================= Home / mode menu ================= */
function HomeView({ onOpen }) {
  return (
    <main className="app-root">
      <header className="page-head">
        <div className="eyebrow">Mind Architect Suite</div>
        <h1>Choose a space to think in</h1>
        <p className="tagline">
          Each mode is its own quiet room. Pick the one that fits how your mind wants to move today.
        </p>
      </header>

      <section className="menu-grid" aria-label="Available modes">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className="mode-card"
            aria-label={`Open ${mode.name}`}
            onClick={() => onOpen(mode.id)}
          >
            <div className="mode-icon" aria-hidden="true">{mode.icon}</div>
            <div className="mode-name">{mode.name}</div>
            <div className="mode-desc">{mode.desc}</div>
            <div className="mode-arrow">
              Open <span aria-hidden="true">→</span>
            </div>
          </button>
        ))}
      </section>

      <footer className="hint">Select a card to open that mode.</footer>
    </main>
  );
}

/* ================= Blank Canvas ================= */
function BlankCanvasView({ onBack }) {
  const [bubbles, setBubbles] = useState([]);
  const [inputVal, setInputVal] = useState("");
  const fieldRef = useRef(null);
  const idRef = useRef(0);

  const spawnBubble = (text) => {
    const field = fieldRef.current;
    if (!field) return;
    const leftPct = 8 + Math.random() * 60; // keep away from edges
    const rise = 200 + Math.random() * (field.clientHeight - 120);
    const duration = 9 + Math.random() * 5;
    const id = idRef.current++;
    setBubbles((prev) => [...prev, { id, text, leftPct, rise, duration, popping: false }]);
  };

  const handleKeyDown = (e) => {
    if (e.key !== "Enter") return;
    const val = inputVal.trim();
    if (!val) return;
    spawnBubble(val);
    setInputVal("");
  };

  const popBubble = (id) => {
    setBubbles((prev) => prev.map((b) => (b.id === id ? { ...b, popping: true } : b)));
  };

  const removeBubble = (id) => {
    setBubbles((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="view">
      <button className="view-back" onClick={onBack}>← Back to modes</button>
      <h2 className="view-title">Blank Canvas</h2>
      <p className="view-sub">
        Type a thought and press Enter. It'll drift up and away — click any bubble to let it go sooner.
      </p>

      <div className="canvas-stage">
        <div className="bubble-field" ref={fieldRef}>
          {bubbles.map((b) => (
            <div
              key={b.id}
              className={`bubble${b.popping ? " popping" : ""}`}
              style={{
                left: `${b.leftPct}%`,
                "--rise": `${-b.rise}px`,
                animationDuration: b.popping ? undefined : `${b.duration}s`,
              }}
              onClick={() => popBubble(b.id)}
              onAnimationEnd={(e) => {
                if (e.animationName === "float-up" || e.animationName === "pop") removeBubble(b.id);
              }}
            >
              {b.text}
            </div>
          ))}
        </div>
        <div className="canvas-hint">Enter releases a thought. Click a bubble to pop it.</div>
        <div className="canvas-input-row">
          <input
            type="text"
            placeholder="What's on your mind…"
            autoComplete="off"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}

/* ================= 50-to-1 Priority Filter ================= */
function PriorityFilterView({ onBack }) {
  const [stage, setStage] = useState("collect");
  const [items, setItems] = useState([]); // { id, text }
  const [poppingIds, setPoppingIds] = useState(new Set());
  const [inputVal, setInputVal] = useState("");
  const idRef = useRef(0);

  const stepIndex = PF_STAGES.indexOf(stage);

  const addItem = () => {
    const val = inputVal.trim();
    if (!val || items.length >= 50) return;
    setItems((prev) => [...prev, { id: idRef.current++, text: val }]);
    setInputVal("");
  };

  const popItem = (id) => {
    if (poppingIds.has(id)) return;
    setPoppingIds((prev) => new Set(prev).add(id));
  };

  const finishPop = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setPoppingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const restart = () => {
    setStage("collect");
    setItems([]);
    setPoppingIds(new Set());
    setInputVal("");
  };

  return (
    <div className="view">
      <button className="view-back" onClick={onBack}>← Back to modes</button>
      <h2 className="view-title">50-to-1 Priority Filter</h2>
      <p className="view-sub">Get everything out first — you'll narrow it down in three quick passes.</p>

      <div className="pf-progress">
        {PF_STAGES.map((s, i) => (
          <div key={s} className={`pf-step ${i < stepIndex ? "done" : i === stepIndex ? "active" : ""}`} />
        ))}
      </div>

      <div className="pf-panel">
        {stage === "collect" && (
          <>
            <div className="pf-prompt">List what's competing for your attention (up to 50).</div>
            <div className="pf-count">{items.length} / 50 added</div>
            <div className="pf-input-row">
              <input
                type="text"
                placeholder="Type one item and press Enter…"
                autoComplete="off"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
                autoFocus
              />
            </div>
            <div className="pf-chips">
              {items.map((item) => (
                <div key={item.id} className="pf-chip">{item.text}</div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="pf-btn" disabled={items.length === 0} onClick={() => setStage("liveWithout")}>
                Start filtering →
              </button>
            </div>
          </>
        )}

        {(stage === "liveWithout" || stage === "energy") && (
          <>
            <div className="pf-prompt">{PF_PROMPTS[stage]}</div>
            <div className="pf-count">{items.length} remaining</div>
            <div className="pf-chips">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`pf-chip${poppingIds.has(item.id) ? " popping" : ""}`}
                  onClick={() => popItem(item.id)}
                  onAnimationEnd={() => poppingIds.has(item.id) && finishPop(item.id)}
                >
                  {item.text}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="pf-btn" onClick={() => setStage(stage === "liveWithout" ? "energy" : "essential")}>
                Next step →
              </button>
              <button
                className="pf-btn ghost"
                onClick={() => setStage(stage === "liveWithout" ? "collect" : "liveWithout")}
              >
                ← Back
              </button>
            </div>
          </>
        )}

        {stage === "essential" && (
          <>
            <div className="pf-prompt">{PF_PROMPTS.essential}</div>
            <div className="pf-essential-list">
              {items.length === 0 ? (
                <div className="pf-count">Nothing left — that's fine too. You can always add more next time.</div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="pf-essential-item">{item.text}</div>
                ))
              )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="pf-btn ghost" onClick={restart}>Start over</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ================= Biometric Smile Trigger =================
   Design note (kept from the original build): the spec called for
   *forcing* a locked 10s "forced smile" overlay whenever typing sped
   up. Blocking input and demanding a smile during a moment that might
   be stress or urgency isn't a supportive pattern, so this instead
   shows a short, fully dismissible invitation to pause — never blocks
   typing, and "Skip" always closes it immediately. The countdown
   auto-closes itself if left alone, but never stops the user from
   typing underneath it. */
function SmileTriggerView({ onBack }) {
  const [statusText, setStatusText] = useState("Typing speed: —");
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const keyTimestampsRef = useRef([]);
  const lastTriggeredRef = useRef(0);
  const countdownIntervalRef = useRef(null);

  const hideOverlay = useCallback(() => {
    setOverlayVisible(false);
    clearInterval(countdownIntervalRef.current);
  }, []);

  const showOverlay = useCallback(() => {
    setOverlayVisible(true);
    setCountdown(10);
    clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(countdownIntervalRef.current);
          setOverlayVisible(false);
          return 0;
        }
        return next;
      });
    }, 1000);
  }, []);

  useEffect(() => () => clearInterval(countdownIntervalRef.current), []);

  const handleTyping = () => {
    const now = Date.now();
    keyTimestampsRef.current.push(now);
    keyTimestampsRef.current = keyTimestampsRef.current.filter((t) => now - t <= ST_CONFIG.sampleWindowMs);

    const rate = keyTimestampsRef.current.length / (ST_CONFIG.sampleWindowMs / 1000);
    setStatusText(`Typing speed: ${rate.toFixed(1)} chars/sec`);

    if (rate >= ST_CONFIG.charsPerSecondThreshold && now - lastTriggeredRef.current > ST_CONFIG.cooldownMs) {
      lastTriggeredRef.current = now;
      showOverlay();
    }
  };

  return (
    <div className="view">
      <button
        className="view-back"
        onClick={() => {
          hideOverlay();
          onBack();
        }}
      >
        ← Back to modes
      </button>
      <h2 className="view-title">Biometric Smile Trigger</h2>
      <p className="view-sub">
        Write normally. If your typing speed suddenly spikes, a small optional pause will offer itself — you can
        always ignore it.
      </p>

      <div className="st-editor">
        <textarea placeholder="Start typing…" onInput={handleTyping} autoFocus />
        <div className="st-status">{statusText}</div>
      </div>

      <div className={`st-overlay${overlayVisible ? " show" : ""}`}>
        <div className="st-card">
          <div className="st-dot" />
          <h3>Want a short pause?</h3>
          <p>Typing picked up pace — sometimes a few slow breaths helps before continuing. Totally optional.</p>
          <div className="st-count">{countdown}</div>
          <button className="st-skip" onClick={hideOverlay}>Skip, keep writing</button>
        </div>
      </div>
    </div>
  );
}

/* ================= Styles =================
   Same look as the original file, just scoped under .mas-app so it
   can't leak onto the rest of the MindBridge app. For the fonts to
   render correctly, add these two lines to public/index.html <head>:
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
*/
const CSS = `
  .mas-app {
    --bg: #12141a;
    --bg-deep: #0b0d11;
    --surface: #1b1e26;
    --surface-hover: #232733;
    --card-border: rgba(255, 255, 255, 0.07);
    --card-border-hover: rgba(168, 173, 255, 0.28);
    --text: #eae8e3;
    --text-soft: #a3a6b8;
    --text-faint: #6b6e7f;
    --accent: #a9adf7;
    --accent-deep: #7a7fd9;
    --warm: #f2b880;
    --font-display: 'Fraunces', serif;
    --font-body: 'Inter', sans-serif;

    position: relative;
    overflow-x: hidden;
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-body);
  }

  .mas-app * { box-sizing: border-box; }

  .mas-app .ambient {
    position: fixed;
    inset: 0;
    z-index: 0;
    background:
      radial-gradient(ellipse 60% 40% at 20% 15%, rgba(122, 127, 217, 0.10), transparent 60%),
      radial-gradient(ellipse 50% 35% at 85% 75%, rgba(122, 127, 217, 0.07), transparent 60%),
      var(--bg-deep);
    animation: mas-breathe 14s ease-in-out infinite;
  }

  @keyframes mas-breathe { 0%, 100% { opacity: 0.85; } 50% { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .mas-app .ambient, .mas-app * { animation-duration: 0.001ms !important; } }

  .mas-app .app-root {
    position: relative;
    z-index: 1;
    max-width: 1040px;
    margin: 0 auto;
    padding: 72px 24px 96px;
    min-height: 100vh;
  }

  .mas-app header.page-head { margin-bottom: 56px; text-align: center; }

  .mas-app .eyebrow {
    font-size: 11px;
    letter-spacing: 2.2px;
    text-transform: uppercase;
    color: var(--accent);
    font-weight: 500;
    margin-bottom: 14px;
  }

  .mas-app .page-head h1 {
    font-family: var(--font-display);
    font-weight: 500;
    font-size: clamp(2.1rem, 4.2vw, 3.1rem);
    margin: 0 0 14px;
    letter-spacing: -0.01em;
  }

  .mas-app .tagline { color: var(--text-soft); font-size: 15.5px; max-width: 480px; margin: 0 auto; line-height: 1.6; }

  .mas-app .menu-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    gap: 18px;
  }

  .mas-app .mode-card {
    position: relative;
    background: var(--surface);
    border: 1px solid var(--card-border);
    border-radius: 22px;
    padding: 28px 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    color: inherit;
    transition: transform 0.28s ease, background 0.28s ease, border-color 0.28s ease, box-shadow 0.28s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .mas-app .mode-card:hover, .mas-app .mode-card:focus-visible {
    background: var(--surface-hover);
    border-color: var(--card-border-hover);
    transform: translateY(-3px);
    box-shadow: 0 18px 40px -22px rgba(122, 127, 217, 0.35);
  }

  .mas-app .mode-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .mas-app .mode-icon {
    width: 46px; height: 46px; border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px;
    background: rgba(169, 173, 247, 0.10);
    border: 1px solid rgba(169, 173, 247, 0.16);
  }

  .mas-app .mode-name { font-family: var(--font-display); font-size: 19px; font-weight: 500; letter-spacing: -0.01em; }
  .mas-app .mode-desc { font-size: 13px; color: var(--text-soft); line-height: 1.55; }

  .mas-app .mode-arrow {
    margin-top: auto; font-size: 12.5px; color: var(--text-faint);
    display: flex; align-items: center; gap: 6px;
    transition: color 0.28s ease, gap 0.28s ease;
  }
  .mas-app .mode-card:hover .mode-arrow { color: var(--accent); gap: 9px; }

  .mas-app footer.hint { margin-top: 56px; text-align: center; font-size: 12.5px; color: var(--text-faint); }

  /* ---------- Shared view chrome ---------- */
  .mas-app .view {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    max-width: 1040px;
    margin: 0 auto;
    padding: 72px 24px 96px;
    min-height: calc(100vh - 168px);
  }

  .mas-app .view-back {
    align-self: flex-start;
    background: none;
    border: none;
    color: var(--text-soft);
    font-size: 13.5px;
    cursor: pointer;
    margin-bottom: 28px;
    padding: 6px 2px;
  }
  .mas-app .view-back:hover { color: var(--text); }

  .mas-app .view-title {
    font-family: var(--font-display);
    font-size: 26px;
    font-weight: 500;
    margin: 0 0 6px;
  }
  .mas-app .view-sub { color: var(--text-soft); font-size: 14px; margin: 0 0 34px; max-width: 460px; }

  /* ---------- Blank Canvas ---------- */
  .mas-app .canvas-stage {
    flex: 1;
    position: relative;
    border-radius: 24px;
    background: var(--surface);
    border: 1px solid var(--card-border);
    overflow: hidden;
    min-height: 420px;
    display: flex;
    flex-direction: column;
  }

  .mas-app .bubble-field {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  .mas-app .bubble {
    position: absolute;
    bottom: 70px;
    max-width: 78%;
    padding: 12px 18px;
    border-radius: 999px;
    background: rgba(169, 173, 247, 0.14);
    border: 1px solid rgba(169, 173, 247, 0.25);
    color: var(--text);
    font-size: 14px;
    line-height: 1.4;
    cursor: pointer;
    animation-name: mas-float-up;
    animation-timing-function: linear;
    animation-fill-mode: forwards;
    -webkit-tap-highlight-color: transparent;
  }

  .mas-app .bubble:hover { border-color: var(--accent); }

  @keyframes mas-float-up {
    0%   { transform: translateY(0) scale(1); opacity: 0; }
    8%   { opacity: 1; }
    92%  { opacity: 1; }
    100% { transform: translateY(var(--rise, -420px)) scale(1); opacity: 0; }
  }

  .mas-app .bubble.popping {
    animation: mas-pop 0.32s ease forwards !important;
    pointer-events: none;
  }

  @keyframes mas-pop {
    0%   { transform: scale(1); opacity: 1; }
    40%  { transform: scale(1.18); opacity: 1; }
    100% { transform: scale(0); opacity: 0; }
  }

  .mas-app .canvas-input-row {
    display: flex;
    gap: 10px;
    padding: 16px;
    border-top: 1px solid var(--card-border);
  }

  .mas-app .canvas-input-row input {
    flex: 1;
    background: var(--bg);
    border: 1px solid var(--card-border);
    border-radius: 14px;
    padding: 12px 16px;
    color: var(--text);
    font-family: inherit;
    font-size: 14px;
    outline: none;
  }
  .mas-app .canvas-input-row input:focus { border-color: var(--accent); }

  .mas-app .canvas-hint {
    padding: 10px 16px 0;
    font-size: 12px;
    color: var(--text-faint);
  }

  /* ---------- Priority Filter ---------- */
  .mas-app .pf-progress {
    display: flex;
    gap: 8px;
    margin-bottom: 28px;
  }
  .mas-app .pf-step {
    flex: 1;
    height: 4px;
    border-radius: 3px;
    background: var(--card-border);
  }
  .mas-app .pf-step.done { background: var(--accent-deep); }
  .mas-app .pf-step.active { background: var(--accent); }

  .mas-app .pf-panel {
    flex: 1;
    background: var(--surface);
    border: 1px solid var(--card-border);
    border-radius: 24px;
    padding: 32px;
    display: flex;
    flex-direction: column;
    gap: 22px;
  }

  .mas-app .pf-prompt { font-family: var(--font-display); font-size: 20px; font-weight: 500; }
  .mas-app .pf-count { font-size: 12.5px; color: var(--text-faint); }

  .mas-app .pf-input-row { display: flex; gap: 10px; }
  .mas-app .pf-input-row input {
    flex: 1;
    background: var(--bg);
    border: 1px solid var(--card-border);
    border-radius: 14px;
    padding: 12px 16px;
    color: var(--text);
    font-family: inherit;
    font-size: 14px;
    outline: none;
  }
  .mas-app .pf-input-row input:focus { border-color: var(--accent); }

  .mas-app .pf-btn {
    background: var(--accent-deep);
    color: var(--bg-deep);
    border: none;
    border-radius: 14px;
    padding: 12px 20px;
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }
  .mas-app .pf-btn:hover { background: var(--accent); }
  .mas-app .pf-btn.ghost {
    background: transparent;
    color: var(--text-soft);
    border: 1px solid var(--card-border);
  }
  .mas-app .pf-btn.ghost:hover { color: var(--text); border-color: var(--card-border-hover); }
  .mas-app .pf-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .mas-app .pf-chips { display: flex; flex-wrap: wrap; gap: 10px; }
  .mas-app .pf-chip {
    background: rgba(169, 173, 247, 0.10);
    border: 1px solid rgba(169, 173, 247, 0.2);
    border-radius: 999px;
    padding: 9px 16px;
    font-size: 13.5px;
    cursor: pointer;
    transition: transform 0.15s ease, opacity 0.15s ease;
  }
  .mas-app .pf-chip:hover { border-color: var(--accent); }
  .mas-app .pf-chip.popping { animation: mas-pop 0.28s ease forwards; }

  .mas-app .pf-essential-list { display: flex; flex-direction: column; gap: 10px; }
  .mas-app .pf-essential-item {
    background: rgba(242, 184, 128, 0.08);
    border: 1px solid rgba(242, 184, 128, 0.22);
    border-radius: 14px;
    padding: 12px 16px;
    font-size: 14px;
  }

  /* ---------- Smile Trigger (gentle pause) ---------- */
  .mas-app .st-editor {
    flex: 1;
    background: var(--surface);
    border: 1px solid var(--card-border);
    border-radius: 24px;
    padding: 24px;
    display: flex;
    flex-direction: column;
  }
  .mas-app .st-editor textarea {
    flex: 1;
    resize: none;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text);
    font-family: inherit;
    font-size: 15px;
    line-height: 1.7;
    min-height: 320px;
  }
  .mas-app .st-status { font-size: 12px; color: var(--text-faint); margin-top: 10px; }

  .mas-app .st-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    background: rgba(11, 13, 17, 0.86);
    backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.4s ease;
  }
  .mas-app .st-overlay.show { opacity: 1; pointer-events: auto; }

  .mas-app .st-card {
    background: var(--surface);
    border: 1px solid var(--card-border-hover);
    border-radius: 26px;
    padding: 40px 36px;
    max-width: 360px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .mas-app .st-dot {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, rgba(242,184,128,0.55), rgba(169,173,247,0.25));
    animation: mas-st-breathe 4s ease-in-out infinite;
  }
  @keyframes mas-st-breathe {
    0%, 100% { transform: scale(0.85); }
    50% { transform: scale(1.05); }
  }

  .mas-app .st-card h3 { font-family: var(--font-display); font-weight: 500; font-size: 20px; margin: 0; }
  .mas-app .st-card p { font-size: 13.5px; color: var(--text-soft); line-height: 1.6; margin: 0; }
  .mas-app .st-count { font-family: var(--font-display); font-size: 30px; color: var(--accent); }
  .mas-app .st-skip {
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 12.5px;
    cursor: pointer;
    text-decoration: underline;
  }
  .mas-app .st-skip:hover { color: var(--text-soft); }
`;
