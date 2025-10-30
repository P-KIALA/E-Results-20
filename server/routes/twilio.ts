import { Request, Response } from "express";

// Server-side Twilio connectivity test
// Calls Twilio's Account API to verify credentials and basic connectivity.
export async function twilioTestHandler(req: Request, res: Response) {
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) {
      return res.status(500).json({ ok: false, error: "TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not configured" });
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}.json`;

    // Log presence of Twilio env vars (do not log values)
    try {
      console.log("twilioTestHandler: env presence", {
        hasSid: !!sid,
        sidLength: sid ? sid.length : 0,
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        hasPhone: !!process.env.TWILIO_PHONE_NUMBER,
      });
    } catch (_) {}

    const resp = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        Accept: "application/json",
      },
    });

    const text = await resp.text();
    try {
      console.log("twilioTestHandler: upstream status", resp.status, "bodyPreview", text && text.toString ? text.toString().slice(0, 500) : text);
    } catch (_) {}
    let body: any = null;
    try {
      body = JSON.parse(text);
    } catch (e) {
      body = { raw: text };
    }

    return res.status(resp.status).json({ ok: resp.ok, status: resp.status, body });
  } catch (err: any) {
    console.error("twilioTestHandler error:", err);
    return res.status(502).json({ ok: false, error: String(err) });
  }
}
