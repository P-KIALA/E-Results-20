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

  if (asStr && asStr.startsWith("/api")) {
    // Try relative path first
    try {
      return await fetch(asStr, defaultOpts);
    } catch (e) {
      lastErr = e;
      try {
        console.warn("authFetch: relative fetch failed", {
          url: asStr,
          err: String(e),
          online: typeof navigator !== "undefined" ? navigator.onLine : undefined,
        });
      } catch (_) {}
    }

    // Try absolute using current origin
    try {
      const origin = window.location && window.location.origin ? window.location.origin : "";
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

    // If inside an iframe, try parent/top origin (useful for embedded preview environments)
    try {
      const topOrigin = window.top && window.top.location && window.top.location.origin ? window.top.location.origin : null;
      if (topOrigin && topOrigin !== (window.location && window.location.origin)) {
        try {
          const topAbsolute = `${topOrigin}${asStr}`;
          return await fetch(topAbsolute, defaultOpts);
        } catch (e2) {
          lastErr = e2;
          try {
            console.warn("authFetch: top origin fetch failed", { url: asStr, topOrigin, err: String(e2) });
          } catch (_) {}
        }
      }
    } catch (e) {
      // Accessing window.top may throw in cross-origin iframes - ignore
      try {
        console.warn("authFetch: could not access window.top", { err: String(e) });
      } catch (_) {}
    }

    // Netlify functions fallback
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
  } else {
    try {
      return await fetch(input, defaultOpts);
    } catch (e) {
      lastErr = e;
    }
  }

  console.error("authFetch: all fetch attempts failed", {
    input: asStr,
    opts: defaultOpts,
    lastErr,
  });
  throw lastErr || new Error("Network request failed");
}
