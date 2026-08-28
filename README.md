# MindBridge+

An AI-powered emotional wellness space built for Indian college students — a companion to talk to, a quiet place to write/draw/vent, and a few structured tools for the days that need more than a chat.

Built by **Team HackHerz** (Krishika Jain, Shreyasi, Sanjana, Pranavi Mendiratta) for the AWS Student Builder program.

**Live:** [mindbridge-gray.vercel.app](https://mindbridge-gray.vercel.app)

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React Router v7 (framework mode), Vite, Tailwind v4, Framer Motion |
| Backend | Vercel Serverless Functions (`/api`) |
| Database / Auth / Storage | Supabase (Postgres, Auth, Storage) |
| AI | Groq — `openai/gpt-oss-120b` (chat/text), `qwen/qwen3.6-27b` (vision) |
| Email | EmailJS (server-side, via REST API) |

---

## Features

### Chat with Wisp
A companion with an actual personality, not a scripted therapy-bot — reacts, disagrees, teases, varies its shape message to message. Language-matches the user (plain English stays English; only switches to Hinglish if the user's own messages do). Supports text, drawings, and voice notes.

### Mood Insights
- Daily mood check-ins, visualized as a weekly spectrum.
- **AI Weekly Report** — auto-generated every Monday via a Vercel Cron job, summarizing the week's chats, mood, and Hope Vault activity into a short, non-clinical report. Cached per week; a manual "Generate now" fallback exists for edge cases (new signup mid-week, missed cron run).
- Past reports stay browsable indefinitely.

### Quiet Mode (Journal)
A calmer, Notes-app-style space — write, draw, or record a voice note. All three merge into **one entry** for as long as it stays open (until "+ New Entry" is tapped), so a single journal entry can hold text, a sketch, and a voice note together. Full History view with delete (partial — removing one attachment doesn't delete the whole entry unless it was the only thing in it).

### Hope Vault
A locked drawer of good moments — voice notes ("yaps"), text scraps, photos, and sealed letters to a future self, filed together as "tapes." Deletable, with real audio playback.

### Safe Circle
A trusted contact who's quietly notified if the AI's crisis-detection layer picks up on real risk during a chat. Runs a silent risk score after every exchange — a failed check is surfaced honestly (never faked as "safe").

### Calm Space — Mind Architect Suite
- **Continuous Flow** — thoughts fade out as you type; backspace is locked, so releasing something is a deliberate act, not an edit.
- **Blank Canvas** — thoughts become floating bubbles; pop to release, with a real particle-splash and sound.
- **50-to-1 Priority Filter** — brain-dump up to 50 things, then eliminate round by round down to the one that actually matters.
- **Manifestation Matrix** — up to 3 present-tense affirmations, placed on a permanent dashboard instead of popped away.
- **Biometric Smile Trigger** — a gentle, fully skippable "pause and smile" moment if typing gets fast or mildly stressed — deliberately tuned to mild language only; genuine crisis language is handled by the real crisis-detection pipeline, not this.

### Guest Mode
Try the app without an account. Nothing persists — by design. Guests still get real AI access via a short-lived, signed anti-abuse token (not an account, not stored anywhere) rather than an open unauthenticated endpoint.

---

## Architecture notes

- **Auth on AI endpoints** — every `/api` route that calls Groq requires either a real Supabase session or a valid guest token (`api/_guestAuth.js`). No endpoint is open to anonymous, unauthenticated traffic.
- **Rate limiting** — per-IP, per-endpoint (`api/_rateLimit.js`). In-memory, per-instance — a first layer, not a distributed guarantee.
- **Failure honesty** — crisis scoring and weekly reports never fabricate a "safe"/default result on failure. A failed check surfaces as failed, with a retry, never silently as "all clear."
- **Secrets** — Groq, EmailJS, and Supabase service-role keys live only in Vercel's server environment. Nothing sensitive ships in the client bundle.

---

## Environment variables

```
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Groq
GROQ_API_KEY=**

# EmailJS (server-side only)
EMAILJS_SERVICE_ID=
EMAILJS_TEMPLATE_ID=
EMAILJS_PUBLIC_KEY=
EMAILJS_PRIVATE_KEY=

# Guest access token signing
GUEST_TOKEN_SECRET=

# Vercel Cron auth (optional but recommended)
CRON_SECRET=
```

---

## Project structure

```
src/
├── pages/          # Landing, MySpace (chat), Profile, MoodInsights, HopeVault, SafeCircle, CalmSpace, AboutUs
├── components/      # Header, MoodBackground, ui/Buttons, ui/Misc
├── context/         # MoodContext — session, mood state, Hope Vault
├── lib/             # supabaseClient
api/
├── _groq.js         # shared Groq client (retry + backoff)
├── _guestAuth.js     # auth gate — real session or guest token
├── _rateLimit.js     # per-IP rate limiting
├── chat.js, chat-vision.js, chat-voice.js   # Wisp's replies
├── score.js          # crisis risk scoring
├── send-alert.js     # Safe Circle email alerts
├── weekly-report.js  # on-demand AI weekly report (fallback)
├── guest-token.js    # issues short-lived guest tokens
└── cron/
    └── weekly-report.js   # auto-generates reports every Monday
```

---

## Running locally

```bash
npm install
npm run dev
```

Requires the environment variables above set in a `.env` file, and the Supabase project's SQL migrations run (`journal_entries`, `weekly_reports`, `hope_vault_tapes` schema additions) before journaling, weekly reports, or Hope Vault voice notes will work.

---

No streaks. No scores. Just a space that's yours.