import { Request, Response } from "express";

// Public dev endpoint to send a WhatsApp test message via Twilio.
// Accepts JSON body or query: to (e.g. whatsapp:+123...), message (text)
export async function twilioSendHandler(req: Request, res: Response) {
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
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
    let useSid = sid;
    let useToken = token;
    if (!useSid || !useToken) {
      const maybeSid =
        (req.body && (req.body.sid as string)) ||
        (req.query && (req.query.sid as string));
      const maybeToken =
        (req.body && (req.body.token as string)) ||
        (req.query && (req.query.token as string));
      if (maybeSid && maybeToken) {
        useSid = maybeSid;
        useToken = maybeToken;
      }
    }

    if (!useSid || !useToken) {
      return res
        .status(500)
        .json({
          ok: false,
          error:
            "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be configured (or passed in request for dev testing)",
        });
    }

    const toRaw =
      (req.query.to as string) || (req.body && (req.body.to as string));
    const msg =
      (req.query.message as string) ||
      (req.body && (req.body.message as string)) ||
      "Test message from app";

    if (!toRaw) {
      return res
        .status(400)
        .json({
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

    const url = `https://api.twilio.com/2010-04-01/Accounts/${useSid}/Messages.json`;

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${useSid}:${useToken}`).toString("base64")}`,
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
