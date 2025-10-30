export async function authFetch(input: RequestInfo, init: RequestInit = {}) {
  const token = localStorage.getItem("auth_token");
  const baseHeaders: Record<string, string> = {
    ...((init.headers as Record<string, string>) || {}),
  };

  // Only set JSON content-type when body is present and not FormData
  if (init.body && !((init as any).body instanceof FormData) && !baseHeaders["Content-Type"]) {
    baseHeaders["Content-Type"] = "application/json";
  }

  if (token) baseHeaders["Authorization"] = `Bearer ${token}`;

  // Ensure CORS mode is used for cross-origin requests and include same-origin credentials
  const defaultOpts: RequestInit = { mode: "cors", credentials: "same-origin", ...init, headers: baseHeaders };

  // Try relative path first (works with dev proxy and same-origin setups), then absolute, then Netlify fallback
  let lastErr: any = null;
  const asStr = typeof input === "string" ? input : (input as Request).url;

  try {
    if (asStr && asStr.startsWith("/api")) {
      // 1) Try relative fetch (most robust in dev/proxy setups)
      try {
        return await fetch(asStr, defaultOpts);
      } catch (e) {
        lastErr = e;
        console.warn("authFetch: relative fetch failed", { url: asStr, err: e });
      }

      // 2) Try absolute using current origin
      try {
        const origin = window.location.origin;
        const absolute = `${origin}${asStr}`;
        return await fetch(absolute, defaultOpts);
      } catch (e) {
        lastErr = e;
        console.warn("authFetch: absolute fetch failed", { url: asStr, err: e });
      }

      // 3) Netlify functions fallback
      try {
        const fallback = `/.netlify/functions/api${asStr.replace(/^\/api/, "")}`;
        return await fetch(fallback, defaultOpts);
      } catch (e) {
        lastErr = e;
        console.warn("authFetch: netlify fallback failed", { url: asStr, err: e });
      }
    } else {
      return await fetch(input, defaultOpts);
    }
  } catch (err) {
    lastErr = err;
  }

  console.error("authFetch: all fetch attempts failed", { input: asStr, opts: defaultOpts, lastErr });
  throw lastErr || new Error("Network request failed");
}
