import { RequestHandler } from "express";

export const twilioValidate: RequestHandler = async (req, res) => {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const apiKey = process.env.TWILIO_API_KEY;
    const apiSecret = process.env.TWILIO_API_SECRET;

    if (!accountSid) {
      return res.status(400).json({ ok: false, error: "TWILIO_ACCOUNT_SID not set" });
    }

    // Determine auth credentials preference: API Key pair if present, otherwise Account SID + Auth Token
    let authUser = apiKey || accountSid;
    let authPass = apiSecret || authToken;

    if (!authUser || !authPass) {
      return res.status(400).json({ ok: false, error: "Twilio auth credentials not fully configured" });
    }

    const base = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}`;

    // Helper to fetch and parse
    const fetchJson = async (path: string) => {
      const url = `${base}${path}`;
      const resp = await fetch(url, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${authUser}:${authPass}`).toString("base64")}`,
          Accept: "application/json",
        },
      });
      const text = await resp.text();
      try {
        return { status: resp.status, ok: resp.ok, body: JSON.parse(text) };
      } catch (e) {
        return { status: resp.status, ok: resp.ok, body: { raw: text } };
      }
    };

    const accountInfo = await fetchJson(`.json`);
    const incoming = await fetchJson(`/IncomingPhoneNumbers.json`);
    const messagingServices = await fetchJson(`/Messaging/Services.json`);

    return res.json({ ok: true, accountInfo, incoming, messagingServices });
  } catch (err: any) {
    console.error("twilioValidate error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
};
