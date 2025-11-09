// Using any types for compatibility with Vercel serverless runtime
// import { Request, Response } from "express";

// Simple server-side proxy to forward requests to the application base URL.
// This helps clients embedded in restrictive iframes avoid CORS/network limitations by
// having the server perform the actual request.

export async function proxyHandler(req: any, res: any) {
  try {
    const base = process.env.APP_BASE_URL;
    if (!base) {
      return res
        .status(500)
        .json({ error: "APP_BASE_URL not configured on server" });
    }

    // Build target URL by removing the /api/proxy prefix and joining with APP_BASE_URL
    const proxyPrefix = "/api/proxy";
    const incomingPath = req.path || "";
    const forwardPath = incomingPath.startsWith(proxyPrefix)
      ? incomingPath.slice(proxyPrefix.length)
      : incomingPath;

    // Preserve query
    const query =
      req.url && req.url.includes("?")
        ? req.url.slice(req.url.indexOf("?"))
        : "";
    const targetUrl = `${base.replace(/\/$/, "")}${forwardPath}${query}`;

    // Prepare headers - clone and remove host to avoid conflicts
    const forwardHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (!v) continue;
      // Skip host header
      if (k.toLowerCase() === "host") continue;
      // Express header values can be string|string[]; normalize to string
      forwardHeaders[k] = Array.isArray(v) ? v.join(",") : String(v);
    }

    // Force JSON content handling if body is an object and Content-Type missing
    if (
      (req as any).body &&
      typeof (req as any).body === "object" &&
      !forwardHeaders["content-type"]
    ) {
      forwardHeaders["content-type"] = "application/json";
    }

    const method = req.method || "GET";

    const fetchOptions: any = {
      method,
      headers: forwardHeaders,
    };

    // Attach body for non-GET/HEAD
    if (method !== "GET" && method !== "HEAD") {
      // If body was parsed by express.json, send JSON string
      if (
        (req as any).is &&
        (req as any).is("application/json") &&
        (req as any).body
      ) {
        fetchOptions.body = JSON.stringify((req as any).body);
      } else if ((req as any).body && typeof (req as any).body === "string") {
        fetchOptions.body = (req as any).body;
      } else if ((req as any).rawBody) {
        // Some middlewares attach rawBody
        fetchOptions.body = (req as any).rawBody;
      } else {
        // Unable to read raw stream in this environment — skip body and let client call upstream directly for complex payloads
      }
    }

    // Use global fetch (Node 18+) - should be available in runtime
    const upstreamRes = await fetch(targetUrl, fetchOptions);

    // Forward status
    res.status(upstreamRes.status);

    // Forward key headers (content-type and any other safe headers)
    upstreamRes.headers.forEach((value, key) => {
      // Avoid setting hop-by-hop headers
      const forbidden = [
        "transfer-encoding",
        "connection",
        "keep-alive",
        "proxy-authenticate",
        "proxy-authorization",
        "te",
        "trailer",
        "upgrade",
      ];
      if (forbidden.includes(key.toLowerCase())) return;
      res.setHeader(key, value);
    });

    // Stream response body
    const buffer = await upstreamRes.arrayBuffer();
    return res.send(Buffer.from(buffer));
  } catch (err: any) {
    console.error("Proxy error:", err);
    try {
      return res.status(502).json({ error: String(err) });
    } catch (e) {
      return res.status(502).end("Proxy error");
    }
  }
}
