export async function sendViaNotifyer(
  to: string,
  message: string,
  mediaUrls: string[],
): Promise<string> {
  const apiUrl = process.env.NOTIFYER_API_URL;
  const apiKey = process.env.NOTIFYER_API_KEY;

  if (!apiUrl || !apiKey) throw new Error("Notifyer not configured");

  const payload: any = {
    to,
    message,
  };

  if (mediaUrls && mediaUrls.length > 0) {
    payload.media = mediaUrls;
  }

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
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
    throw new Error(
      `Notifyer error: ${res.status} ${res.statusText} - ${JSON.stringify(data)}`,
    );
  }

  // Try common response fields
  return data.messageId || data.id || data.sid || JSON.stringify(data);
}
