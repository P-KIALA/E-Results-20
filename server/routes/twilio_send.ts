import { Request, Response } from "express";

// Send a simple WhatsApp message via Twilio REST API.
// Expects query param or JSON body: to (E.164 number, e.g. +33612345678)
export async function twilioSendHandler(req: Request, res: Response) {
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER; // should be in E.164 like +14155238886

    if (!sid || !token || !from) {
      return res.status(500).json({ ok: false, error: "TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_PHONE_NUMBER must be configured" });
    }

    // Accept 'to' in query or body. If not provided, default to the testing recipient as requested.
    // The default recipient is written explicitly as whatsapp:+243821338291
    const toRaw = (req.query.to as string) || (req.body && (req.body.to as string)) || "whatsapp:+243821338291";

    // Normalize to Twilio WhatsApp format (ensure we don't double-prefix)
    const to = toRaw.startsWith("whatsapp:") ? toRaw : `whatsapp:${toRaw}`;
    const fromWhats = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;

    const msg = (req.query.message as string) || (req.body && (req.body.message as string)) || "Test message from WhatsDeliver";

    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

    const payload = new URLSearchParams();
    payload.append("To", to);
    payload.append("From", fromWhats);
    payload.append("Body", msg);

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
