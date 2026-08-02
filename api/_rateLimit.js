// Lightweight in-memory rate limiter.
//
// HONEST LIMITATION: Vercel can run multiple isolated instances of the same
// function concurrently, each with its own memory — so this caps abuse
// per-instance, not with a hard global guarantee across your whole
// deployment. It raises the bar significantly for casual abuse/scripted
// spam, but a determined attacker spread across many requests could still
// land on different instances. For a real distributed guarantee, swap this
// for Upstash Redis (Vercel's recommended KV store, has a free tier) — this
// version exists so you have *something* in front of the Groq calls today
// without adding a new service dependency.
const hits = new Map();

export function isRateLimited(key, { limit = 20, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const record = hits.get(key);
  if (!record || now - record.start > windowMs) {
    hits.set(key, { start: now, count: 1 });
    return false;
  }
  record.count++;
  return record.count > limit;
}

export function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}