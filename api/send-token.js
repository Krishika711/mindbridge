import { createClient } from '@supabase/supabase-js';

// Admin client — service role key bypasses RLS entirely. This file is the
// ONLY place that key should ever be read. Never import this pattern elsewhere.
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const VALID_TOKENS = ['hug', 'heart', 'wave'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const { linkToken, tokenType } = req.body || {};
  if (!linkToken || !VALID_TOKENS.includes(tokenType)) {
    res.status(400).json({ error: 'invalid_request' });
    return;
  }

  try {
    // Look up the contact by their unique link — this is the only thing
    // standing in for authentication, since contacts never log in.
    const { data: contact, error: lookupErr } = await supabaseAdmin
      .from('safe_circle_contacts')
      .select('id, user_id, name')
      .eq('link_token', linkToken)
      .maybeSingle();

    if (lookupErr) throw lookupErr;
    if (!contact) {
      res.status(404).json({ error: 'link_not_found' });
      return;
    }

    const { error: insertErr } = await supabaseAdmin.from('support_tokens').insert({
      contact_id: contact.id,
      user_id: contact.user_id,
      token_type: tokenType,
    });
    if (insertErr) throw insertErr;

    res.status(200).json({ success: true, contactName: contact.name });
  } catch (err) {
    console.error('send-token error:', err.message);
    res.status(500).json({ error: 'send_failed' });
  }
}