// Use any types for Vercel serverless compatibility
import type { Request, Response } from "express";

// Public dev endpoint to send a WhatsApp test message via Twilio.
// Accepts JSON body or query: to (e.g. whatsapp:+123...), message (text)
export async function twilioSendHandler(req: any, res: any) {
  try {
    // Load credentials and support API Key auth
    const envAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const envAccountToken = process.env.TWILIO_AUTH_TOKEN;
    const envApiKey = process.env.TWILIO_API_KEY || undefined;
    const envApiSecret = process.env.TWILIO_API_SECRET || undefined;

    let from = process.env.TWILIO_PHONE_NUMBER || undefined; // prefer WhatsApp formatted number like whatsapp:+1415...
    let messagingService =
      process.env.TWILIO_MESSAGING_SERVICE_SID || undefined;
    // Allow providing messagingService or from in request body/query for dev testing
    if (!messagingService) {
      messagingService =
        (req.body && (req.body.messagingService as string)) ||
        (req.query && (req.query.messagingService as string)) ||
        undefined;
    }
    if (!from) {
      from =
        (req.body && (req.body.from as string)) ||
        (req.query && (req.query.from as string)) ||
        undefined;
    }

    // Allow passing credentials in request body for local/dev testing if env not set
    let useAccountSid =
      (req.body && (req.body.sid as string)) ||
      (req.query && (req.query.sid as string)) ||
      envAccountSid;
    let useAccountAuth =
      (req.body && (req.body.token as string)) ||
      (req.query && (req.query.token as string)) ||
      envAccountToken;

    // Determine auth credentials. Use API Key auth only when BOTH envApiKey and envApiSecret are present
    let authUser: string | undefined;
    let authPass: string | undefined;

    if (
      req.body &&
      (req.body.sid as string) &&
      req.body &&
      (req.body.token as string)
    ) {
      authUser = req.body.sid as string;
      authPass = req.body.token as string;
    } else if (envApiKey && envApiSecret) {
      authUser = envApiKey;
      authPass = envApiSecret;
    } else {
      authUser = useAccountSid;
      authPass = useAccountAuth;
    }

    if (!useAccountSid) {
      return res
        .status(500)
        .json({ ok: false, error: "TWILIO_ACCOUNT_SID must be configured." });
    }

    if (!authUser || !authPass) {
      return res.status(500).json({
        ok: false,
        error:
          "Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN or TWILIO_API_KEY and TWILIO_API_SECRET.",
      });
    }

    const toRaw =
      (req.query.to as string) || (req.body && (req.body.to as string));
    const msg =
      (req.query.message as string) ||
      (req.body && (req.body.message as string)) ||
      "Test message from app";

    if (!toRaw) {
      return res.status(400).json({
        ok: false,
        error: "Missing 'to' parameter (e.g. whatsapp:+33612345678)",
      });
    }

    const to = toRaw.startsWith("whatsapp:") ? toRaw : `whatsapp:${toRaw}`;

    // Build payload. Prefer messaging service if provided, otherwise use From
    const payload = new URLSearchParams();
    payload.append("To", to);
    if (messagingService) {
      payload.append("MessagingServiceSid", messagingService);
    } else if (from) {
      payload.append(
        "From",
        from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
      );
    }
    payload.append("Body", msg);

    // Support media URLs (media_urls can be an array or comma-separated string)
    const mediaUrlsRaw =
      (req.body && (req.body.media_urls as any)) ||
      (req.query && (req.query.media_urls as any)) ||
      null;
    let mediaUrls: string[] = [];
    if (mediaUrlsRaw) {
      if (Array.isArray(mediaUrlsRaw)) mediaUrls = mediaUrlsRaw;
      else if (typeof mediaUrlsRaw === "string") {
        try {
          // try parse JSON array
          const parsed = JSON.parse(mediaUrlsRaw);
          if (Array.isArray(parsed)) mediaUrls = parsed;
          else
            mediaUrls = mediaUrlsRaw
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
        } catch (e) {
          mediaUrls = mediaUrlsRaw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }
      }
    }

    for (const m of mediaUrls) {
      if (m) payload.append("MediaUrl", m);
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${useAccountSid}/Messages.json`;

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${authUser}:${authPass}`).toString("base64")}`,
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

    return res
      .status(resp.status)
      .json({ ok: resp.ok, status: resp.status, body });
  } catch (err: any) {
    console.error("twilioSendHandler error:", err);
    return res.status(502).json({ ok: false, error: String(err) });
  }
}
