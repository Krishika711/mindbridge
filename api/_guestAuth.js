import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Read-only lookups only (verifying a Supabase access token). Never used to
// bypass RLS for writes — that pattern stays confined to send-token.js.
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GUEST_TOKEN_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export function issueGuestToken() {
  const secret = process.env.GUEST_TOKEN_SECRET;
  if (!secret) throw new Error("Missing GUEST_TOKEN_SECRET environment variable on the server.");
  const payload = { exp: Date.now() + GUEST_TOKEN_TTL_MS };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
  return `${payloadB64}.${sig}`;
}

function verifyGuestToken(token) {
  const secret = process.env.GUEST_TOKEN_SECRET;
  if (!secret || !token) return false;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return false;

  const expectedSig = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

// Gate for the AI endpoints — true if the request carries either a real
// Supabase session OR a valid guest token. Does not identify who the guest
// is (there's nothing to identify — no account, no stored id), it only
// proves the request came through this app's own guest flow rather than a
// script hitting the API directly. Sends the 401 itself on failure so every
// call site can just do: if (!(await requireAppAccess(req, res))) return;
export async function requireAppAccess(req, res) {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && data?.user) return true;
  }

  const guestToken = req.headers["x-guest-token"];
  if (guestToken && verifyGuestToken(guestToken)) return true;

  res.status(401).json({ error: "unauthorized" });
  return false;
}