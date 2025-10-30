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

  // Try absolute origin first for relative API paths, then try relative, then Netlify function fallback.
  let lastErr: any = null;
  const asStr = typeof input === "string" ? input : (input as Request).url;

  try {
    if (asStr && asStr.startsWith("/api")) {
      const origin = window.location.origin;
      const absolute = `${origin}${asStr}`;
      try {
        return await fetch(absolute, opts as RequestInit);
      } catch (e) {
        lastErr = e;
        console.warn("authFetch: absolute fetch failed", { url: absolute, err: e });
      }

      try {
        return await fetch(asStr, opts as RequestInit);
      } catch (e) {
        lastErr = e;
        console.warn("authFetch: relative fetch failed", { url: asStr, err: e });
      }

      const fallback = `/.netlify/functions/api${asStr.replace(/^\/api/, "")}`;
      try {
        return await fetch(fallback, opts as RequestInit);
      } catch (e) {
        lastErr = e;
        console.warn("authFetch: netlify fallback failed", { url: fallback, err: e });
      }
    } else {
      return await fetch(input, opts as RequestInit);
    }
  } catch (err) {
    lastErr = err;
  }

  console.error("authFetch: all fetch attempts failed", { input: asStr, opts, lastErr });
  throw lastErr || new Error("Network request failed");
}
