import { Request, Response } from "express";

// Public dev endpoint to send a WhatsApp test message via Twilio.
// Accepts JSON body or query: to (e.g. whatsapp:+123...), message (text)
export async function twilioSendHandler(req: Request, res: Response) {
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER || undefined; // prefer WhatsApp formatted number like whatsapp:+1415...
    const messagingService = process.env.TWILIO_MESSAGING_SERVICE_SID || undefined;

    if (!sid || !token) {
      return res.status(500).json({ ok: false, error: "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be configured" });
    }

    const toRaw = (req.query.to as string) || (req.body && (req.body.to as string));
    const msg = (req.query.message as string) || (req.body && (req.body.message as string)) || "Test message from app";

    if (!toRaw) {
      return res.status(400).json({ ok: false, error: "Missing 'to' parameter (e.g. whatsapp:+33612345678)" });
    }

    const to = toRaw.startsWith("whatsapp:") ? toRaw : `whatsapp:${toRaw}`;

    // Build payload. Prefer messaging service if provided, otherwise use From
    const payload = new URLSearchParams();
    payload.append("To", to);
    if (messagingService) {
      payload.append("MessagingServiceSid", messagingService);
    } else if (from) {
      payload.append("From", from.startsWith("whatsapp:") ? from : `whatsapp:${from}`);
    } else {
      return res.status(500).json({ ok: false, error: "TWILIO_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID must be configured" });
    }
    payload.append("Body", msg);

    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: payload.toString(),
    });

    const text = await resp.text();
    let body: any = null;
    try {
      body = JSON.parse(text);
    } catch (e) {
      body = { raw: text };
    }

    return res.status(resp.status).json({ ok: resp.ok, status: resp.status, body });
  } catch (err: any) {
    console.error("twilioSendHandler error:", err);
    return res.status(502).json({ ok: false, error: String(err) });
  }
}
