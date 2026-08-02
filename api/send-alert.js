// POST /api/send-alert
// body: { contact_name, contact_email, user_name, message, risk_level }
// → { ok: true }
//
// Replaces the old client-side emailjs-com call. EmailJS's public key,
// service ID, and template ID no longer ship in the browser bundle — they
// live only in Vercel's server-side env vars, same as GROQ_API_KEY.
// EmailJS's "API requests" setting must be enabled for non-browser use:
// EmailJS dashboard -> Account -> Security -> "Allow EmailJS API for non-browser applications".
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  try {
    const { contact_name, contact_email, user_name, message, risk_level } = req.body;
    if (!contact_email) {
      res.status(400).json({ error: "missing_contact_email" });
      return;
    }

    const serviceId = process.env.EMAILJS_SERVICE_ID;
    const templateId = process.env.EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.EMAILJS_PUBLIC_KEY;
    const privateKey = process.env.EMAILJS_PRIVATE_KEY;
    if (!serviceId || !templateId || !publicKey || !privateKey) {
      throw new Error("Missing EmailJS environment variables on the server.");
    }

    const emailRes = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        accessToken: privateKey,
        template_params: {
          to_name: contact_name,
          to_email: contact_email,
          user_name: user_name || "Someone you care about",
          message,
          risk_level,
          app_name: "MindBridge+",
        },
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      throw new Error(`EmailJS error ${emailRes.status}: ${errText}`);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("send-alert error:", err.message);
    res.status(500).json({ error: "send_alert_failed" });
  }
}