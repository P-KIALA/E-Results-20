export async function sendViaInfobip(
  to: string,
  message: string,
  mediaUrls: string[],
): Promise<string> {
  const apiKey = process.env.INFOBIP_API_KEY;
  const baseUrl = process.env.INFOBIP_BASE_URL;
  const sender = process.env.INFOBIP_SENDER;

  if (!apiKey || !baseUrl || !sender) throw new Error("Infobip not configured");

  // Infobip WhatsApp endpoints vary by account; this implementation uses a common pattern.
  // If mediaUrls are provided, append them to the message body as links (simple fallback).
  let body = message;
  if (mediaUrls && mediaUrls.length > 0) {
    body += "\n\n" + mediaUrls.join("\n");
  }

  const url = `https://${baseUrl}/whatsapp/1/message/text`;

  const payload = {
    from: sender,
    to,
    text: body,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `App ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`Infobip error: ${res.status} ${res.statusText} - ${JSON.stringify(data)}`);
  }

  // Try common response fields
  return data.messageId || data.messages?.[0]?.messageId || data.requestId || JSON.stringify(data);
}
