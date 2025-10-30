export async function authFetch(input: RequestInfo, init: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  const baseHeaders: Record<string, string> = {
    ...((init.headers as Record<string, string>) || {}),
  };

  // Only set JSON content-type when body is present and not FormData
  if (
    init.body &&
    !((init as any).body instanceof FormData) &&
    !baseHeaders["Content-Type"]
  ) {
    baseHeaders["Content-Type"] = "application/json";
  }

  if (token) {
    baseHeaders["Authorization"] = `Bearer ${token}`;
  }

  // Use default fetch options but avoid forcing mode/credentials which can cause preflight or mixed-content issues
  const defaultOpts: RequestInit = {
    ...init,
    headers: baseHeaders,
  };

  let lastErr: any = null;
  const asStr = typeof input === "string" ? input : (input as Request).url;

  // If this looks like an internal API path (/api/...), prefer relative fetch first which works in most embedding contexts
  if (asStr && asStr.startsWith("/api")) {
    // 1) Try relative path (fastest, usually correct for deployed apps)
    try {
      return await fetch(asStr, defaultOpts);
    } catch (e) {
      lastErr = e;
    }

    // 2) Try explicit base URL provided at build-time (Vite) or runtime via window.__APP_BASE_URL__
    try {
      // Prefer Vite injected env var VITE_APP_BASE_URL, then runtime global, then window.location.origin
      const viteBase = (typeof import.meta !== "undefined" && (import.meta as any).env && (import.meta as any).env.VITE_APP_BASE_URL) || null;
      const runtimeBase = (typeof window !== "undefined" ? (window as any).__APP_BASE_URL__ : null) || null;
      const origin = viteBase || runtimeBase || (typeof window !== "undefined" && window.location && window.location.origin) || "";
      const absolute = `${origin}${asStr}`;
      return await fetch(absolute, defaultOpts);
    } catch (e) {
      lastErr = e;
      try {
        console.warn("authFetch: absolute fetch failed", {
          url: asStr,
          err: String(e),
          online: typeof navigator !== "undefined" ? navigator.onLine : undefined,
        });
      } catch (_) {}
    }

    // 3) As a last resort, try serverless function proxy (Netlify /functions) if present
    try {
      const fallback = `/.netlify/functions/api${asStr.replace(/^\/api/, "")}`;
      return await fetch(fallback, defaultOpts);
    } catch (e) {
      lastErr = e;
      try {
        console.warn("authFetch: netlify fallback failed", {
          url: asStr,
          fallback,
          err: String(e),
          online: typeof navigator !== "undefined" ? navigator.onLine : undefined,
        });
      } catch (_) {}
    }
  }

  // Non-/api requests: try as given
  try {
    return await fetch(input, defaultOpts);
  } catch (e) {
    lastErr = e;
  }

  console.error("authFetch: all fetch attempts failed", {
    input: asStr,
    opts: defaultOpts,
    lastErr,
  });
  throw lastErr || new Error("Network request failed");
}
