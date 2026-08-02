import { issueGuestToken } from "./_guestAuth.js";
import { isRateLimited, getClientIp } from "./_rateLimit.js";

// POST /api/guest-token → { token }
// Issues a short-lived signed token so Guest sessions can reach the AI
// endpoints without an account, while still proving the request came
// through this app rather than a script hitting the API directly.
// Guest data itself is still never persisted — this token proves nothing
// about identity, only that the request passed through this flow.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  // Tighter limit than the AI endpoints — minting tokens is the actual gate,
  // so it's the thing most worth protecting.
  if (isRateLimited(`guest-token:${getClientIp(req)}`, { limit: 5, windowMs: 60_000 })) {
    res.status(429).json({ error: "rate_limited" });
    return;
  }

  try {
    const token = issueGuestToken();
    res.status(200).json({ token });
  } catch (err) {
    console.error("guest-token error:", err.message);
    res.status(500).json({ error: "guest_token_failed" });
  }
}