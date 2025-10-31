export async function authFetch(input: RequestInfo, init: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  const baseHeaders: Record<string, string> = {
    ...((init.headers as Record<string, string>) || {}),
  };

  // Only set JSON content-type when body is present and not FormData
  if (init.body && !((init as any).body instanceof FormData) && !baseHeaders["Content-Type"]) {
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

  // Build known origins once
  const viteBase = (typeof import.meta !== "undefined" && (import.meta as any).env && (import.meta as any).env.VITE_APP_BASE_URL) || null;
  const runtimeBase = (typeof window !== "undefined" ? (window as any).__APP_BASE_URL__ : null) || null;
  const origin = viteBase || runtimeBase || (typeof window !== "undefined" && window.location && window.location.origin) || "";
  const isEmbedded = typeof window !== "undefined" && window.self !== window.top;

  // If this looks like an internal API path (/api/...), try strategies to reach the backend depending on environment
  if (asStr && asStr.startsWith("/api")) {
    // If embedded (iframe) or origin differs from app base, prefer absolute URL first to avoid iframe-relative resolution issues
    const absolute = `${origin}${asStr}`;

    // helper to run fetch with timeout and optional extra options
    const runFetch = async (url: string, opts: RequestInit, timeout = 10000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        return await fetch(url, { ...opts, signal: controller.signal });
      } finally {
        clearTimeout(id);
      }
    };

    if (isEmbedded) {
      // Try absolute with CORS and include credentials if present
      try {
        return await runFetch(absolute, { ...defaultOpts, mode: "cors", credentials: "include" });
      } catch (e) {
        lastErr = e;
        try {
          console.warn("authFetch: absolute (embedded) attempt failed", { url: absolute, err: String(e), online: typeof navigator !== "undefined" ? navigator.onLine : undefined });
        } catch (_) {}
      }

      // Fallback to relative (same-origin)
      try {
        return await runFetch(asStr, { ...defaultOpts, credentials: "same-origin" });
      } catch (e) {
        lastErr = e;
        try {
          console.warn("authFetch: relative (embedded) attempt failed", { url: asStr, err: String(e), online: typeof navigator !== "undefined" ? navigator.onLine : undefined });
        } catch (_) {}
      }
    } else {
      // Not embedded: try relative first (faster, local dev) then absolute
      try {
        return await runFetch(asStr, { ...defaultOpts, credentials: "same-origin" });
      } catch (e) {
        lastErr = e;
        try {
          console.warn("authFetch: relative fetch failed, trying absolute", { url: asStr, err: String(e), online: typeof navigator !== "undefined" ? navigator.onLine : undefined });
        } catch (_) {}
      }

      try {
        return await runFetch(absolute, { ...defaultOpts, mode: "cors", credentials: "include" });
      } catch (e) {
        lastErr = e;
        try {
          console.warn("authFetch: absolute fetch failed", { url: absolute, err: String(e), online: typeof navigator !== "undefined" ? navigator.onLine : undefined });
        } catch (_) {}
      }
    }

    // Last resort: serverless function proxy (Netlify functions)
    try {
      const fallback = `/.netlify/functions/api${asStr.replace(/^\/api/, "")}`;
      return await runFetch(fallback, { ...defaultOpts, credentials: "same-origin" });
    } catch (e) {
      lastErr = e;
      try {
        console.warn("authFetch: netlify fallback failed", { url: asStr, fallback, err: String(e), online: typeof navigator !== "undefined" ? navigator.onLine : undefined });
      } catch (_) {}
    }
  }

  // Non-/api requests: try as given
  try {
    return await runFetch(typeof input === "string" ? input : (input as Request).url, defaultOpts);
  } catch (e) {
    lastErr = e;
  }

  console.error("authFetch: all fetch attempts failed", { input: asStr, opts: defaultOpts, lastErr });
  throw lastErr || new Error("Network request failed");
}
