export async function authFetch(input: RequestInfo, init: RequestInit = {}) {
  const token = localStorage.getItem("auth_token");
  const headers: Record<string, string> = {
    ...((init.headers as Record<string, string>) || {}),
  };
  if (!headers["Content-Type"] && !(init.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const opts = { ...init, headers };

  // Try primary fetch, then fallbacks for Netlify functions or absolute origin
  let lastErr: any = null;
  try {
    return await fetch(input, opts as RequestInit);
  } catch (err) {
    lastErr = err;
  }

  try {
    const asStr = typeof input === "string" ? input : (input as Request).url;
    if (asStr && asStr.startsWith("/api")) {
      const fallback = `/.netlify/functions/api${asStr.replace(/^\/api/, "")}`;
      try {
        return await fetch(fallback, opts as RequestInit);
      } catch (e) {
        lastErr = e;
      }

      try {
        const origin = window.location.origin;
        const absolute = `${origin}${asStr}`;
        return await fetch(absolute, opts as RequestInit);
      } catch (e) {
        lastErr = e;
      }
    }
  } catch (e) {
    lastErr = e;
  }

  throw lastErr || new Error("Network request failed");
}
